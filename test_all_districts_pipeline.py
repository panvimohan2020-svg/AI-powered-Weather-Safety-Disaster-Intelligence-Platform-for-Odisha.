import unittest
from districts import ODISHA_30_DISTRICTS, get_district_by_name, find_nearest_district, resolve_district_details
from wri_engine import calculate_wri, calculate_heat_index_celsius, calculate_wbgt_approx, calculate_distance_to_coast

class TestDistrictsAndWriPipeline(unittest.TestCase):
    def test_all_30_districts_registry(self):
        """Verify all 30 districts are present with valid coordinates and elevations."""
        self.assertEqual(len(ODISHA_30_DISTRICTS), 30)
        for name, data in ODISHA_30_DISTRICTS.items():
            self.assertIn("lat", data)
            self.assertIn("lon", data)
            self.assertIn("elevation", data)
            self.assertIn("coast_km", data)
            # Odisha bounding box roughly 17.5°N - 23.0°N, 81.0°E - 88.0°E
            self.assertTrue(17.5 <= data["lat"] <= 23.0, f"Latitude out of bounds for {name}: {data['lat']}")
            self.assertTrue(81.0 <= data["lon"] <= 88.0, f"Longitude out of bounds for {name}: {data['lon']}")
            self.assertTrue(data["elevation"] >= 0, f"Elevation invalid for {name}: {data['elevation']}")
            self.assertTrue(data["coast_km"] >= 0, f"Coast distance invalid for {name}: {data['coast_km']}")

    def test_wri_score_bounds(self):
        """WRI score must strictly stay between 0.5 and 10.0 across all inputs."""
        test_cases = [
            # rain_prob, temp_c, temp_max, wind_speed, humidity_rh, precip_today_mm, wind_gusts, uv_index
            (5.0, 25.0, 28.0, 10.0, 50.0, 0.0, 12.0, 4.0),    # Optimal
            (95.0, 48.0, 49.0, 40.0, 85.0, 120.0, 55.0, 12.0), # Catastrophic
            (35.0, 35.0, 37.0, 20.0, 75.0, 15.0, 28.0, 7.0),   # Moderate
            (0.0, 12.0, 22.0, 5.0, 90.0, 0.0, 8.0, 1.0),      # Mild
        ]
        for pop, t, tm, ws, rh, pr, wg, uv in test_cases:
            res = calculate_wri(
                rain_prob=pop,
                temp_c=t,
                temp_max=tm,
                wind_speed=ws,
                humidity_rh=rh,
                precip_today_mm=pr,
                wind_gusts=wg,
                uv_index=uv,
                is_daytime=True
            )
            score = res["safety_score"]
            self.assertTrue(0.5 <= score <= 10.0, f"Score out of bounds: {score} for inputs: {t}C, {rh}%")

    def test_monotonic_heat_penalty(self):
        """Higher heat and humidity must not improve safety."""
        cool_res = calculate_wri(rain_prob=5.0, temp_c=28.0, temp_max=29.0, wind_speed=10.0, humidity_rh=50.0, precip_today_mm=0.0)
        hot_res = calculate_wri(rain_prob=5.0, temp_c=42.0, temp_max=44.0, wind_speed=10.0, humidity_rh=70.0, precip_today_mm=0.0)
        self.assertGreater(cool_res["safety_score"], hot_res["safety_score"])

    def test_monotonic_wind_penalty(self):
        """Dangerous wind must reduce safety."""
        calm_res = calculate_wri(rain_prob=5.0, temp_c=30.0, temp_max=32.0, wind_speed=10.0, humidity_rh=60.0, wind_gusts=15.0)
        gale_res = calculate_wri(rain_prob=5.0, temp_c=30.0, temp_max=32.0, wind_speed=55.0, humidity_rh=60.0, wind_gusts=75.0)
        self.assertGreater(calm_res["safety_score"], gale_res["safety_score"])

    def test_heavy_rainfall_hazard(self):
        """Extreme rain must push risk into severe category and trigger high rain penalty."""
        dry_res = calculate_wri(rain_prob=5.0, temp_c=30.0, temp_max=32.0, wind_speed=10.0, humidity_rh=60.0, precip_today_mm=0.0)
        deluge_res = calculate_wri(rain_prob=95.0, temp_c=30.0, temp_max=32.0, wind_speed=25.0, humidity_rh=95.0, precip_today_mm=85.0)
        self.assertLess(deluge_res["safety_score"], 4.0)
        self.assertEqual(deluge_res["predicted_risk_level"], "Severe Hazard")
        self.assertGreater(deluge_res["penalties"]["rain"], 3.0)

    def test_gunupur_rayagada_resolution(self):
        """Gunupur coordinates (19.08°N, 83.81°E) must accurately map to Rayagada, not Gajapati."""
        dist_name, dist_km = find_nearest_district(19.08, 83.81)
        self.assertEqual(dist_name, "Rayagada")
        details = resolve_district_details(19.08, 83.81)
        self.assertEqual(details["district"], "Rayagada")
        self.assertEqual(details["locality"], "Gunupur")

if __name__ == "__main__":
    unittest.main()
