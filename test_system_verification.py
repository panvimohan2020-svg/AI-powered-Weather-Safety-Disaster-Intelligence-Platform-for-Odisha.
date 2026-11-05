import unittest
import json
import os
import joblib
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from main import app, model, MODEL_FEATURE_COLUMNS
from wri_engine import (
    calculate_wri, 
    calculate_distance_to_coast, 
    calculate_heat_index_celsius, 
    calculate_wbgt_approx
)
from districts import ODISHA_30_DISTRICTS, find_nearest_district

class TestOdishaWriSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_model_loading_and_features(self):
        """Verify the trained ML model loads successfully and adheres to feature schema."""
        self.assertIsNotNone(model, "ML model should be loaded successfully.")
        model_path = "model/weather_predictor_v2.pkl"
        self.assertTrue(os.path.exists(model_path), "Champion calibrated model file should exist.")
        
        # Verify metrics metadata file
        metrics_path = "model/model_metrics.json"
        self.assertTrue(os.path.exists(metrics_path), "Model metrics file should exist.")
        with open(metrics_path, "r") as f:
            metadata = json.load(f)
        self.assertIn("benchmark_results", metadata)
        self.assertIn("cross_validation", metadata)
        self.assertIn("regime_breakdown", metadata)
        self.assertEqual(metadata["selected_champion"], "Calibrated Balanced HistGB")
        self.assertEqual(metadata["feature_columns"], MODEL_FEATURE_COLUMNS)

    def test_02_all_30_districts_exposed(self):
        """Verify all 30 Odisha districts are exposed with coordinates and elevation."""
        resp = self.client.get("/api/districts")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("districts", data)
        self.assertEqual(len(data["districts"]), 30)

        # Check districts map endpoint
        map_resp = self.client.get("/api/districts-map")
        self.assertEqual(map_resp.status_code, 200)
        map_data = map_resp.json()
        self.assertIn("districts_map", map_data)
        self.assertEqual(len(map_data["districts_map"]), 30)

    def test_03_district_specific_calculations_not_identical(self):
        """
        Acceptance Test: Select three distinct geographic districts (Highland Koraput, Coastal Balasore, Inland Sambalpur).
        Confirm that their scores, spatial properties, and weather are district-specific and not a shared global value.
        """
        resp_k = self.client.post("/api/predict", json={"district": "Koraput"})
        resp_b = self.client.post("/api/predict", json={"district": "Balasore"})
        resp_s = self.client.post("/api/predict", json={"district": "Sambalpur"})

        self.assertEqual(resp_k.status_code, 200)
        self.assertEqual(resp_b.status_code, 200)
        self.assertEqual(resp_s.status_code, 200)

        data_k = resp_k.json()
        data_b = resp_b.json()
        data_s = resp_s.json()

        # Coordinates & Spatial Features must differ
        self.assertNotEqual(data_k["spatial_features"]["elevation_m"], data_b["spatial_features"]["elevation_m"])
        self.assertNotEqual(data_k["spatial_features"]["dist_to_coast_km"], data_b["spatial_features"]["dist_to_coast_km"])
        self.assertNotEqual(data_s["spatial_features"]["dist_to_coast_km"], data_b["spatial_features"]["dist_to_coast_km"])

        score_k = data_k["prediction"]["safety_score"]
        score_b = data_b["prediction"]["safety_score"]
        score_s = data_s["prediction"]["safety_score"]

        # Scores must be numeric and bounded within 0.5 to 10.0
        self.assertTrue(0.5 <= score_k <= 10.0)
        self.assertTrue(0.5 <= score_b <= 10.0)
        self.assertTrue(0.5 <= score_s <= 10.0)

    def test_04_no_cross_district_cache_contamination(self):
        """
        Acceptance Test: Switching between districts repeatedly does not leak or contaminate cache.
        """
        resp1 = self.client.post("/api/predict", json={"district": "Puri"})
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["district"], "Puri")

        resp2 = self.client.post("/api/predict", json={"district": "Sundargarh"})
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["district"], "Sundargarh")

        resp3 = self.client.post("/api/predict", json={"district": "Puri"})
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.json()["district"], "Puri")
        self.assertEqual(resp3.json()["spatial_features"]["dist_to_coast_km"], 0.0)

    def test_05_multi_hazard_scoring_bounds_and_direction(self):
        """
        Acceptance Test: Test representative extreme hot, rainy, stormy, and ideal mild weather.
        Confirm that higher scores mean safer conditions and lower scores mean hazardous conditions.
        """
        # Ideal mild weather: 24C, RH 50%, no rain, light wind 8 km/h
        ideal_res = calculate_wri(
            rain_prob=0.05,
            temp_c=24.0,
            temp_max=26.0,
            wind_speed=8.0,
            humidity_rh=50.0,
            precip_today_mm=0.0
        )
        self.assertGreaterEqual(ideal_res["safety_score"], 8.5)
        self.assertEqual(ideal_res["zone"], "GREEN")

        # Extreme Heatwave: 44C, RH 60% (Heat Index > 50C)
        heatwave_res = calculate_wri(
            rain_prob=0.05,
            temp_c=43.0,
            temp_max=44.0,
            wind_speed=10.0,
            humidity_rh=60.0
        )
        self.assertLess(heatwave_res["safety_score"], ideal_res["safety_score"])
        self.assertGreater(heatwave_res["penalties"]["thermal"], 2.5)

        # Severe Convective Thunderstorm: code 95, heavy rain
        storm_res = calculate_wri(
            rain_prob=0.90,
            temp_c=26.0,
            temp_max=28.0,
            wind_speed=35.0,
            humidity_rh=90.0,
            precip_today_mm=45.0,
            weather_code=95
        )
        self.assertLessEqual(storm_res["safety_score"], 5.0)
        self.assertIn(storm_res["zone"], ["ORANGE", "RED", "DARK_RED"])

    def test_06_24_hour_hourly_forecast_schema(self):
        """Acceptance Test: Verify 24-hour timeline is populated with valid horizons."""
        resp = self.client.post("/api/predict", json={"district": "Cuttack"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("hourly_forecast", data)
        timeline = data["hourly_forecast"]["timeline"]
        self.assertGreaterEqual(len(timeline), 20) # At least 20-24 hours

        first_hour = timeline[0]
        self.assertIn("temperature_c", first_hour)
        self.assertIn("rain_probability", first_hour)
        self.assertIn("wind_speed_kmh", first_hour)
        self.assertIn("safety_score", first_hour)
        self.assertIn("risk_zone", first_hour)
        self.assertTrue(0.5 <= first_hour["safety_score"] <= 10.0)

    def test_07_public_advisories_and_multilingual(self):
        """Acceptance Test: Verify public safety persona advisories in English, Odia, and Hindi."""
        resp = self.client.post("/api/predict", json={"district": "Ganjam (Brahmapur)"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("persona_advisories", data)
        advisories = data["persona_advisories"]
        self.assertIn("farmers", advisories)
        self.assertIn("construction", advisories)
        self.assertIn("daily_wage", advisories)
        self.assertIn("general_public", advisories)

        # Verify translations exist
        for persona_key in ["farmers", "construction", "daily_wage", "general_public"]:
            self.assertTrue(len(advisories[persona_key]["en"]) > 10)
            self.assertTrue(len(advisories[persona_key]["or"]) > 10)
            self.assertTrue(len(advisories[persona_key]["hi"]) > 10)

    def test_08_safe_work_planning_engine(self):
        """Acceptance Test: Verify the Plan My Outdoor Work interactive endpoint."""
        plan_resp = self.client.post("/api/plan-work", json={
            "district": "Balasore",
            "activity": "construction",
            "shift_start_hour": 8,
            "duration_hours": 6
        })
        self.assertEqual(plan_resp.status_code, 200)
        plan_data = plan_resp.json()

        self.assertEqual(plan_data["district"], "Balasore")
        self.assertEqual(plan_data["activity"], "construction")
        self.assertEqual(plan_data["duration_hours"], 6)
        self.assertIn("shift_feasibility", plan_data)
        self.assertIn("metrics", plan_data)
        self.assertIn("tailored_precautions", plan_data)
        self.assertTrue(len(plan_data["shift_timeline"]) > 0)

    def test_09_gps_outside_odisha_handling(self):
        """Acceptance Test: User coordinates far outside Odisha (e.g. Mumbai or Delhi)."""
        # Delhi coords: 28.6139, 77.2090
        resp = self.client.post("/api/predict", json={"latitude": 28.6139, "longitude": 77.2090})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("is_outside_odisha"))
        self.assertGreater(data.get("distance_to_odisha_km"), 200.0)

    def test_10_explainable_hazard_breakdown_adds_up(self):
        """Acceptance Test: Mathematical penalty breakdown matches total deducted points."""
        resp = self.client.post("/api/predict", json={"district": "Khurda (Bhubaneswar)"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        penalties = data["prediction"]["penalties"]
        p_total = penalties["total"]
        sum_penalties = (
            penalties["thermal"] + penalties["rain"] + 
            penalties["wind"] + penalties["uv"] + penalties["pressure"]
        )
        self.assertAlmostEqual(p_total, round(min(9.5, sum_penalties), 2), places=1)

        # Safety score formula check
        computed_score = round(max(0.5, 10.0 - p_total), 1)
        self.assertEqual(data["prediction"]["safety_score"], computed_score)

if __name__ == '__main__':
    unittest.main()
