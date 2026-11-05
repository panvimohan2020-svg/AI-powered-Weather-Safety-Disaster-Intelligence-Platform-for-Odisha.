import time
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class IoTTelemetryPayload(BaseModel):
    station_id: str = Field(..., description="Unique alphanumeric identifier of the IoT AWS station")
    api_key: Optional[str] = Field("odisha-iot-demo-key", description="Authentication token for station telemetry")
    temperature_c: float = Field(..., ge=-10.0, le=60.0, description="Ambient dry-bulb temperature in Celsius")
    humidity_rh: float = Field(..., ge=0.0, le=100.0, description="Relative humidity percentage")
    pressure_hpa: Optional[float] = Field(1013.25, ge=800.0, le=1100.0, description="Barometric surface pressure in hPa")
    wind_speed_kmh: Optional[float] = Field(0.0, ge=0.0, le=250.0, description="Sustained anemometer wind speed in km/h")
    wind_gust_kmh: Optional[float] = Field(0.0, ge=0.0, le=300.0, description="Peak mechanical wind gust in km/h")
    rainfall_rate_mm_h: Optional[float] = Field(0.0, ge=0.0, le=200.0, description="Tipping-bucket rainfall rate in mm/hour")
    rainfall_today_mm: Optional[float] = Field(0.0, ge=0.0, le=500.0, description="Cumulative 24h daily precipitation in mm")
    solar_radiation_wm2: Optional[float] = Field(None, ge=0.0, le=1400.0, description="Pyranometer solar irradiance in W/m2")
    uv_index: Optional[float] = Field(0.0, ge=0.0, le=16.0, description="Photodiode solar UV Index")
    battery_volts: Optional[float] = Field(4.1, ge=2.8, le=14.5, description="Solar charge / LiFePO4 battery voltage")

class IoTStationRegistry:
    """
    Central In-Memory & Extensible Registry for Hyperlocal IoT Weather Stations across Odisha.
    Maintains hardware telemetry buffers, sensor health diagnostics, and ML residual tracking.
    """
    def __init__(self):
        # Reference seed stations representing distinct geographic regimes of Odisha
        self.stations: Dict[str, Dict[str, Any]] = {
            "OD-IOT-RAY-001": {
                "station_id": "OD-IOT-RAY-001",
                "station_name": "Gunupur Vamsadhara Basin AWS",
                "district": "Rayagada",
                "subdivision": "Gunupur",
                "coordinates": {"lat": 19.0805, "lon": 83.8124},
                "elevation_m": 83,
                "hardware_spec": {
                    "mcu": "ESP32-S3 Dual-Core Xtensa (LoRaWAN + 4G LTE Fallback)",
                    "temp_rh_sensor": "Bosch Sensortec BME280 (±0.5°C, ±3% RH)",
                    "rain_gauge": "Tipping Bucket Reed Switch (0.2 mm resolution)",
                    "wind_sensor": "Hall-Effect 3-Cup Optical Anemometer",
                    "solar_sensor": "Apogee SP-110 Silicon Pyranometer",
                    "power_source": "15W Solar Panel + 6400mAh LiFePO4 Battery"
                },
                "status": "ONLINE",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "latest_telemetry": {
                    "temperature_c": 33.4,
                    "humidity_rh": 64.0,
                    "pressure_hpa": 1008.2,
                    "wind_speed_kmh": 11.5,
                    "wind_gust_kmh": 16.0,
                    "rainfall_rate_mm_h": 0.0,
                    "rainfall_today_mm": 0.0,
                    "solar_radiation_wm2": 780.0,
                    "uv_index": 8.2,
                    "battery_volts": 4.12
                },
                "telemetry_history": []
            },
            "OD-IOT-KOR-001": {
                "station_id": "OD-IOT-KOR-001",
                "station_name": "Semiliguda Highland Agro AWS",
                "district": "Koraput",
                "subdivision": "Semiliguda",
                "coordinates": {"lat": 18.7052, "lon": 82.8681},
                "elevation_m": 885,
                "hardware_spec": {
                    "mcu": "Nordic nRF9160 (NB-IoT / LTE-M Low-Power Node)",
                    "temp_rh_sensor": "Sensirion SHT35 Precision Sensor",
                    "rain_gauge": "Tipping Bucket Optical Sensor",
                    "wind_sensor": "Ultrasonic 2D Solid-State Anemometer",
                    "solar_sensor": "Kipp & Zonen CMP3 Pyranometer",
                    "power_source": "20W Solar Panel + 10Ah LiFePO4 Battery"
                },
                "status": "ONLINE",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "latest_telemetry": {
                    "temperature_c": 24.8,
                    "humidity_rh": 58.0,
                    "pressure_hpa": 918.5,
                    "wind_speed_kmh": 14.2,
                    "wind_gust_kmh": 22.0,
                    "rainfall_rate_mm_h": 0.0,
                    "rainfall_today_mm": 0.0,
                    "solar_radiation_wm2": 820.0,
                    "uv_index": 9.1,
                    "battery_volts": 4.18
                },
                "telemetry_history": []
            },
            "OD-IOT-KHD-001": {
                "station_id": "OD-IOT-KHD-001",
                "station_name": "Bhubaneswar Smart City AWS",
                "district": "Khurda (Bhubaneswar)",
                "subdivision": "Bhubaneswar",
                "coordinates": {"lat": 20.2961, "lon": 85.8245},
                "elevation_m": 45,
                "hardware_spec": {
                    "mcu": "Raspberry Pi CM4 Industrial Gateway (Ethernet + LTE)",
                    "temp_rh_sensor": "Bosch BME680 (Gas / VOC + Temp + Humidity)",
                    "rain_gauge": "Davis Instruments 6466 Tipping Spoon",
                    "wind_sensor": "Davis 6410 Anemometer & Wind Vane",
                    "solar_sensor": "Davis Solar Radiation Sensor 6450",
                    "power_source": "Grid Powered with 12V 7Ah UPS Backup"
                },
                "status": "ONLINE",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "latest_telemetry": {
                    "temperature_c": 31.8,
                    "humidity_rh": 72.0,
                    "pressure_hpa": 1012.4,
                    "wind_speed_kmh": 8.0,
                    "wind_gust_kmh": 12.0,
                    "rainfall_rate_mm_h": 0.0,
                    "rainfall_today_mm": 0.0,
                    "solar_radiation_wm2": 690.0,
                    "uv_index": 7.4,
                    "battery_volts": 12.6
                },
                "telemetry_history": []
            },
            "OD-IOT-JAG-001": {
                "station_id": "OD-IOT-JAG-001",
                "station_name": "Paradip Port Maritime Coastal AWS",
                "district": "Jagatsinghpur",
                "subdivision": "Paradip",
                "coordinates": {"lat": 20.2724, "lon": 86.6802},
                "elevation_m": 6,
                "hardware_spec": {
                    "mcu": "ESP32-WROVER (Marine Grade IP67 Enclosure + MQTT)",
                    "temp_rh_sensor": "Sensirion SHT45 (Harsh Environment PTFE filter)",
                    "rain_gauge": "Tipping Bucket Stainless Steel",
                    "wind_sensor": "Gill Instruments 2D Ultrasonic Anemometer",
                    "solar_sensor": "Silicon Photodiode Pyranometer",
                    "power_source": "30W Marine Grade Solar + 20Ah Battery"
                },
                "status": "ONLINE",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "latest_telemetry": {
                    "temperature_c": 30.2,
                    "humidity_rh": 84.0,
                    "pressure_hpa": 1011.8,
                    "wind_speed_kmh": 22.5,
                    "wind_gust_kmh": 31.0,
                    "rainfall_rate_mm_h": 0.0,
                    "rainfall_today_mm": 2.5,
                    "solar_radiation_wm2": 610.0,
                    "uv_index": 6.8,
                    "battery_volts": 4.15
                },
                "telemetry_history": []
            },
            "OD-IOT-MAY-001": {
                "station_id": "OD-IOT-MAY-001",
                "station_name": "Baripada Similipal Biosphere AWS",
                "district": "Mayurbhanj (Baripada)",
                "subdivision": "Baripada",
                "coordinates": {"lat": 21.9333, "lon": 86.7320},
                "elevation_m": 120,
                "hardware_spec": {
                    "mcu": "Seeed Studio LoRa-E5 (Long Range Canopy Penetration)",
                    "temp_rh_sensor": "Bosch BME280 Waterproof Probe",
                    "rain_gauge": "Acoustic Rain Sensor AP-23",
                    "wind_sensor": "Compact Cup Anemometer",
                    "solar_sensor": "Photosynthetically Active Radiation (PAR) Sensor",
                    "power_source": "10W Solar + 5000mAh LiFePO4"
                },
                "status": "ONLINE",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "latest_telemetry": {
                    "temperature_c": 29.5,
                    "humidity_rh": 68.0,
                    "pressure_hpa": 1009.6,
                    "wind_speed_kmh": 9.0,
                    "wind_gust_kmh": 14.5,
                    "rainfall_rate_mm_h": 0.0,
                    "rainfall_today_mm": 0.0,
                    "solar_radiation_wm2": 720.0,
                    "uv_index": 7.8,
                    "battery_volts": 4.08
                },
                "telemetry_history": []
            }
        }

    def record_telemetry(self, payload: IoTTelemetryPayload) -> Dict[str, Any]:
        """Ingests live sensor reading from an IoT Automatic Weather Station."""
        now_iso = datetime.now(timezone.utc).isoformat()
        station = self.stations.get(payload.station_id)
        if not station:
            # Dynamically auto-register new IoT node
            station = {
                "station_id": payload.station_id,
                "station_name": f"Hyperlocal Node {payload.station_id}",
                "district": "Unknown",
                "subdivision": "Field Station",
                "coordinates": {"lat": 20.0, "lon": 85.0},
                "elevation_m": 50,
                "hardware_spec": {
                    "mcu": "ESP32 Autonomous Sensor Node",
                    "temp_rh_sensor": "Factory Calibrated Environmental Sensor"
                },
                "status": "ONLINE",
                "last_heartbeat": now_iso,
                "latest_telemetry": {},
                "telemetry_history": []
            }
            self.stations[payload.station_id] = station

        telemetry_dict = {
            "timestamp": now_iso,
            "temperature_c": round(payload.temperature_c, 2),
            "humidity_rh": round(payload.humidity_rh, 1),
            "pressure_hpa": round(payload.pressure_hpa, 2) if payload.pressure_hpa else 1013.25,
            "wind_speed_kmh": round(payload.wind_speed_kmh, 1) if payload.wind_speed_kmh is not None else 0.0,
            "wind_gust_kmh": round(payload.wind_gust_kmh, 1) if payload.wind_gust_kmh is not None else 0.0,
            "rainfall_rate_mm_h": round(payload.rainfall_rate_mm_h, 2) if payload.rainfall_rate_mm_h is not None else 0.0,
            "rainfall_today_mm": round(payload.rainfall_today_mm, 2) if payload.rainfall_today_mm is not None else 0.0,
            "solar_radiation_wm2": round(payload.solar_radiation_wm2, 1) if payload.solar_radiation_wm2 is not None else None,
            "uv_index": round(payload.uv_index, 1) if payload.uv_index is not None else 0.0,
            "battery_volts": round(payload.battery_volts, 2) if payload.battery_volts is not None else 4.0
        }

        station["latest_telemetry"] = telemetry_dict
        station["last_heartbeat"] = now_iso
        station["status"] = "ONLINE"

        # Keep rolling 24-point telemetry history
        station["telemetry_history"].append(telemetry_dict)
        if len(station["telemetry_history"]) > 24:
            station["telemetry_history"].pop(0)

        return {
            "success": True,
            "station_id": payload.station_id,
            "ingested_at": now_iso,
            "battery_health": "OPTIMAL" if (payload.battery_volts or 4.0) >= 3.7 else "LOW_BATTERY"
        }

    def get_station(self, station_id: str) -> Optional[Dict[str, Any]]:
        return self.stations.get(station_id)

    def list_all_stations(self) -> List[Dict[str, Any]]:
        return list(self.stations.values())

    def find_nearest_station_for_district(self, district_name: str) -> Optional[Dict[str, Any]]:
        """Finds active IoT station deployed within or nearest to the district."""
        d_lower = district_name.lower()
        for s in self.stations.values():
            if d_lower in s["district"].lower() or s["district"].lower() in d_lower:
                return s
        return None

    def compute_ml_ground_truth_residuals(
        self,
        station_id: str,
        predicted_temp: float,
        predicted_rh: float,
        predicted_rain_prob: float
    ) -> Dict[str, Any]:
        """
        Validates Machine Learning predictions against physical ground-truth sensor measurements.
        Computes prediction residuals: (Measured_IoT - Predicted_Model).
        """
        station = self.get_station(station_id)
        if not station or not station.get("latest_telemetry"):
            return {
                "available": False,
                "reason": "Station telemetry unavailable for residual analysis"
            }

        t_iot = station["latest_telemetry"]["temperature_c"]
        rh_iot = station["latest_telemetry"]["humidity_rh"]
        rain_rate = station["latest_telemetry"].get("rainfall_rate_mm_h", 0.0)

        delta_temp = round(t_iot - predicted_temp, 2)
        delta_rh = round(rh_iot - predicted_rh, 1)

        # Ground-truth binary rain state (rate > 0.1 mm/h)
        ground_truth_raining = rain_rate > 0.1
        # Brier single-observation verification error: (P_pred - Actual_binary)^2
        actual_rain_binary = 1.0 if ground_truth_raining else 0.0
        brier_error = round((predicted_rain_prob - actual_rain_binary) ** 2, 4)

        return {
            "available": True,
            "station_id": station_id,
            "station_name": station["station_name"],
            "ground_truth_sensors": {
                "measured_temperature_c": t_iot,
                "measured_humidity_rh": rh_iot,
                "measured_rain_rate_mm_h": rain_rate,
                "measured_solar_wm2": station["latest_telemetry"].get("solar_radiation_wm2")
            },
            "residuals": {
                "temperature_residual_c": delta_temp,
                "humidity_residual_pct": delta_rh,
                "ground_truth_rain_active": ground_truth_raining,
                "instantaneous_brier_score": brier_error
            },
            "interpretation": (
                f"IoT Ground-Truth delta: {delta_temp:+.1f}°C temperature, {delta_rh:+.0f}% RH. "
                f"Model calibration error (Brier Score): {brier_error}."
            )
        }

# Global Singleton IoT Manager
GLOBAL_IOT_REGISTRY = IoTStationRegistry()

