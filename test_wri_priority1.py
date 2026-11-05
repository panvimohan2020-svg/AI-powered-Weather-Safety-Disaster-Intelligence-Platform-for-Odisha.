import unittest
import json
from fastapi.testclient import TestClient

from main import app
from wri_engine import (
    calculate_wri,
    calculate_wbgt_approx,
    calculate_heat_index_celsius,
    calculate_wind_chill_celsius,
    get_iso7243_work_rest_cycle,
    evaluate_sector_permissibility
)

class TestWriPriority1Enhancements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_wbgt_psychrometric_and_solar_radiant_physics(self):
        """Verify WBGT calculates psychrometric baseline and radiant solar elevation with wind damping."""
        # Baseline shade WBGT at 32C and 60% RH (~33.26C)
        shade_wbgt = calculate_wbgt_approx(32.0, 60.0, wind_speed_kmh=10.0, uv_index=0.0, is_daytime=False)
        self.assertAlmostEqual(shade_wbgt, 33.26, delta=0.5)

        # Under midday direct sun (UV 9.5) and calm wind (5 km/h)
        outdoor_sun_wbgt = calculate_wbgt_approx(32.0, 60.0, wind_speed_kmh=5.0, uv_index=9.5, is_daytime=True)
        # Outdoor WBGT must be higher than shade WBGT due to radiant heating
        self.assertGreater(outdoor_sun_wbgt, shade_wbgt)
        self.assertLessEqual(outdoor_sun_wbgt - shade_wbgt, 3.8)

        # Higher wind speed should increase convective cooling, mitigating the solar radiant heating
        outdoor_windy_wbgt = calculate_wbgt_approx(32.0, 60.0, wind_speed_kmh=25.0, uv_index=9.5, is_daytime=True)
        self.assertLess(outdoor_windy_wbgt, outdoor_sun_wbgt)

    def test_02_wbgt_backward_compatibility(self):
        """Ensure calling calculate_wbgt_approx(temp, rh) without new kwargs maintains exact legacy formula."""
        legacy_wbgt = calculate_wbgt_approx(35.0, 70.0)
        # Using formula: es = 6.105 * exp(17.27 * 35 / (237.7 + 35)) ~ 56.24; e = 0.70 * 56.24 = 39.37;
        # wbgt = 0.567 * 35 + 0.393 * 39.37 + 3.94 = 19.845 + 15.472 + 3.94 = 39.26
        self.assertAlmostEqual(legacy_wbgt, 39.26, delta=0.2)

    def test_03_highland_cold_strain_and_wind_chill(self):
        """Verify cold stress calculation for highland Odisha winter mornings."""
        # Mild 22C should produce no wind chill effect
        self.assertEqual(calculate_wind_chill_celsius(22.0, 15.0), 22.0)

        # Winter highland morning (e.g. Daringbadi / Koraput 8°C, 25 km/h wind)
        chill_temp = calculate_wind_chill_celsius(8.0, 25.0)
        self.assertLess(chill_temp, 6.0)

        # WRI under cold highland stress
        cold_wri = calculate_wri(
            rain_prob=0.05,
            temp_c=7.0,
            temp_max=12.0,
            wind_speed=24.0,
            humidity_rh=50.0,
            precip_today_mm=0.0,
            is_daytime=True
        )
        self.assertIn("thermal", cold_wri["penalties"])
        self.assertGreater(cold_wri["penalties"]["thermal"], 0.5)

    def test_04_iso7243_work_rest_cycle_bands(self):
        """Verify ISO 7243 / ACGIH work-rest ratio bands."""
        # Band 1: Continuous work (WBGT < 25C)
        b1 = get_iso7243_work_rest_cycle(23.5)
        self.assertEqual(b1["work_pct"], 100)
        self.assertEqual(b1["rest_minutes_per_hour"], 0)
        self.assertEqual(b1["hydration_target_ml_hr"], 500)

        # Band 2: 75/25 (25 <= WBGT < 28)
        b2 = get_iso7243_work_rest_cycle(26.5)
        self.assertEqual(b2["work_pct"], 75)
        self.assertEqual(b2["rest_minutes_per_hour"], 15)
        self.assertEqual(b2["hydration_target_ml_hr"], 750)

        # Band 3: 50/50 (28 <= WBGT < 30.5)
        b3 = get_iso7243_work_rest_cycle(29.0)
        self.assertEqual(b3["work_pct"], 50)
        self.assertEqual(b3["rest_minutes_per_hour"], 30)
        self.assertEqual(b3["hydration_target_ml_hr"], 1000)

        # Band 4: 25/75 (30.5 <= WBGT < 32.5)
        b4 = get_iso7243_work_rest_cycle(31.5)
        self.assertEqual(b4["work_pct"], 25)
        self.assertEqual(b4["rest_minutes_per_hour"], 45)
        self.assertEqual(b4["hydration_target_ml_hr"], 1250)

        # Band 5: Cease Heavy Labor (WBGT >= 32.5)
        b5 = get_iso7243_work_rest_cycle(34.0)
        self.assertEqual(b5["work_pct"], 0)
        self.assertEqual(b5["rest_minutes_per_hour"], 60)
        self.assertGreaterEqual(b5["hydration_target_ml_hr"], 1500)

    def test_05_sector_permissibility_logic(self):
        """Verify sector operational clearances for farming, construction, and marine."""
        # Calm & dry conditions: all permitted
        p_safe = evaluate_sector_permissibility(
            temp_c=28.0,
            wbgt_c=24.0,
            heat_index_c=29.0,
            wind_speed=8.0,
            wind_gusts=12.0,
            rain_prob=0.10,
            precip_mm=0.0,
            weather_code=0,
            uv_index=4.0
        )
        self.assertTrue(p_safe["agriculture"]["pesticide_spraying_permitted"])
        self.assertTrue(p_safe["construction"]["crane_lifts_permitted"])
        self.assertTrue(p_safe["construction"]["high_scaffolding_permitted"])

        # High winds (> 15 km/h): spray prohibited; scaffolding restricted if gusts > 35 km/h
        p_wind = evaluate_sector_permissibility(
            temp_c=28.0,
            wbgt_c=24.0,
            heat_index_c=29.0,
            wind_speed=20.0,
            wind_gusts=38.0,
            rain_prob=0.10,
            precip_mm=0.0,
            weather_code=1,
            uv_index=4.0
        )
        self.assertFalse(p_wind["agriculture"]["pesticide_spraying_permitted"])
        self.assertFalse(p_wind["construction"]["high_scaffolding_permitted"])

        # Severe thunderstorm (code 95): all operations halted
        p_storm = evaluate_sector_permissibility(
            temp_c=26.0,
            wbgt_c=25.0,
            heat_index_c=27.0,
            wind_speed=35.0,
            wind_gusts=48.0,
            rain_prob=0.90,
            precip_mm=30.0,
            weather_code=95,
            uv_index=1.0,
            is_coastal=True
        )
        self.assertFalse(p_storm["agriculture"]["pesticide_spraying_permitted"])
        self.assertFalse(p_storm["construction"]["crane_lifts_permitted"])
        self.assertFalse(p_storm["construction"]["high_scaffolding_permitted"])
        self.assertTrue(p_storm["marine_coastal"]["small_craft_advisory"])
        self.assertFalse(p_storm["marine_coastal"]["fishermen_sea_venture_permitted"])

    def test_06_transparent_deductions_and_primary_limiting_factor(self):
        """Verify itemized transparent deductions and primary limiting factor identification."""
        res = calculate_wri(
            rain_prob=0.85,
            temp_c=34.0,
            temp_max=36.0,
            wind_speed=22.0,
            humidity_rh=75.0,
            precip_today_mm=18.0,
            uv_index=7.0,
            weather_code=63 # Moderate rain
        )
        self.assertIn("transparent_deductions", res)
        self.assertIn("primary_limiting_factor", res)
        self.assertIn("occupational_guidelines", res)
        self.assertIn("sector_permissibility", res)
        self.assertTrue(len(res["transparent_deductions"]) > 0)
        self.assertTrue(len(res["primary_limiting_factor"]) > 5)

        # Verify deductions sum aligns with total penalty
        deductions_sum = sum(d["deduction_points"] for d in res["transparent_deductions"])
        self.assertAlmostEqual(res["penalties"]["total"], round(min(9.5, deductions_sum), 2), places=1)

    def test_07_api_predict_includes_priority1_intelligence(self):
        """Verify /api/predict payload includes new occupational guidelines, sector permissibility, and transparent deductions."""
        resp = self.client.post("/api/predict", json={"district": "Rayagada"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check prediction object
        pred = data["prediction"]
        self.assertIn("occupational_guidelines", pred)
        self.assertIn("sector_permissibility", pred)
        self.assertIn("transparent_deductions", pred)
        self.assertIn("primary_limiting_factor", pred)

        # Check top-level convenience keys
        self.assertIn("occupational_guidelines", data)
        self.assertIn("sector_permissibility", data)
        self.assertIn("transparent_deductions", data)

        # Check occupational guideline contents
        occ = pred["occupational_guidelines"]
        self.assertIn("work_rest_cycle", occ)
        self.assertIn("hydration_target_ml_hr", occ)
        self.assertIn("rest_minutes_per_hour", occ)
        self.assertGreater(occ["hydration_target_ml_hr"], 0)

    def test_08_api_plan_work_uses_iso_guidelines(self):
        """Verify /api/plan-work incorporates ISO work-rest ratios and hydration targets."""
        resp = self.client.post("/api/plan-work", json={
            "district": "Sundargarh",
            "activity": "construction",
            "shift_start_hour": 9,
            "duration_hours": 6
        })
        self.assertEqual(resp.status_code, 200)
        plan = resp.json()

        self.assertIn("occupational_guidelines", plan)
        self.assertIn("sector_clearance", plan)
        self.assertIn("hydration_guidance", plan)

if __name__ == '__main__':
    unittest.main()
