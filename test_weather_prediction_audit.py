import asyncio
import unittest
from main import app, predict_wri, PredictionRequest
from districts import ODISHA_30_DISTRICTS, get_district_by_name, resolve_district_details

class TestWeatherPredictionAndDistricts(unittest.IsolatedAsyncioTestCase):
    
    async def test_all_30_districts_independent_weather(self):
        """Verify that all 30 districts fetch location-specific weather without identical values."""
        results = []
        temperatures = set()
        wri_scores = set()

        for dist_name, dist_meta in ODISHA_30_DISTRICTS.items():
            req = PredictionRequest(district=dist_name)
            res = await predict_wri(req)
            
            # 1. District and coordinates validation
            self.assertEqual(res["district"], dist_name)
            self.assertAlmostEqual(res["coordinates"]["latitude"], dist_meta["lat"], delta=0.01)
            self.assertAlmostEqual(res["coordinates"]["longitude"], dist_meta["lon"], delta=0.01)
            
            # 2. Weather fields validation
            weather = res["weather"]
            self.assertIn("temperature_c", weather)
            self.assertIn("humidity_percent", weather)
            self.assertIn("wind_speed_kmh", weather)
            self.assertIn("condition", weather)
            self.assertIn("data_status", weather)
            self.assertIn(weather["data_status"], ["LIVE", "ESTIMATED"])
            
            # 3. Prediction fields validation
            prediction = res["prediction"]
            self.assertIn("safety_score", prediction)
            self.assertTrue(0.5 <= prediction["safety_score"] <= 10.0)
            
            temperatures.add(weather["temperature_c"])
            wri_scores.add(prediction["safety_score"])
            results.append((dist_name, weather["temperature_c"], weather["humidity_percent"], weather["condition"], prediction["safety_score"], weather["data_status"]))

        print(f"\n--- AUDIT: 30 DISTRICTS WEATHER DIVERSITY ---")
        print(f"Total districts tested: {len(results)}")
        print(f"Distinct temperature values: {len(temperatures)} (Must be > 5, not identical)")
        print(f"Temperature range: {min(temperatures):.1f}°C to {max(temperatures):.1f}°C")
        print(f"Distinct WRI safety scores: {len(wri_scores)}")
        
        # All 30 districts MUST NOT have identical temperature
        self.assertGreater(len(temperatures), 5, "Districts must not display identical temperatures!")

    async def test_gunupur_locality_and_coordinates(self):
        """Verify that Gunupur uses its own coordinates and preserves sub-division locality."""
        # Gunupur coordinates: (19.080, 83.815), elev 83m
        req = PredictionRequest(latitude=19.080, longitude=83.815)
        res = await predict_wri(req)
        
        self.assertEqual(res["district"], "Rayagada")
        self.assertEqual(res["locality"], "Gunupur")
        self.assertAlmostEqual(res["coordinates"]["latitude"], 19.080, delta=0.001)
        self.assertAlmostEqual(res["coordinates"]["longitude"], 83.815, delta=0.001)
        
        # Rayagada district HQ: (19.167, 83.416), elev 207m
        req_hq = PredictionRequest(district="Rayagada")
        res_hq = await predict_wri(req_hq)
        self.assertEqual(res_hq["district"], "Rayagada")
        self.assertAlmostEqual(res_hq["coordinates"]["latitude"], 19.167, delta=0.001)

    async def test_cache_and_refresh_mechanism(self):
        """Verify that refresh=True bypasses cache and sets cache_hit=False."""
        req1 = PredictionRequest(district="Cuttack", refresh=False)
        res1 = await predict_wri(req1)
        
        # Second call should be a cache hit
        req2 = PredictionRequest(district="Cuttack", refresh=False)
        res2 = await predict_wri(req2)
        self.assertTrue(res2.get("cache_hit", False), "Second unforced call should hit cache")
        
        # Third call with refresh=True must bypass cache
        req3 = PredictionRequest(district="Cuttack", refresh=True)
        res3 = await predict_wri(req3)
        self.assertFalse(res3.get("cache_hit", False), "refresh=True must bypass cache")

    async def test_live_or_fallback_status_honesty(self):
        """Verify that fallback data is never disguised as LIVE."""
        res = await predict_wri(PredictionRequest(district="Puri"))
        weather = res["weather"]
        if weather.get("fallback_used"):
            self.assertEqual(weather["data_status"], "ESTIMATED")
            self.assertFalse(weather["is_live"])
        else:
            self.assertEqual(weather["data_status"], "LIVE")
            self.assertTrue(weather["is_live"])

if __name__ == "__main__":
    unittest.main()
