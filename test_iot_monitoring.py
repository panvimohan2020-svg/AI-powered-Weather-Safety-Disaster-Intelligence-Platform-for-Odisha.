import unittest
from fastapi.testclient import TestClient

from main import app
from iot_engine import GLOBAL_IOT_REGISTRY, IoTTelemetryPayload

class TestIoTWeatherMonitoring(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_list_seed_iot_stations(self):
        """Verify the 5 Odisha seed IoT Automatic Weather Stations are active and exposed."""
        resp = self.client.get("/api/iot/stations")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertGreaterEqual(data["total_stations"], 5)
        self.assertEqual(data["network_status"], "OPERATIONAL")

        station_ids = [s["station_id"] for s in data["stations"]]
        self.assertIn("OD-IOT-RAY-001", station_ids) # Gunupur (Rayagada)
        self.assertIn("OD-IOT-KOR-001", station_ids) # Semiliguda (Koraput)
        self.assertIn("OD-IOT-KHD-001", station_ids) # Bhubaneswar (Khurda)
        self.assertIn("OD-IOT-JAG-001", station_ids) # Paradip (Jagatsinghpur)
        self.assertIn("OD-IOT-MAY-001", station_ids) # Baripada (Mayurbhanj)

    def test_02_station_hardware_specifications(self):
        """Verify station hardware details (MCU, sensors, power source)."""
        resp = self.client.get("/api/iot/stations/OD-IOT-RAY-001")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        station = data["station"]
        self.assertEqual(station["district"], "Rayagada")
        self.assertEqual(station["subdivision"], "Gunupur")
        self.assertIn("hardware_spec", station)
        self.assertIn("BME280", station["hardware_spec"]["temp_rh_sensor"])
        self.assertIn("Tipping Bucket", station["hardware_spec"]["rain_gauge"])

    def test_03_telemetry_ingestion(self):
        """Verify real-time sensor telemetry ingestion from an ESP32 node."""
        payload = {
            "station_id": "OD-IOT-RAY-001",
            "temperature_c": 34.2,
            "humidity_rh": 65.5,
            "pressure_hpa": 1007.8,
            "wind_speed_kmh": 12.0,
            "wind_gust_kmh": 18.0,
            "rainfall_rate_mm_h": 0.0,
            "rainfall_today_mm": 0.0,
            "solar_radiation_wm2": 850.0,
            "uv_index": 9.0,
            "battery_volts": 4.14
        }
        resp = self.client.post("/api/iot/telemetry", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "recorded")
        self.assertEqual(data["station_id"], "OD-IOT-RAY-001")

        # Confirm update reflected in station query
        s_resp = self.client.get("/api/iot/stations/OD-IOT-RAY-001")
        s_data = s_resp.json()
        latest = s_data["station"]["latest_telemetry"]
        self.assertEqual(latest["temperature_c"], 34.2)
        self.assertEqual(latest["solar_radiation_wm2"], 850.0)

    def test_04_ml_ground_truth_residuals_in_predict(self):
        """Verify /api/predict calculates ML model residuals against ground-truth IoT measurements."""
        resp = self.client.post("/api/predict", json={"district": "Rayagada"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("iot_ground_truth", data)
        iot = data["iot_ground_truth"]
        self.assertIsNotNone(iot)
        self.assertTrue(iot["available"])
        self.assertEqual(iot["station_id"], "OD-IOT-RAY-001")
        self.assertIn("residuals", iot)
        self.assertIn("temperature_residual_c", iot["residuals"])
        self.assertIn("instantaneous_brier_score", iot["residuals"])

    def test_05_network_overview_metadata(self):
        """Verify network overview endpoint provides protocol and sensor suite info."""
        resp = self.client.get("/api/iot/network-overview")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("Odisha Hyperlocal", data["network_name"])
        self.assertGreaterEqual(data["active_nodes"], 5)
        self.assertTrue(len(data["supported_protocols"]) >= 3)

if __name__ == '__main__':
    unittest.main()

