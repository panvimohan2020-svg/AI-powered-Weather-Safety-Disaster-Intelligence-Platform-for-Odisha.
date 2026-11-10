import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from main import (
    app,
    predict_wri,
    plan_outdoor_work,
    PredictionRequest,
    WorkPlanRequest,
    ODISHA_30_DISTRICTS,
    WEATHER_CACHE
)

class TestHourlyForecastPipeline(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        WEATHER_CACHE.clear()

    def tearDown(self):
        self.loop.close()

    def test_01_predict_with_gunupur_gps(self):
        """Verify district and GPS locality Gunupur coordinate resolution."""
        req = PredictionRequest(
            district="Rayagada",
            latitude=19.08,
            longitude=83.81,
            locality="Gunupur"
        )
        res = self.loop.run_until_complete(predict_wri(req))
        
        self.assertEqual(res["district"], "Rayagada")
        self.assertEqual(res["locality"], "Gunupur")
        self.assertAlmostEqual(res["coordinates"]["latitude"], 19.08, places=2)
        self.assertAlmostEqual(res["coordinates"]["longitude"], 83.81, places=2)
        
        # Verify 24h timeline
        hourly = res.get("hourly_forecast", {})
        timeline = hourly.get("timeline", [])
        self.assertGreaterEqual(len(timeline), 24, "Timeline must contain at least 24 hours")
        self.assertIn("forecast_insight", hourly)
        
        # Verify hourly fields
        first_hour = timeline[0]
        self.assertIn("temperature_c", first_hour)
        self.assertIn("humidity_percent", first_hour)
        self.assertIn("wind_speed_kmh", first_hour)
        self.assertIn("safety_score", first_hour)
        self.assertIn("risk_zone", first_hour)

    def test_02_plan_work_today_shift(self):
        """Verify Work Safety Planner handles today's shift (7 AM, 4h)."""
        req = WorkPlanRequest(
            district="Rayagada",
            latitude=19.08,
            longitude=83.81,
            locality="Gunupur",
            activity="general",
            shift_start_hour=7,
            duration_hours=4,
            shift_date="today"
        )
        plan = self.loop.run_until_complete(plan_outdoor_work(req))
        
        self.assertEqual(plan["district"], "Rayagada")
        self.assertEqual(plan["locality"], "Gunupur")
        self.assertEqual(plan["duration_hours"], 4)
        self.assertEqual(plan["shift_start"], "07:00")
        self.assertIn(plan["shift_feasibility"], [
            "Highly Favorable", 
            "Moderate with Standard Precautions", 
            "Elevated Risk - Shift Modification Advised", 
            "Severe Weather Hazard - Work Suspension Recommended"
        ])
        
        # Verify itemized timeline
        timeline = plan["shift_timeline"]
        self.assertEqual(len(timeline), 4, "Must return exactly 4 hours of shift timeline")
        for h in timeline:
            self.assertIn("hour_label", h)
            self.assertIn("temperature_c", h)
            self.assertIn("humidity_percent", h)
            self.assertIn("wind_speed_kmh", h)
            self.assertIn("safety_score", h)
            self.assertIn("risk_zone", h)

    def test_03_plan_work_tomorrow_shift(self):
        """Verify Work Safety Planner handles tomorrow's shift (7 AM, 4h)."""
        req = WorkPlanRequest(
            district="Rayagada",
            latitude=19.08,
            longitude=83.81,
            locality="Gunupur",
            activity="farming",
            shift_start_hour=7,
            duration_hours=4,
            shift_date="tomorrow"
        )
        plan = self.loop.run_until_complete(plan_outdoor_work(req))
        
        self.assertEqual(plan["shift_date_label"], "Tomorrow")
        self.assertEqual(plan["shift_status"], "UPCOMING")
        self.assertFalse(plan["is_past_shift"])
        self.assertEqual(len(plan["shift_timeline"]), 4)

    def test_04_fallback_pipeline_when_api_throttles(self):
        """Verify fallback climatological timeline generator when external API fails."""
        import main
        orig_client_get = main.httpx.AsyncClient.get

        # Simulate 429 throttle or connection error
        async def mock_throttle(*args, **kwargs):
            class MockResp:
                status_code = 429
                def json(self): return {}
            return MockResp()

        main.httpx.AsyncClient.get = mock_throttle
        WEATHER_CACHE.clear()

        try:
            req = WorkPlanRequest(
                district="Rayagada",
                latitude=19.08,
                longitude=83.81,
                locality="Gunupur",
                activity="construction",
                shift_start_hour=7,
                duration_hours=4,
                shift_date="today"
            )
            plan = self.loop.run_until_complete(plan_outdoor_work(req))
            
            self.assertIsNotNone(plan)
            self.assertEqual(plan["district"], "Rayagada")
            self.assertEqual(len(plan["shift_timeline"]), 4)
            self.assertGreater(plan["metrics"]["average_safety_score"], 0)
        finally:
            main.httpx.AsyncClient.get = orig_client_get

if __name__ == "__main__":
    unittest.main()

