import unittest
from datetime import datetime, timezone, timedelta
from emergency_engine import (
    evaluate_and_generate_alerts_for_district, 
    GLOBAL_ALERT_STORE, 
    ALERT_LEVELS
)
from districts import ODISHA_30_DISTRICTS, get_district_by_name
from wri_engine import calculate_wri, calculate_heat_index_celsius, calculate_wbgt_approx

class TestAlertAndSirenSystem(unittest.TestCase):
    def setUp(self):
        # Reset alert store for clean testing
        GLOBAL_ALERT_STORE.alerts.clear()
        GLOBAL_ALERT_STORE.seen_hashes.clear()

    def test_coastal_humid_warm_does_not_trigger_level3_heatwave(self):
        """
        Critical Bug Fix Validation:
        Jagatsinghpur: 30.0°C ambient, 78% RH -> Heat Index ~43.7°C.
        Must NOT trigger an official Level 3/4 IMD Heatwave Warning, nor sound sirens!
        Must generate an Advisory (Level 1) attributed to WRI Heat Stress Model.
        """
        alerts = evaluate_and_generate_alerts_for_district(
            district_name="Jagatsinghpur",
            weather_code=1,
            temp_c=30.0,
            temp_max=31.0,
            heat_index=43.7,
            wind_speed=12.0,
            wind_gusts=15.0,
            precip_today_mm=0.0,
            pressure_delta_24h=0.0,
            elevation_m=15.0,
            dist_to_coast_km=35.0
        )

        # Must not produce Level 3 or Level 4 sirens
        critical_alerts = [a for a in alerts if a.get("severity_level", 0) >= 3]
        self.assertEqual(len(critical_alerts), 0, "Coastal 30°C must not trigger Level 3/4 emergency warning")

        # Must have an Advisory
        self.assertEqual(len(alerts), 1)
        alert = alerts[0]
        self.assertEqual(alert["severity_level"], 1)
        self.assertEqual(alert["category"], "THERMAL_DISCOMFORT")
        self.assertEqual(alert["issuing_authority"], "Odisha WRI Meteorological Heat Stress Model")
        self.assertFalse(alert["is_official"])
        self.assertIn("Heat Index: 43.7°C", alert["headline"])
        self.assertIn("Air Temp: 30.0°C", alert["headline"])

    def test_genuine_summer_heatwave_triggers_official_warning(self):
        """
        Balangir in summer: 43.5°C ambient air temperature.
        Exceeds IMD plains threshold (>= 40°C).
        Must trigger Level 3 Official Heatwave Warning attributed to IMD / OSDMA.
        """
        alerts = evaluate_and_generate_alerts_for_district(
            district_name="Balangir",
            weather_code=0,
            temp_c=43.0,
            temp_max=43.5,
            heat_index=46.5,
            wind_speed=8.0,
            wind_gusts=12.0,
            precip_today_mm=0.0,
            pressure_delta_24h=0.0,
            elevation_m=164.0,
            dist_to_coast_km=315.0
        )

        critical_alerts = [a for a in alerts if a.get("severity_level", 0) >= 3]
        self.assertGreaterEqual(len(critical_alerts), 1)
        alert = critical_alerts[0]
        self.assertEqual(alert["category"], "OFFICIAL_HEATWAVE")
        self.assertIn("IMD", alert["issuing_authority"])
        self.assertTrue(alert["is_official"])

    def test_alert_resolution_when_weather_subsides(self):
        """
        When extreme weather subsides, old automatic alerts must be resolved
        and not linger in active store for 12 hours.
        """
        # Step 1: Balangir gets hot
        evaluate_and_generate_alerts_for_district(
            district_name="Balangir",
            weather_code=0,
            temp_c=43.0,
            temp_max=44.0,
            heat_index=46.5,
            wind_speed=8.0,
            wind_gusts=12.0,
            precip_today_mm=0.0,
            pressure_delta_24h=0.0,
            elevation_m=164.0,
            dist_to_coast_km=315.0
        )
        active_before = GLOBAL_ALERT_STORE.get_active_alerts(district="Balangir")
        self.assertEqual(len(active_before), 1)

        # Step 2: Night comes or cool weather arrives (24°C, HI 24°C)
        evaluate_and_generate_alerts_for_district(
            district_name="Balangir",
            weather_code=0,
            temp_c=24.0,
            temp_max=28.0,
            heat_index=24.0,
            wind_speed=6.0,
            wind_gusts=8.0,
            precip_today_mm=0.0,
            pressure_delta_24h=0.0,
            elevation_m=164.0,
            dist_to_coast_km=315.0
        )
        active_after = GLOBAL_ALERT_STORE.get_active_alerts(district="Balangir")
        self.assertEqual(len(active_after), 0, "Subsided weather must automatically resolve prior alerts")

    def test_district_alert_isolation(self):
        """
        An alert in Balangir must NOT automatically show up in Koraput or Puri.
        """
        evaluate_and_generate_alerts_for_district(
            district_name="Balangir",
            weather_code=0,
            temp_c=43.0,
            temp_max=44.0,
            heat_index=46.5,
            wind_speed=8.0,
            wind_gusts=12.0,
            precip_today_mm=0.0,
            pressure_delta_24h=0.0,
            elevation_m=164.0,
            dist_to_coast_km=315.0
        )
        balangir_alerts = GLOBAL_ALERT_STORE.get_active_alerts(district="Balangir")
        puri_alerts = GLOBAL_ALERT_STORE.get_active_alerts(district="Puri")
        koraput_alerts = GLOBAL_ALERT_STORE.get_active_alerts(district="Koraput")

        self.assertEqual(len(balangir_alerts), 1)
        self.assertEqual(len(puri_alerts), 0)
        self.assertEqual(len(koraput_alerts), 0)

    def test_wri_continuous_transparency_deductions(self):
        """
        Verify that calculate_wri generates transparent deductions with correct category, points, and observed values.
        """
        res = calculate_wri(
            rain_prob=45.0,
            temp_c=36.0,
            temp_max=38.0,
            wind_speed=26.0,
            humidity_rh=72.0,
            precip_today_mm=12.0,
            wind_gusts=34.0,
            uv_index=7.0
        )
        self.assertTrue(0.5 <= res["safety_score"] <= 10.0)
        self.assertIn("transparent_deductions", res)
        deductions = res["transparent_deductions"]
        self.assertGreater(len(deductions), 0)
        for d in deductions:
            self.assertIn("category", d)
            self.assertIn("deduction_points", d)
            self.assertIn("observed_value", d)
            self.assertIn("threshold_standard", d)

if __name__ == "__main__":
    unittest.main()

