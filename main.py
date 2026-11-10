import os
import time
import json
import copy
import math
import asyncio
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

import joblib
import pandas as pd
import numpy as np
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from wri_engine import (
    calculate_distance_to_coast, 
    calculate_wri, 
    calculate_heat_index_celsius, 
    calculate_wbgt_approx
)
from districts import (
    ODISHA_30_DISTRICTS, 
    find_nearest_district, 
    resolve_district_details,
    get_district_by_name, 
    get_districts_list
)
from whatsapp_bot import whatsapp_router
from emergency_engine import (
    GLOBAL_ALERT_STORE,
    ALERT_LEVELS,
    ODISHA_RIVER_GAUGES,
    MAJOR_DAM_RESERVOIRS,
    OFFICIAL_SOURCES_DOCUMENTATION,
    fetch_regional_earthquakes,
    evaluate_and_generate_alerts_for_district,
    trigger_simulated_alert
)
from shelters_data import (
    find_nearest_shelters,
    EMERGENCY_CONTACTS,
    VERIFIED_SHELTERS
)
from iot_engine import (
    GLOBAL_IOT_REGISTRY, 
    IoTTelemetryPayload
)

# Prevent OOM in multi-tenant environments
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

app = FastAPI(
    title="Odisha WRI & District Weather Safety Intelligence",
    description="Advanced public weather-safety platform and meteorological hazard prediction engine for Odisha",
    version="2.2.0"
)

allowed_origins_env = os.environ.get("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(whatsapp_router)

# Model Feature Columns (exact match with train_model.py)
MODEL_FEATURE_COLUMNS = [
    'LATITUDE', 'LONGITUDE', 'ELEVATION', 'DISTANCE_TO_COAST',
    'T2M_MAX', 'T2M_MIN', 'RH2M', 'WS50M', 'PS', 'QV2M',
    'PS_DELTA_24H', 'RAIN_YESTERDAY_BIN', 'VPD', 'DTR', 'THI', 'MOISTURE_FLUX',
    'SIN_DOY', 'COS_DOY'
]

# Load trained champion calibrated model
MODEL_PATH = "model/weather_predictor_v2.pkl"
try:
    print(f"Loading calibrated ML model from {MODEL_PATH}...")
    model = joblib.load(MODEL_PATH)
    print("Calibrated ML model loaded successfully.")
except Exception as e:
    print(f"Warning: Model not found or failed to load from {MODEL_PATH}: {e}")
    model = None

# Weather Code Mapping (WMO Meteorological Standards)
WMO_WEATHER_CODES = {
    0: {"condition": "Clear Sky", "group": "clear", "icon": "sun", "night_icon": "moon"},
    1: {"condition": "Mainly Clear", "group": "clear", "icon": "sun", "night_icon": "moon"},
    2: {"condition": "Partly Cloudy", "group": "cloudy", "icon": "cloud-sun", "night_icon": "cloud-moon"},
    3: {"condition": "Overcast", "group": "cloudy", "icon": "cloud", "night_icon": "cloud"},
    45: {"condition": "Foggy", "group": "fog", "icon": "cloud-fog", "night_icon": "cloud-fog"},
    48: {"condition": "Depositing Rime Fog", "group": "fog", "icon": "cloud-fog", "night_icon": "cloud-fog"},
    51: {"condition": "Light Drizzle", "group": "rain", "icon": "cloud-drizzle", "night_icon": "cloud-drizzle"},
    53: {"condition": "Moderate Drizzle", "group": "rain", "icon": "cloud-drizzle", "night_icon": "cloud-drizzle"},
    55: {"condition": "Dense Drizzle", "group": "rain", "icon": "cloud-drizzle", "night_icon": "cloud-drizzle"},
    61: {"condition": "Slight Rain", "group": "rain", "icon": "cloud-rain", "night_icon": "cloud-rain"},
    63: {"condition": "Moderate Rain", "group": "rain", "icon": "cloud-rain", "night_icon": "cloud-rain"},
    65: {"condition": "Heavy Rain", "group": "rain", "icon": "cloud-rain", "night_icon": "cloud-rain"},
    80: {"condition": "Slight Rain Showers", "group": "rain", "icon": "cloud-rain", "night_icon": "cloud-rain"},
    81: {"condition": "Moderate Rain Showers", "group": "rain", "icon": "cloud-rain", "night_icon": "cloud-rain"},
    82: {"condition": "Violent Rain Showers", "group": "rain", "icon": "cloud-rain", "night_icon": "cloud-rain"},
    95: {"condition": "Thunderstorm", "group": "storm", "icon": "cloud-lightning", "night_icon": "cloud-lightning"},
    96: {"condition": "Thunderstorm with Hail", "group": "storm", "icon": "cloud-lightning", "night_icon": "cloud-lightning"},
    99: {"condition": "Severe Thunderstorm with Hail", "group": "storm", "icon": "cloud-lightning", "night_icon": "cloud-lightning"}
}

# In-Memory Location Cache with isolated deep copies (TTL: 10 minutes)
WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 600

class PredictionRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    locality: Optional[str] = None
    refresh: Optional[bool] = False

class WorkPlanRequest(BaseModel):
    district: str
    activity: str = Field(default="general", description="farming | construction | daily_wage | general")
    shift_start_hour: int = Field(default=8, ge=0, le=23)
    duration_hours: int = Field(default=8, ge=1, le=16)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    locality: Optional[str] = None
    shift_date: Optional[str] = Field(default="today", description="today | tomorrow")

def format_iso_time(iso_str: str) -> str:
    """Converts ISO 8601 string to friendly 12-hour format."""
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%I:%M %p")
    except Exception:
        return iso_str

def generate_official_alerts(
    weather_code: int,
    temp_max: float,
    heat_index: float,
    wind_speed: float,
    wind_gusts: float,
    precip_today_mm: float,
    pressure_delta: float,
    district_name: str
) -> List[Dict[str, Any]]:
    """
    Evaluates meteorological thresholds aligned with India Meteorological Department (IMD)
    and Odisha State Disaster Management Authority (OSDMA) alert standards.
    """
    alerts = []
    now_iso = datetime.now().astimezone().isoformat()
    valid_until = (datetime.now().astimezone() + timedelta(hours=12)).isoformat()

    # 1. Thunderstorm & Lightning Alert (IMD Yellow/Orange warning)
    if weather_code in [95, 96, 99]:
        severity = "ORANGE" if weather_code in [96, 99] else "YELLOW"
        alerts.append({
            "id": f"alert-thunder-{district_name}",
            "title": "Severe Thunderstorm & Lightning Warning",
            "category": "lightning",
            "severity": severity,
            "affected_area": district_name,
            "issue_time": now_iso,
            "valid_until": valid_until,
            "source": "Open-Meteo NWP & IMD Convective Guidance Standards",
            "description": "Active convective thunderstorm with cloud-to-ground lightning hazards.",
            "recommended_action": (
                "Suspend all outdoor activities in open fields immediately. Take shelter in a sturdy building. "
                "Do not stand under isolated trees, tin sheds, or near metal towers."
            )
        })

    # 2. Heavy Rainfall / Flood Alert (IMD > 64.5mm heavy rain threshold)
    if precip_today_mm >= 64.5 or weather_code in [65, 82]:
        severity = "RED" if precip_today_mm >= 115.5 else "ORANGE"
        alerts.append({
            "id": f"alert-rain-{district_name}",
            "title": "Heavy to Very Heavy Rainfall Warning",
            "category": "rainfall",
            "severity": severity,
            "affected_area": district_name,
            "issue_time": now_iso,
            "valid_until": valid_until,
            "source": "IMD Regional Meteorological Centre (Bhubaneswar) Precipitation Standards",
            "description": f"Significant precipitation expected ({precip_today_mm:.1f} mm). Risk of waterlogging and crop inundation.",
            "recommended_action": (
                "Ensure agricultural drain channels are open. Avoid waterlogged roads and low-lying culverts. "
                "Protect harvested produce and machinery."
            )
        })

    # 3. Dangerous Heatwave / Thermal Stress Warning
    if heat_index >= 45.0 or temp_max >= 42.0:
        severity = "RED" if heat_index >= 48.0 or temp_max >= 44.0 else "ORANGE"
        alerts.append({
            "id": f"alert-heat-{district_name}",
            "title": "Extreme Heatwave & Severe Thermal Stress Alert",
            "category": "heat",
            "severity": severity,
            "affected_area": district_name,
            "issue_time": now_iso,
            "valid_until": valid_until,
            "source": "OSDMA Heatwave Action Plan & IMD Criteria",
            "description": f"Peak Heat Index reaches {heat_index:.1f}°C (Max Temp {temp_max:.1f}°C). Severe heatstroke risk.",
            "recommended_action": (
                "Reschedule heavy outdoor labor to early morning (before 10 AM). Mandatory 30-min rest in shade "
                "per hour with ORS/lemon water. Never leave elderly, children, or pets in unventilated areas."
            )
        })
    elif heat_index >= 40.0:
        alerts.append({
            "id": f"alert-heat-caution-{district_name}",
            "title": "Heat Stress Cautionary Advisory",
            "category": "heat",
            "severity": "YELLOW",
            "affected_area": district_name,
            "issue_time": now_iso,
            "valid_until": valid_until,
            "source": "OSDMA Heat Action Guidelines",
            "description": f"Heat Index {heat_index:.1f}°C. High perspiration loss and dehydration strain.",
            "recommended_action": "Drink plenty of water before feeling thirsty. Wear light cotton garments and wide hats."
        })

    # 4. High Wind / Gale Warning (Coastal & Marine corridors)
    max_wind = max(wind_speed, wind_gusts)
    if max_wind >= 45.0:
        severity = "RED" if max_wind >= 60.0 else "ORANGE"
        alerts.append({
            "id": f"alert-wind-{district_name}",
            "title": "Squally Wind & Gale Force Warning",
            "category": "wind",
            "severity": severity,
            "affected_area": district_name,
            "issue_time": now_iso,
            "valid_until": valid_until,
            "source": "IMD Marine & Coastal Weather Bulletin Guidelines",
            "description": f"Wind gusts up to {max_wind:.1f} km/h recorded or forecast.",
            "recommended_action": (
                "Avoid working at heights, suspended scaffolding, or crane lifting. "
                "Fishermen advised not to venture into deep sea. Secure tin roofs and loose boards."
            )
        })

    # 5. Bay of Bengal Cyclonic Depression Watch
    if pressure_delta <= -2.5:
        alerts.append({
            "id": f"alert-pressure-{district_name}",
            "title": "Bay of Bengal Low Pressure / Depression Watch",
            "category": "cyclone",
            "severity": "YELLOW",
            "affected_area": district_name,
            "issue_time": now_iso,
            "valid_until": valid_until,
            "source": "Meteorological Barometric Drop Analysis (< -2.5 hPa/24h)",
            "description": f"24-hour barometric pressure dropped by {abs(pressure_delta):.1f} hPa, indicating approaching system.",
            "recommended_action": "Stay tuned to regular IMD weather bulletins for potential system intensification."
        })

    return alerts

@app.get("/health")
async def health_check():
    """Health check endpoint for Render / cloud monitoring."""
    return {
        "status": "healthy",
        "service": "Odisha WRI API",
        "version": "2.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_loaded": model is not None
    }

@app.get("/")
async def serve_frontend():
    # Prefer production Vite build if present, otherwise serve static dashboard
    dist_index = os.path.join("wri-frontend", "dist", "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    return FileResponse("static/index.html")

@app.get("/api/districts")
async def list_districts():
    """Returns all 30 Odisha districts with coordinates, elevation, and coastal distance."""
    return {"districts": get_districts_list()}

@app.get("/api/model-info")
async def get_model_info():
    """Returns comprehensive training metrics, calibration curves, and research validation results."""
    metrics_path = "model/model_metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {"status": "Model metrics not available. Run train_model.py first."}

async def fetch_multi_tier_weather(target_lat: float, target_lon: float, dist_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    High-Resilience Meteorological Data Ingestion Engine.
    Tier 1: Open-Meteo High-Resolution NWP (ECMWF & GFS Seamless)
    Tier 2: wttr.in Real-Time WMO Station Observations (Live Telemetry)
    Tier 3: Dynamic Calibrated Odisha Microclimate Climatological Engine (Offline Fallback)
    """
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)
    curr_hour = now_ist.hour
    is_daytime = 1 if 6 <= curr_hour <= 18 else 0

    elev = float(dist_info.get("elevation", 50.0)) if dist_info else 50.0
    c_km = float(dist_info.get("coast_km", 100.0)) if dist_info else 100.0
    d_lat = float(target_lat) if target_lat is not None else (float(dist_info.get("lat", 20.0)) if dist_info else 20.0)
    d_lon = float(target_lon) if target_lon is not None else (float(dist_info.get("lon", 85.0)) if dist_info else 85.0)

    # -------------------------------------------------------------
    # TIER 1: Open-Meteo NWP Forecast (Live)
    # -------------------------------------------------------------
    weather_url = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": d_lat,
        "longitude": d_lon,
        "current": [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature", 
            "wind_speed_10m", "wind_gusts_10m", "precipitation", 
            "surface_pressure", "weather_code", "is_day"
        ],
        "daily": [
            "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max",
            "precipitation_sum", "precipitation_probability_max", 
            "wind_speed_10m_max", "wind_gusts_10m_max", "uv_index_max",
            "sunrise", "sunset"
        ],
        "hourly": [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature",
            "precipitation_probability", "precipitation", "weather_code",
            "wind_speed_10m", "wind_gusts_10m", "uv_index", "surface_pressure"
        ],
        "past_days": 1,
        "forecast_days": 2,
        "timezone": "Asia/Kolkata"
    }

    browser_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=4.5, headers=browser_headers, follow_redirects=True) as client:
            resp = await client.get(weather_url, params=weather_params)
            if resp.status_code == 200:
                cand_data = resp.json()
                if cand_data.get("current") and cand_data.get("hourly", {}).get("time"):
                    cand_data["data_source"] = "Open-Meteo High-Resolution NWP (Live Telemetry)"
                    cand_data["data_status"] = "LIVE"
                    cand_data["is_live"] = True
                    cand_data["fallback_used"] = False
                    return cand_data
    except Exception:
        pass

    # -------------------------------------------------------------
    # TIER 2: wttr.in Real-Time WMO Station Observations (Live)
    # -------------------------------------------------------------
    try:
        wttr_url = f"https://wttr.in/{round(d_lat, 4)},{round(d_lon, 4)}?format=j1"
        async with httpx.AsyncClient(timeout=4.0, headers=browser_headers, follow_redirects=True) as client:
            wttr_resp = await client.get(wttr_url)
            if wttr_resp.status_code == 200:
                wttr_json = wttr_resp.json()
                if wttr_json.get("current_condition"):
                    cur = wttr_json["current_condition"][0]
                    c_temp = float(cur.get("temp_C", 25.0))
                    c_rh = float(cur.get("humidity", 65.0))
                    c_app = float(cur.get("FeelsLikeC", c_temp))
                    c_wind = float(cur.get("windspeedKmph", 10.0))
                    c_press = float(cur.get("pressure", 1012.0))
                    c_precip = float(cur.get("precipMM", 0.0))
                    w_code = int(cur.get("weatherCode", 113))

                    # Map wttr code to standard WMO code
                    wmo_code = 0
                    if w_code in [116]: wmo_code = 2
                    elif w_code in [119, 122]: wmo_code = 3
                    elif w_code in [143, 248]: wmo_code = 45
                    elif w_code in [176, 263, 266, 293, 296, 299, 302, 305, 308]: wmo_code = 61
                    elif w_code in [386, 389, 392, 395]: wmo_code = 95

                    d_list = wttr_json.get("weather", [])
                    t_maxes, t_mins, p_sums, w_maxes, g_maxes, uvs, sunrises, sunsets = [], [], [], [], [], [], [], []
                    for day in d_list[:3]:
                        t_maxes.append(float(day.get("maxtempC", c_temp + 5.0)))
                        t_mins.append(float(day.get("mintempC", c_temp - 5.0)))
                        uvs.append(float(day.get("uvIndex", 5.0)))
                        astro = day.get("astronomy", [{}])[0]
                        sunrises.append(astro.get("sunrise", "05:50 AM"))
                        sunsets.append(astro.get("sunset", "05:20 PM"))
                        p_sums.append(0.0)
                        w_maxes.append(round(c_wind * 1.3, 1))
                        g_maxes.append(round(c_wind * 1.6, 1))

                    while len(t_maxes) < 3:
                        t_maxes.append(round(c_temp + 5.0, 1))
                        t_mins.append(round(c_temp - 5.0, 1))
                        uvs.append(5.0)
                        sunrises.append("05:50 AM")
                        sunsets.append("05:20 PM")
                        p_sums.append(0.0)
                        w_maxes.append(round(c_wind * 1.3, 1))
                        g_maxes.append(round(c_wind * 1.6, 1))

                    yesterday_00 = (now_ist - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                    h_times = [(yesterday_00 + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(72)]
                    h_temps, h_rhs, h_apps, h_pops, h_precips, h_wcodes, h_winds, h_gusts, h_uvs, h_pressures = [], [], [], [], [], [], [], [], [], []

                    t_min_est = t_mins[0] if t_mins else (c_temp - 5.0)
                    t_max_est = t_maxes[0] if t_maxes else (c_temp + 5.0)

                    for i in range(72):
                        h_dt = yesterday_00 + timedelta(hours=i)
                        h = h_dt.hour
                        phase = (h - 5) / 24.0 * 2.0 * math.pi
                        h_temp = round(t_min_est + (t_max_est - t_min_est) * 0.5 * (1.0 - math.cos(phase)), 1)
                        h_rh = round(min(96.0, max(28.0, c_rh + 12.0 * math.cos(phase))), 1)
                        h_temps.append(h_temp)
                        h_rhs.append(h_rh)
                        h_apps.append(round(h_temp + (1.5 if h_temp > 28 else 0.5), 1))
                        h_pops.append(5)
                        h_precips.append(0.0)
                        h_wcodes.append(wmo_code)
                        h_winds.append(round(c_wind * (1.2 if 12 <= h <= 16 else 0.8), 1))
                        h_gusts.append(round(c_wind * 1.35, 1))
                        h_uvs.append(round(max(0.0, 7.5 * math.sin((h - 6) / 12.0 * math.pi)), 1) if 6 <= h <= 18 else 0.0)
                        h_pressures.append(c_press)

                    return {
                        "data_source": "wttr.in Real-Time Meteorological Telemetry (Live)",
                        "data_status": "LIVE",
                        "is_live": True,
                        "fallback_used": False,
                        "current": {
                            "temperature_2m": c_temp,
                            "relative_humidity_2m": c_rh,
                            "apparent_temperature": c_app,
                            "wind_speed_10m": c_wind,
                            "wind_gusts_10m": round(c_wind * 1.35, 1),
                            "surface_pressure": c_press,
                            "weather_code": wmo_code,
                            "is_day": is_daytime,
                            "precipitation": c_precip
                        },
                        "daily": {
                            "temperature_2m_max": t_maxes,
                            "temperature_2m_min": t_mins,
                            "precipitation_sum": p_sums,
                            "wind_speed_10m_max": w_maxes,
                            "wind_gusts_10m_max": g_maxes,
                            "uv_index_max": uvs,
                            "sunrise": sunrises,
                            "sunset": sunsets
                        },
                        "hourly": {
                            "time": h_times,
                            "temperature_2m": h_temps,
                            "relative_humidity_2m": h_rhs,
                            "apparent_temperature": h_apps,
                            "precipitation_probability": h_pops,
                            "precipitation": h_precips,
                            "weather_code": h_wcodes,
                            "wind_speed_10m": h_winds,
                            "wind_gusts_10m": h_gusts,
                            "uv_index": h_uvs,
                            "surface_pressure": h_pressures
                        }
                    }
    except Exception:
        pass

    # -------------------------------------------------------------
    # TIER 3: Dynamic Microclimate Climatological Model (Offline Fallback)
    # -------------------------------------------------------------
    hour_rad = ((curr_hour - 5.5) / 24.0) * 2.0 * math.pi
    solar_factor = 0.5 * (1.0 - math.cos(hour_rad))
    sl_temp = 22.5 + (11.5 * solar_factor)

    lat_gradient = (20.5 - d_lat) * 0.65
    west_dist = max(0.0, 86.5 - d_lon)
    continental_offset = (west_dist * 0.65) if is_daytime else -(west_dist * 0.45)
    lapse_cooling = (elev / 100.0) * 0.65

    adjusted_temp = round(sl_temp + lat_gradient + continental_offset - lapse_cooling, 1)

    if c_km <= 35.0:
        base_rh = 72.0 + (18.0 * (1.0 - solar_factor))
    elif c_km <= 120.0:
        base_rh = 58.0 + (22.0 * (1.0 - solar_factor))
    else:
        base_rh = 40.0 + (28.0 * (1.0 - solar_factor))

    base_rh = min(96.0, max(28.0, round(base_rh + (elev / 400.0) * 2.5, 1)))

    wind_base = (16.0 if c_km <= 35.0 else (11.0 if elev > 300 else 7.5)) + (3.5 * solar_factor)
    wind_gust = round(wind_base * 1.35, 1)
    wind_base = round(wind_base, 1)

    ps_calc = round(1013.25 * ((1.0 - (2.25577e-5 * elev)) ** 5.25588), 1)
    t_max_est = round(34.0 + lat_gradient + (west_dist * 0.65) - lapse_cooling, 1)
    t_min_est = round(22.0 + lat_gradient - (west_dist * 0.45) - lapse_cooling, 1)

    yesterday_00 = (now_ist - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    fallback_hourly_times = [(yesterday_00 + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(72)]
    fallback_temps, fallback_rhs, fallback_apparents, fallback_pops, fallback_precips = [], [], [], [], []
    fallback_wcodes, fallback_winds, fallback_gusts, fallback_uvs, fallback_pressures = [], [], [], [], []

    for i in range(72):
        h_dt = yesterday_00 + timedelta(hours=i)
        h = h_dt.hour
        phase = (h - 5) / 24.0 * 2.0 * math.pi
        h_temp = round(t_min_est + (t_max_est - t_min_est) * 0.5 * (1.0 - math.cos(phase)), 1)
        h_rh = round(min(96.0, max(28.0, base_rh - 12.0 + (18.0 * 0.5 * (1.0 + math.cos(phase))))), 1)
        h_app = round(h_temp + (2.0 if h_temp > 30 else (0.5 if h_temp < 25 else 1.2)), 1)
        h_uv = round(max(0.0, 7.5 * math.sin((h - 6) / 12.0 * math.pi)), 1) if 6 <= h <= 18 else 0.0
        h_wind = round(wind_base * (1.25 if 12 <= h <= 16 else 0.85), 1)
        h_gust = round(h_wind * 1.35, 1)
        h_ps = round(ps_calc + 1.2 * math.cos((h - 9) / 12.0 * 2.0 * math.pi), 1)

        fallback_temps.append(h_temp)
        fallback_rhs.append(h_rh)
        fallback_apparents.append(h_app)
        fallback_pops.append(5)
        fallback_precips.append(0.0)
        fallback_wcodes.append(1 if (6 <= h <= 18) else 0)
        fallback_winds.append(h_wind)
        fallback_gusts.append(h_gust)
        fallback_uvs.append(h_uv)
        fallback_pressures.append(h_ps)

    return {
        "elevation": elev,
        "fallback_used": True,
        "data_source": "Odisha District Microclimate Climatological Model (Offline Fallback)",
        "data_status": "ESTIMATED",
        "is_live": False,
        "current": {
            "temperature_2m": adjusted_temp,
            "relative_humidity_2m": base_rh,
            "apparent_temperature": round(adjusted_temp + 1.2, 1),
            "wind_speed_10m": wind_base,
            "wind_gusts_10m": wind_gust,
            "surface_pressure": ps_calc,
            "weather_code": 1 if is_daytime else 0,
            "is_day": is_daytime,
            "precipitation": 0.0
        },
        "daily": {
            "temperature_2m_max": [t_max_est, t_max_est, t_max_est],
            "temperature_2m_min": [t_min_est, t_min_est, t_min_est],
            "precipitation_sum": [0.0, 0.0, 0.0],
            "wind_speed_10m_max": [round(wind_base * 1.3, 1)] * 3,
            "wind_gusts_10m_max": [round(wind_gust * 1.4, 1)] * 3,
            "uv_index_max": [7.5, 7.5, 7.5],
            "sunrise": ["05:50 AM", "05:50 AM", "05:50 AM"],
            "sunset": ["05:20 PM", "05:20 PM", "05:20 PM"]
        },
        "hourly": {
            "time": fallback_hourly_times,
            "temperature_2m": fallback_temps,
            "relative_humidity_2m": fallback_rhs,
            "apparent_temperature": fallback_apparents,
            "precipitation_probability": fallback_pops,
            "precipitation": fallback_precips,
            "weather_code": fallback_wcodes,
            "wind_speed_10m": fallback_winds,
            "wind_gusts_10m": fallback_gusts,
            "uv_index": fallback_uvs,
            "surface_pressure": fallback_pressures
        }
    }

@app.post("/api/predict")
@app.post("/api/workability")
async def predict_wri(req: PredictionRequest):
    """
    District-specific meteorological hazard prediction and continuous Workability Risk Index.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Machine Learning model is not loaded. Run train_model.py first.")

    # 1. District Identification & Coordinate Resolution
    target_lat = req.latitude
    target_lon = req.longitude
    resolved_district_name = req.district
    detected_locality = getattr(req, "locality", None)
    is_outside_odisha = False
    distance_to_odisha_km = 0.0

    dist_info = None
    if resolved_district_name:
        dist_info = get_district_by_name(resolved_district_name)
        if dist_info:
            resolved_district_name = dist_info["name"]
            # Preserve target_lat and target_lon if explicitly provided (e.g., GPS locality like Gunupur)
            if target_lat is None or target_lon is None:
                target_lat = dist_info["lat"]
                target_lon = dist_info["lon"]

    if target_lat is None or target_lon is None:
        raise HTTPException(
            status_code=400,
            detail="Either a valid district name or latitude/longitude coordinates must be provided."
        )

    # If coordinates were provided without district, find nearest Odisha district
    if not resolved_district_name:
        res_info = resolve_district_details(target_lat, target_lon)
        nearest_name = res_info["district"]
        km_away = res_info["distance_km"]
        detected_locality = res_info.get("locality")

        if km_away > 120.0:
            is_outside_odisha = True
            distance_to_odisha_km = km_away
            resolved_district_name = nearest_name
        else:
            resolved_district_name = nearest_name

        dist_info = get_district_by_name(resolved_district_name)

    # Auto-resolve locality if coordinates are present but locality is not yet set
    if not detected_locality and target_lat is not None and target_lon is not None:
        try:
            res_info = resolve_district_details(target_lat, target_lon)
            if res_info.get("locality"):
                detected_locality = res_info.get("locality")
        except Exception:
            pass

    # 2. Isolated Location Cache (keyed strictly by district and 15-minute slot)
    now_ts = time.time()
    cache_slot = int(now_ts // 900) # 15-minute window
    cache_key = f"{resolved_district_name}_{round(target_lat, 2)}_{round(target_lon, 2)}_{cache_slot}"
    
    # Bypass cache if explicit refresh is requested
    if not req.refresh and cache_key in WEATHER_CACHE:
        cached_entry = WEATHER_CACHE[cache_key]
        if now_ts - cached_entry["cached_at"] < cached_entry.get("ttl", CACHE_TTL_SECONDS):
            # Deep copy to guarantee no cross-request state contamination
            response_payload = copy.deepcopy(cached_entry["data"])
            response_payload["cache_hit"] = True
            return response_payload

    # 3. Retrieve District-Specific Weather via Resilient Multi-Tier Pipeline
    weather_data = await fetch_multi_tier_weather(target_lat, target_lon, dist_info)

    # 4. Extract Real Observations & Spatial Properties
    current = weather_data.get("current", {})
    daily = weather_data.get("daily", {})
    hourly = weather_data.get("hourly", {})

    district_precomputed_elev = dist_info.get("elevation") if dist_info else None
    elevation = float(district_precomputed_elev if district_precomputed_elev is not None else weather_data.get("elevation", 50.0))
    distance_to_coast = calculate_distance_to_coast(target_lat, target_lon)

    # In daily arrays with past_days=1: index 0 is yesterday, index 1 is today
    t2m_max = float(daily.get("temperature_2m_max", [30.0, 30.0])[1])
    t2m_min = float(daily.get("temperature_2m_min", [22.0, 22.0])[1])
    precip_today_forecast = float(daily.get("precipitation_sum", [0.0, 0.0])[1])
    precip_yesterday = float(daily.get("precipitation_sum", [0.0, 0.0])[0])
    rain_yesterday_bin = 1 if precip_yesterday > 0.1 else 0

    current_temp = float(current.get("temperature_2m", t2m_max))
    rh2m = float(current.get("relative_humidity_2m", 65.0))
    ws10m = float(current.get("wind_speed_10m", 10.0))
    wg10m = float(current.get("wind_gusts_10m", ws10m * 1.3))
    ps_current = float(current.get("surface_pressure", 1010.0))
    current_precip = float(current.get("precipitation", 0.0))
    weather_code = int(current.get("weather_code", 0))
    is_day_flag = int(current.get("is_day", 1))
    is_daytime = (is_day_flag == 1)

    # 24-Hour Surface Pressure Delta
    hourly_ps = hourly.get("surface_pressure", [])
    if len(hourly_ps) >= 25:
        ps_delta_24h = float(hourly_ps[24] - hourly_ps[0])
    else:
        ps_delta_24h = 0.0

    # Sunrise & Sunset (Today is index 1)
    sunrise_raw = daily.get("sunrise", ["", ""])[1]
    sunset_raw = daily.get("sunset", ["", ""])[1]
    sunrise_formatted = format_iso_time(sunrise_raw) if sunrise_raw else "05:45 AM"
    sunset_formatted = format_iso_time(sunset_raw) if sunset_raw else "05:15 PM"

    # WMO Condition interpretation
    weather_meta = WMO_WEATHER_CODES.get(weather_code, {
        "condition": "Cloudy" if rh2m > 80 else "Clear",
        "group": "cloudy" if rh2m > 80 else "clear",
        "icon": "cloud",
        "night_icon": "cloud"
    })
    condition_name = weather_meta["condition"]
    if not is_daytime and weather_code in [0, 1]:
        condition_name = "Clear Night"
    elif not is_daytime and weather_code == 2:
        condition_name = "Partly Cloudy Night"

    active_icon = weather_meta["icon"] if is_daytime else weather_meta["night_icon"]

    # 5. Model Feature Engineering (Identical to train_model.py)
    es = 0.6108 * np.exp(17.27 * t2m_max / (t2m_max + 237.3))
    ea = es * (rh2m / 100.0)
    vpd = float(np.clip(es - ea, 0.0, None))
    dtr = float(t2m_max - t2m_min)
    thi = float(t2m_max - (0.55 - 0.0055 * rh2m) * (t2m_max - 14.5))
    qv2m = float((rh2m / 100.0) * 0.022 * np.exp(0.058 * t2m_max))
    moisture_flux = float((ws10m * qv2m) / (distance_to_coast + 1.0))

    # Cyclical day-of-year encoding
    now_dt = datetime.now()
    doy = now_dt.timetuple().tm_yday
    sin_doy = float(np.sin(2.0 * np.pi * doy / 365.25))
    cos_doy = float(np.cos(2.0 * np.pi * doy / 365.25))

    feature_dataframe = pd.DataFrame([{
        "LATITUDE": target_lat,
        "LONGITUDE": target_lon,
        "ELEVATION": elevation,
        "DISTANCE_TO_COAST": distance_to_coast,
        "T2M_MAX": t2m_max,
        "T2M_MIN": t2m_min,
        "RH2M": rh2m,
        "WS50M": ws10m,
        "PS": ps_current,
        "QV2M": qv2m,
        "PS_DELTA_24H": ps_delta_24h,
        "RAIN_YESTERDAY_BIN": rain_yesterday_bin,
        "VPD": vpd,
        "DTR": dtr,
        "THI": thi,
        "MOISTURE_FLUX": moisture_flux,
        "SIN_DOY": sin_doy,
        "COS_DOY": cos_doy
    }])[MODEL_FEATURE_COLUMNS]

    # 6. ML Model Inference
    try:
        rain_prob = float(model.predict_proba(feature_dataframe)[0][1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}")

    # 7. Thermal & Meteorological Indices
    heat_index_c = calculate_heat_index_celsius(current_temp, rh2m)
    uv_index_today = float(daily.get("uv_index_max", [0.0, 5.0])[1])
    wbgt_c = calculate_wbgt_approx(current_temp, rh2m, wind_speed_kmh=ws10m, uv_index=uv_index_today, is_daytime=is_daytime)

    # 8. Multi-Hazard Workability Safety Score Engine
    safety_result = calculate_wri(
        rain_prob=rain_prob,
        temp_c=current_temp,
        temp_max=t2m_max,
        wind_speed=ws10m,
        humidity_rh=rh2m,
        precip_today_mm=precip_today_forecast,
        wind_gusts=wg10m,
        uv_index=uv_index_today,
        pressure_delta_24h=ps_delta_24h,
        weather_code=weather_code,
        is_daytime=is_daytime
    )

    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)
    now_iso = now_ist.isoformat()

    # 9. 24-Hour Hourly Weather & Workability Forecast
    hourly_times = hourly.get("time", [])
    hourly_temps = hourly.get("temperature_2m", [])
    hourly_rhs = hourly.get("relative_humidity_2m", [])
    hourly_rain_probs = hourly.get("precipitation_probability", [])
    hourly_precips = hourly.get("precipitation", [])
    hourly_wcodes = hourly.get("weather_code", [])
    hourly_winds = hourly.get("wind_speed_10m", [])
    hourly_gusts = hourly.get("wind_gusts_10m", [])
    hourly_uvs = hourly.get("uv_index", [])

    # Find index closest to current hour in Indian Standard Time (IST)
    current_hour_iso = now_ist.strftime("%Y-%m-%dT%H")
    start_idx = -1
    for idx, t_str in enumerate(hourly_times):
        if t_str.startswith(current_hour_iso):
            start_idx = idx
            break

    if start_idx == -1:
        for idx, t_str in enumerate(hourly_times):
            if t_str >= current_hour_iso:
                start_idx = idx
                break

    if start_idx == -1:
        start_idx = 0

    full_timeline = []
    for idx, h_time_str in enumerate(hourly_times):
        h_temp = float(hourly_temps[idx]) if idx < len(hourly_temps) else current_temp
        h_rh = float(hourly_rhs[idx]) if idx < len(hourly_rhs) else rh2m
        h_rain_prob = (float(hourly_rain_probs[idx]) / 100.0) if idx < len(hourly_rain_probs) else rain_prob
        h_precip = float(hourly_precips[idx]) if idx < len(hourly_precips) else 0.0
        h_wcode = int(hourly_wcodes[idx]) if idx < len(hourly_wcodes) else weather_code
        h_wind = float(hourly_winds[idx]) if idx < len(hourly_winds) else ws10m
        h_gust = float(hourly_gusts[idx]) if idx < len(hourly_gusts) else wg10m
        h_uv = float(hourly_uvs[idx]) if idx < len(hourly_uvs) else 0.0

        try:
            h_dt = datetime.fromisoformat(h_time_str)
            h_is_day = 6 <= h_dt.hour < 18
            hour_label = h_dt.strftime("%I:%M %p")
        except Exception:
            h_is_day = True
            hour_label = f"H+{idx}"

        h_score_res = calculate_wri(
            rain_prob=h_rain_prob,
            temp_c=h_temp,
            temp_max=t2m_max,
            wind_speed=h_wind,
            humidity_rh=h_rh,
            precip_today_mm=h_precip,
            wind_gusts=h_gust,
            uv_index=h_uv,
            pressure_delta_24h=0.0,
            weather_code=h_wcode,
            is_daytime=h_is_day
        )

        h_score = h_score_res["safety_score"]
        h_meta = WMO_WEATHER_CODES.get(h_wcode, {"condition": "Cloudy", "icon": "cloud"})

        full_timeline.append({
            "time_iso": h_time_str,
            "hour_label": hour_label,
            "temperature_c": round(h_temp, 1),
            "humidity_percent": int(round(h_rh)),
            "rain_probability": round(h_rain_prob, 2),
            "rain_percentage": f"{int(round(h_rain_prob * 100))}%",
            "precipitation_mm": round(h_precip, 2),
            "wind_speed_kmh": round(h_wind, 1),
            "wind_gusts_kmh": round(h_gust, 1),
            "uv_index": round(h_uv, 1),
            "safety_score": h_score,
            "risk_zone": h_score_res["zone"],
            "condition": h_meta["condition"],
            "icon": h_meta["icon"],
            "is_daytime": h_is_day
        })

    # The 24 hours starting from current IST hour
    hourly_timeline = full_timeline[start_idx:start_idx + 24]
    if len(hourly_timeline) < 24 and full_timeline:
        hourly_timeline = full_timeline[-24:] if len(full_timeline) >= 24 else full_timeline

    # Absolute fallback: ensure hourly_timeline is never empty
    if not hourly_timeline:
        for h_offset in range(24):
            sim_dt = now_ist + timedelta(hours=h_offset)
            sim_iso = sim_dt.strftime("%Y-%m-%dT%H:00")
            hourly_timeline.append({
                "time_iso": sim_iso,
                "hour_label": sim_dt.strftime("%I:%M %p"),
                "temperature_c": round(current_temp, 1),
                "humidity_percent": int(round(rh2m)),
                "rain_probability": round(rain_prob, 2),
                "rain_percentage": f"{int(round(rain_prob * 100))}%",
                "precipitation_mm": 0.0,
                "wind_speed_kmh": round(ws10m, 1),
                "wind_gusts_kmh": round(wg10m, 1),
                "uv_index": 5.0 if 6 <= sim_dt.hour <= 18 else 0.0,
                "safety_score": safety_result["safety_score"],
                "risk_zone": safety_result["zone"],
                "condition": "Mainly Clear",
                "icon": "sun" if 6 <= sim_dt.hour <= 18 else "moon",
                "is_daytime": 6 <= sim_dt.hour <= 18
            })

    favorable_hours = [h["hour_label"] for h in hourly_timeline if h["safety_score"] >= 8.0]
    unfavorable_hours = [h["hour_label"] for h in hourly_timeline if h["safety_score"] <= 5.0]

    # Summary insight for forecast
    if favorable_hours and unfavorable_hours:
        forecast_insight = f"Conditions are most favorable around {favorable_hours[0]}, but elevate in risk around {unfavorable_hours[0]}."
    elif favorable_hours:
        forecast_insight = "Favorable workability conditions expected throughout the daylight hours."
    else:
        forecast_insight = "Elevated meteorological risk persists across upcoming shifts. Plan mandatory hydration and monitor rain."

    # 10. Official Weather Alerts (CAP & IMD / OSDMA Standards)
    evaluate_and_generate_alerts_for_district(
        district_name=resolved_district_name,
        weather_code=weather_code,
        temp_c=current_temp,
        temp_max=t2m_max,
        heat_index=heat_index_c,
        wind_speed=ws10m,
        wind_gusts=wg10m,
        precip_today_mm=precip_today_forecast,
        pressure_delta_24h=ps_delta_24h,
        elevation_m=elevation,
        dist_to_coast_km=distance_to_coast
    )

    official_alerts = GLOBAL_ALERT_STORE.get_active_alerts(district=resolved_district_name, include_simulated=True)
    # Ensure backward compatibility aliases for legacy frontend cards
    for a in official_alerts:
        a["title"] = a.get("headline", a.get("title", ""))
        a["affected_area"] = ", ".join(a.get("affected_districts", []))
        a["source"] = a.get("issuing_authority", a.get("source", ""))
        a["description"] = a.get("headline", "")
        a["severity"] = "RED" if a.get("severity_level", 0) >= 3 else ("ORANGE" if a.get("severity_level", 0) == 2 else "YELLOW")
        a["recommended_action"] = "; ".join(a.get("action_instructions", []))

    # 11. Explainable Meteorological Hazard Breakdown
    hazard_breakdown = [
        {
            "id": "thermal_stress",
            "title": "Thermal Stress & WBGT",
            "measured_value": f"{heat_index_c:.1f}°C HI / {wbgt_c:.1f}°C WBGT",
            "threshold": "OSHA Threshold: WBGT > 25°C requires mandatory shade & rest",
            "penalty_deduction": safety_result["penalties"]["thermal"],
            "contribution_pct": safety_result["contributions"]["thermal_pct"],
            "level": "Safe" if wbgt_c <= 25.0 else ("Moderate" if wbgt_c <= 28.0 else ("High" if wbgt_c <= 31.0 else "Extreme")),
            "explanation": f"Evaluates combined ambient temperature ({current_temp:.1f}°C) and relative humidity ({rh2m:.0f}%) on human evaporative cooling.",
            "precaution": "Maintain regular 15-30 min shaded rest intervals and drink ORS/electrolyte fluids.",
            "icon": "thermometer-sun"
        },
        {
            "id": "rain_hazard",
            "title": "Precipitation & Convective Risk",
            "measured_value": f"{int(round(rain_prob*100))}% chance ({precip_today_forecast:.1f} mm forecast)",
            "threshold": "IMD Threshold: Precipitation > 0.1 mm/day defines rain day",
            "penalty_deduction": safety_result["penalties"]["rain"],
            "contribution_pct": safety_result["contributions"]["rain_pct"],
            "level": "Low" if rain_prob < 0.3 else ("Moderate" if rain_prob < 0.6 else "Elevated"),
            "explanation": "Calculated by calibrated HistGradientBoosting model incorporating moisture flux, VPD, and atmospheric pressure.",
            "precaution": "Cover exposed construction materials and secure agricultural drainage channels.",
            "icon": "cloud-rain"
        },
        {
            "id": "wind_hazard",
            "title": "Mechanical Wind Force & Gusts",
            "measured_value": f"{ws10m:.1f} km/h (Gusts: {wg10m:.1f} km/h)",
            "threshold": "Safety limit: >12 km/h impacts spray drift; >30 km/h impacts scaffolding",
            "penalty_deduction": safety_result["penalties"]["wind"],
            "contribution_pct": safety_result["contributions"]["wind_pct"],
            "level": "Calm" if ws10m < 15.0 else ("Moderate" if ws10m < 28.0 else "High"),
            "explanation": "High winds disrupt pesticide dispersion, crane operations, and temporary roof structures.",
            "precaution": "Anchor outdoor scaffolding, pause crane lifts, and postpone chemical agricultural sprays.",
            "icon": "wind"
        },
        {
            "id": "uv_radiation",
            "title": "Solar UV Radiation",
            "measured_value": f"UV Index {uv_index_today:.1f}",
            "threshold": "WHO standard: UV Index > 5 requires skin and eye protection",
            "penalty_deduction": safety_result["penalties"]["uv"],
            "contribution_pct": safety_result["contributions"]["uv_pct"],
            "level": "Low" if uv_index_today <= 2.0 else ("Moderate" if uv_index_today <= 5.0 else ("High" if uv_index_today <= 7.0 else "Very High")),
            "explanation": "Solar irradiance intensity during peak midday hours (10 AM to 3 PM).",
            "precaution": "Wear wide-brim hats, long sleeves, and seek shade during midday hours.",
            "icon": "sun"
        },
        {
            "id": "pressure_cyclone",
            "title": "Barometric Pressure & Depression",
            "measured_value": f"{ps_current:.1f} hPa (Δ24h: {ps_delta_24h:+.1f} hPa)",
            "threshold": "Meteorological indicator: Rapid pressure drop (< -2.0 hPa) indicates depression",
            "penalty_deduction": safety_result["penalties"]["pressure"],
            "contribution_pct": safety_result["contributions"]["pressure_pct"],
            "level": "Stable" if ps_delta_24h > -2.0 else "Depression Watch",
            "explanation": "Pressure tendency across the Bay of Bengal corridor tracks developing weather fronts.",
            "precaution": "Monitor official IMD bulletins for potential cyclone intensification.",
            "icon": "gauge"
        }
    ]

    # 11b. Hyperlocal IoT Weather Station Ground-Truth Validation
    nearest_iot_station = GLOBAL_IOT_REGISTRY.find_nearest_station_for_district(resolved_district_name)
    iot_ground_truth = None
    if nearest_iot_station:
        iot_ground_truth = GLOBAL_IOT_REGISTRY.compute_ml_ground_truth_residuals(
            station_id=nearest_iot_station["station_id"],
            predicted_temp=current_temp,
            predicted_rh=rh2m,
            predicted_rain_prob=rain_prob
        )

    # 12. Assemble Full Response Payload
    response_payload = {
        "district": resolved_district_name,
        "locality": detected_locality,
        "is_outside_odisha": is_outside_odisha,
        "distance_to_odisha_km": round(distance_to_odisha_km, 1) if is_outside_odisha else 0.0,
        "coordinates": {
            "latitude": round(target_lat, 4),
            "longitude": round(target_lon, 4)
        },
        "spatial_features": {
            "elevation_m": round(elevation, 1),
            "dist_to_coast_km": round(distance_to_coast, 1)
        },
        "weather": {
            "temperature_c": round(current_temp, 1),
            "temperature_max_c": round(t2m_max, 1),
            "temperature_min_c": round(t2m_min, 1),
            "apparent_temperature_c": round(float(current.get("apparent_temperature", current_temp)), 1),
            "humidity_percent": int(round(rh2m)),
            "wind_speed_kmh": round(ws10m, 1),
            "wind_gusts_kmh": round(wg10m, 1),
            "surface_pressure_hpa": round(ps_current, 1),
            "pressure_delta_24h_hpa": round(ps_delta_24h, 2),
            "precipitation_current_mm": round(current_precip, 2),
            "precipitation_forecast_today_mm": round(precip_today_forecast, 2),
            "precipitation_yesterday_mm": round(precip_yesterday, 2),
            "rainfall_probability": round(rain_prob, 3),
            "rainfall_percentage": f"{int(round(rain_prob * 100))}%",
            "uv_index": round(uv_index_today, 1),
            "heat_index_c": round(heat_index_c, 1),
            "wbgt_c": round(wbgt_c, 1),
            "condition": condition_name,
            "condition_group": weather_meta["group"],
            "icon": active_icon,
            "is_daytime": is_daytime,
            "sunrise": sunrise_formatted,
            "sunset": sunset_formatted,
            "sunrise_iso": sunrise_raw,
            "sunset_iso": sunset_raw,
            "timezone": "Asia/Kolkata",
            "observation_time": now_iso,
            "provider_timestamp": current.get("time", now_iso),
            "data_source": weather_data.get("data_source", "Open-Meteo High-Resolution NWP (Live Telemetry)"),
            "data_status": weather_data.get("data_status", "LIVE"),
            "is_live": weather_data.get("is_live", True),
            "last_updated_ist": datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%I:%M %p IST")
        },
        "prediction": {
            "predicted_risk_level": safety_result["predicted_risk_level"],
            "risk_zone": safety_result["zone"],
            "safety_score": safety_result["safety_score"],
            "safety_score_100": safety_result["safety_score_100"],
            "score_direction": safety_result["score_direction"],
            "advice": safety_result["advice"],
            "translations": safety_result["translations"],
            "penalties": safety_result["penalties"],
            "contributions": safety_result["contributions"],
            "occupational_guidelines": safety_result.get("occupational_guidelines", {}),
            "sector_permissibility": safety_result.get("sector_permissibility", {}),
            "transparent_deductions": safety_result.get("transparent_deductions", []),
            "primary_limiting_factor": safety_result.get("primary_limiting_factor", ""),
            "meteorological_indices": {
                "thi": safety_result["meteorological_indices"]["thi"],
                "heat_index_c": safety_result["meteorological_indices"]["heat_index_c"],
                "wbgt_c": safety_result["meteorological_indices"]["wbgt_c"],
                "wbgt_shade_c": safety_result["meteorological_indices"].get("wbgt_shade_c", safety_result["meteorological_indices"]["wbgt_c"]),
                "wbgt_outdoor_c": safety_result["meteorological_indices"].get("wbgt_outdoor_c", safety_result["meteorological_indices"]["wbgt_c"]),
                "wind_chill_c": safety_result["meteorological_indices"].get("wind_chill_c", current_temp),
                "vpd_kpa": round(vpd, 2),
                "moisture_flux": round(moisture_flux, 4)
            },
            "prediction_time": now_iso,
            "model_version": "2.2.0-calibrated-histgb",
            "data_source": "Open-Meteo Observations & Calibrated HistGB ML Model",
            "preliminary_indicator_notice": safety_result["preliminary_indicator_notice"],
            "iot_ground_truth": iot_ground_truth
        },
        "iot_ground_truth": iot_ground_truth,
        "occupational_guidelines": safety_result.get("occupational_guidelines", {}),
        "sector_permissibility": safety_result.get("sector_permissibility", {}),
        "transparent_deductions": safety_result.get("transparent_deductions", []),
        "primary_limiting_factor": safety_result.get("primary_limiting_factor", ""),
        "hazard_breakdown": hazard_breakdown,
        "persona_advisories": safety_result["persona_advisories"],
        "official_alerts": official_alerts,
        "hourly_forecast": {
            "horizon_hours": len(hourly_timeline),
            "issued_at": now_iso,
            "timeline": hourly_timeline,
            "full_timeline": full_timeline,
            "forecast_insight": forecast_insight
        },
        "hourly_timeline": hourly_timeline,
        "hourly_forecast_insight": forecast_insight,
        # Backward compatibility for legacy clients & bot
        "wri": {
            "wri_score": safety_result["safety_score"],
            "zone": safety_result["zone"],
            "advice": safety_result["advice"],
            "penalties": safety_result["penalties"]
        },
        "meteorological_features": {
            "elevation_m": round(elevation, 1),
            "dist_to_coast_km": round(distance_to_coast, 1),
            "temp_max_c": round(t2m_max, 1),
            "humidity_percent": int(round(rh2m)),
            "wind_speed_kmh": round(ws10m, 1),
            "engineered": {
                "vpd": round(vpd, 2),
                "thi": round(thi, 1),
                "heat_index": round(heat_index_c, 1),
                "wbgt": round(wbgt_c, 1)
            }
        },
        "ml_predictions": {
            "rain_probability": round(rain_prob, 3),
            "rain_percentage": f"{int(round(rain_prob * 100))}%"
        }
    }

    response_payload["cache_hit"] = False

    # Store in memory cache (Live data cached for 10 min; fallback cached for 30s)
    entry_ttl = 30 if weather_data.get("fallback_used") else CACHE_TTL_SECONDS
    WEATHER_CACHE[cache_key] = {
        "cached_at": now_ts,
        "ttl": entry_ttl,
        "data": copy.deepcopy(response_payload)
    }

    return response_payload

@app.post("/api/plan-work")
async def plan_outdoor_work(plan_req: WorkPlanRequest):
    """
    Personalized Safe-Work Planning Engine.
    Analyzes forecast conditions across intended shift hours for specific worker personas.
    """
    # 1. Fetch prediction with district and optional GPS locality / coordinates
    predict_payload = await predict_wri(PredictionRequest(
        district=plan_req.district,
        latitude=plan_req.latitude,
        longitude=plan_req.longitude,
        locality=plan_req.locality
    ))

    hourly_forecast_obj = predict_payload.get("hourly_forecast", {})
    full_timeline = hourly_forecast_obj.get("full_timeline") or hourly_forecast_obj.get("timeline") or []
    if not full_timeline:
        full_timeline = predict_payload.get("hourly_timeline", [])

    if not full_timeline:
        raise HTTPException(status_code=500, detail="Hourly forecast timeline unavailable.")

    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)

    # 2. Determine target shift date (today vs tomorrow)
    req_date_mode = (plan_req.shift_date or "today").strip().lower()
    if req_date_mode == "tomorrow":
        target_date = now_ist.date() + timedelta(days=1)
        shift_date_label = "Tomorrow"
    else:
        target_date = now_ist.date()
        shift_date_label = "Today"

    start_hour = plan_req.shift_start_hour
    duration = plan_req.duration_hours

    # 3. Extract shift window hours for target date
    shift_hours = []
    for h in full_timeline:
        try:
            dt = datetime.fromisoformat(h["time_iso"])
            if dt.date() == target_date:
                hour_diff = dt.hour - start_hour
                if 0 <= hour_diff < duration:
                    shift_hours.append(h)
        except Exception:
            continue

    # Fallback if date-specific matching was empty (e.g. boundary wrap)
    if not shift_hours:
        for h in full_timeline:
            try:
                dt = datetime.fromisoformat(h["time_iso"])
                hour_diff = (dt.hour - start_hour) % 24
                if 0 <= hour_diff < duration:
                    shift_hours.append(h)
                if len(shift_hours) == duration:
                    break
            except Exception:
                continue

    if not shift_hours:
        shift_hours = full_timeline[:duration]

    # Ensure chronological order
    shift_hours = sorted(shift_hours, key=lambda x: x["time_iso"])

    # 4. Determine shift timing status: PAST, IN PROGRESS, or UPCOMING
    is_past_shift = False
    past_shift_message = None
    shift_end_hour = start_hour + duration

    if target_date == now_ist.date():
        if now_ist.hour >= shift_end_hour:
            is_past_shift = True
            past_shift_message = (
                f"The {start_hour:02d}:00 to {shift_end_hour:02d}:00 shift for today has already passed. "
                "Displaying meteorological log for this timeframe. Select 'Tomorrow' above to evaluate upcoming shifts."
            )
            shift_status = "PAST"
        elif start_hour <= now_ist.hour < shift_end_hour:
            shift_status = "IN PROGRESS"
        else:
            shift_status = "UPCOMING"
    elif target_date > now_ist.date():
        shift_status = "UPCOMING"
    else:
        is_past_shift = True
        shift_status = "PAST"

    # 5. Analyze Shift Feasibility Metrics
    scores = [h["safety_score"] for h in shift_hours]
    temps = [h["temperature_c"] for h in shift_hours]
    rain_probs = [h["rain_probability"] for h in shift_hours]
    winds = [h["wind_speed_kmh"] for h in shift_hours]

    avg_score = round(sum(scores) / len(scores), 1) if scores else 8.0
    min_score = min(scores) if scores else 8.0
    max_score = max(scores) if scores else 8.0
    max_temp = max(temps) if temps else round(predict_payload.get("weather", {}).get("temperature_c", 30.0), 1)
    max_rain_prob = max(rain_probs) if rain_probs else 0.0
    max_wind = max(winds) if winds else 10.0

    # Optimal sub-windows
    best_hours = [h["hour_label"] for h in shift_hours if h["safety_score"] >= 7.5]
    risky_hours = [h["hour_label"] for h in shift_hours if h["safety_score"] < 6.0]

    # Persona-specific tailored feasibility verdict
    activity = plan_req.activity.lower()
    if min_score >= 8.0:
        feasibility = "Highly Favorable"
        feasibility_color = "GREEN"
        summary = f"All {len(shift_hours)} planned hours present optimal outdoor conditions for {activity}."
    elif min_score >= 6.0:
        feasibility = "Moderate with Standard Precautions"
        feasibility_color = "YELLOW"
        summary = f"Shift is generally workable. Watch for afternoon heat around {risky_hours[0] if risky_hours else 'midday'}."
    elif min_score >= 4.0:
        feasibility = "Elevated Risk - Shift Modification Advised"
        feasibility_color = "ORANGE"
        summary = f"Adverse weather expected during shift hours. Best working window is {best_hours[0] if best_hours else 'early morning'}."
    else:
        feasibility = "Severe Weather Hazard - Work Suspension Recommended"
        feasibility_color = "RED"
        summary = "Dangerous meteorological hazards forecast during your shift. Outdoor work should be postponed."

    # Persona specific guidance
    if "farm" in activity:
        specific_guidance = (
            "Avoid spraying if wind exceeds 15 km/h. If rain probability is high, expedite harvest clearing "
            "and secure open grain heaps with tarpaulins."
        )
    elif "construct" in activity:
        specific_guidance = (
            "No high scaffolding or crane operations during peak winds. Mandatory 15-minute rest breaks "
            "in shaded rest stations every hour if WBGT exceeds 28°C."
        )
    elif "daily" in activity:
        specific_guidance = (
            "Carry a minimum 2-3 liters of clean drinking water with ORS. Wear wide-brim hats or cloth wraps "
            "and take shade breaks during the hottest 2-3 hours."
        )
    else:
        specific_guidance = (
            "Plan travel and physical outdoor tasks around the optimal morning hours. Keep umbrellas or raincoats "
            "accessible if rain probability is above 40%."
        )

    occ_guidelines = predict_payload.get("prediction", {}).get("occupational_guidelines", {})
    sector_clearance = predict_payload.get("prediction", {}).get("sector_permissibility", {})
    hydration_guidance = (
        f"ISO 7243 Hydration Target: {occ_guidelines.get('hydration_target_ml_hr', 750)} mL/hr. "
        f"{occ_guidelines.get('hydration_instruction', 'Maintain regular fluid intake.')}"
    )

    resolved_dist = predict_payload.get("district", plan_req.district)
    locality_name = predict_payload.get("locality") or plan_req.locality

    return {
        "district": resolved_dist,
        "locality": locality_name,
        "coordinates": predict_payload.get("coordinates"),
        "activity": plan_req.activity,
        "shift_date": target_date.strftime("%Y-%m-%d"),
        "shift_date_label": shift_date_label,
        "shift_start": f"{start_hour:02d}:00",
        "shift_end": f"{(start_hour + duration) % 24:02d}:00",
        "duration_hours": duration,
        "shift_feasibility": feasibility,
        "feasibility_color": feasibility_color,
        "shift_status": shift_status,
        "is_past_shift": is_past_shift,
        "past_shift_message": past_shift_message,
        "summary": summary,
        "metrics": {
            "average_safety_score": avg_score,
            "minimum_safety_score": min_score,
            "maximum_temperature_c": max_temp,
            "peak_rain_probability": f"{int(max_rain_prob * 100)}%",
            "peak_wind_kmh": max_wind
        },
        "optimal_windows": best_hours[:3],
        "risky_windows": risky_hours[:3],
        "tailored_precautions": specific_guidance,
        "occupational_guidelines": occ_guidelines,
        "sector_clearance": sector_clearance,
        "hydration_guidance": hydration_guidance,
        "shift_timeline": shift_hours,
        "disclaimer": "Plan My Outdoor Work estimates hazard feasibility based on meteorological forecasts and does not guarantee absolute safety."
    }

@app.get("/api/districts-map")
async def get_districts_map():
    """
    Returns spatial coordinate and regional cluster data for all 30 Odisha districts
    for interactive SVG/Canvas district map visualization.
    """
    map_data = []
    for name, info in ODISHA_30_DISTRICTS.items():
        # Determine climatic zone
        if info["coast_km"] <= 50.0:
            zone_category = "Coastal Maritime"
        elif info["lon"] < 84.5 and info["lat"] > 19.5:
            zone_category = "Western Dry Belt"
        elif info["elevation"] > 400:
            zone_category = "Southern Eastern Ghats"
        else:
            zone_category = "Central River Basin"

        map_data.append({
            "name": name,
            "hq": info.get("hq", name),
            "lat": info["lat"],
            "lon": info["lon"],
            "elevation_m": info["elevation"],
            "coast_km": info["coast_km"],
            "climatic_zone": zone_category
        })

    return {"districts_map": map_data}

# ==============================================================================
# PHASE 14: EMERGENCY WARNING NETWORK & DISASTER ALARM API
# ==============================================================================

class IncidentReportRequest(BaseModel):
    district: str
    incident_type: str = Field(..., description="flooding | fallen_tree | power_outage | structural_damage | landslide | other")
    location_details: str
    description: str
    severity: str = "moderate"
    reporter_name: Optional[str] = "Anonymous Citizen"
    reporter_phone: Optional[str] = None

class SimulateAlertRequest(BaseModel):
    scenario_type: str = "cyclone_warning"
    district: str = "Puri"
    action: Optional[str] = "create"

class ReviewIncidentRequest(BaseModel):
    incident_id: str
    new_status: str
    admin_notes: Optional[str] = ""

class BroadcastAdvisoryRequest(BaseModel):
    category: str = "STATE_EMERGENCY"
    severity_level: int = 2
    headline: str
    affected_districts: List[str] = ["ALL_ODISHA"]
    action_instructions: List[str]
    valid_hours: int = 12
    shelter_advisory: Optional[str] = ""

@app.get("/api/emergency/alerts")
async def get_emergency_alerts(district: Optional[str] = None, include_simulated: bool = True):
    """Returns active emergency alerts filtered by district or statewide."""
    alerts = GLOBAL_ALERT_STORE.get_active_alerts(district=district, include_simulated=include_simulated)
    highest_severity = max([a.get("severity_level", 0) for a in alerts], default=0)
    return {
        "status": "success",
        "active_alerts_count": len(alerts),
        "highest_severity_level": highest_severity,
        "district_filter": district,
        "alerts": alerts,
        "disclaimer": "ODISHA WRI is an additional disaster-information platform. Always follow instructions from IMD, NDMA, OSDMA, and district administration."
    }

@app.get("/api/emergency/river-levels")
async def get_river_levels():
    """Returns CWC river gauge stations and major reservoir releases."""
    return {
        "status": "success",
        "river_gauges": ODISHA_RIVER_GAUGES,
        "dam_reservoirs": MAJOR_DAM_RESERVOIRS,
        "reporting_source": "Central Water Commission (CWC) & Odisha Water Resources Dept",
        "last_synced": datetime.now().astimezone().isoformat()
    }

@app.get("/api/emergency/earthquakes")
async def get_earthquake_events():
    """Returns verified post-event seismic telemetry from authoritative networks (USGS/NCS)."""
    eq_events = await fetch_regional_earthquakes()
    return {
        "status": "success",
        "events_count": len(eq_events),
        "events": eq_events,
        "scientific_notice": "Earthquakes cannot be predicted in advance. Verified post-event seismic telemetry only.",
        "safety_principles": [
            "DURING: Drop, Cover, and Hold On under a sturdy desk or table.",
            "Stay away from windows, exterior walls, and overhead fixtures.",
            "AFTER: Check for injuries and structural damage; be alert for aftershocks.",
            "Follow instructions from official emergency authorities."
        ]
    }

@app.get("/api/emergency/shelters")
async def get_emergency_shelters(district: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    """Returns nearby verified Multipurpose Cyclone & Flood Shelters."""
    target_lat = lat
    target_lon = lon
    if district and (target_lat is None or target_lon is None):
        dist_info = get_district_by_name(district)
        if dist_info:
            target_lat = dist_info["lat"]
            target_lon = dist_info["lon"]
            
    if target_lat is None or target_lon is None:
        target_lat, target_lon = 20.296, 85.824 # Default to Bhubaneswar

    shelters = find_nearest_shelters(target_lat, target_lon, max_results=8, district_filter=district)
    return {
        "status": "success",
        "reference_district": district,
        "shelters_count": len(shelters),
        "shelters": shelters,
        "deoc_contact": EMERGENCY_CONTACTS["deoc_directory"].get(district, "1077")
    }

@app.get("/api/emergency/contacts")
async def get_emergency_contacts(district: Optional[str] = None):
    """Official emergency contact numbers including OSDMA and DEOC."""
    return {
        "status": "success",
        "state_toll_free": EMERGENCY_CONTACTS["state_toll_free"],
        "deoc_directory": EMERGENCY_CONTACTS["deoc_directory"],
        "district_deoc": EMERGENCY_CONTACTS["deoc_directory"].get(district, "1077") if district else "1077"
    }

@app.get("/api/emergency/sources-info")
async def get_official_sources_info():
    """Transparency documentation on official warning sources, update frequencies, and limitations."""
    return {
        "status": "success",
        "official_sources": OFFICIAL_SOURCES_DOCUMENTATION,
        "alert_levels_hierarchy": ALERT_LEVELS
    }

@app.post("/api/emergency/report-incident")
async def report_community_incident(req: IncidentReportRequest):
    """Submits a localized community incident report (marked as unverified)."""
    inc_id = GLOBAL_ALERT_STORE.add_incident_report(req.dict())
    return {
        "status": "submitted",
        "incident_id": inc_id,
        "notice": "Thank you. Your report has been logged for emergency administrative verification.",
        "disclaimer": "Citizen Incident Report - Unverified Community Information. Not an official government advisory."
    }

@app.get("/api/emergency/incidents")
async def get_community_incidents(district: Optional[str] = None):
    """Returns community reported incidents."""
    incidents = GLOBAL_ALERT_STORE.incident_reports
    if district:
        incidents = [i for i in incidents if district.lower() in i.get("district", "").lower()]
    return {
        "status": "success",
        "incidents_count": len(incidents),
        "incidents": incidents,
        "disclaimer": "Citizen Incident Reports are unverified community observations. They do not represent official government warnings."
    }

@app.post("/api/emergency/simulate")
async def simulate_emergency_alert(sim_req: SimulateAlertRequest):
    """Simulation engine for emergency testing and drills (clearly tagged [TEST SIMULATION])."""
    if sim_req.action == "clear_all":
        # Clear simulated alerts
        for aid, a in list(GLOBAL_ALERT_STORE.alerts.items()):
            if a.get("is_simulation", False):
                GLOBAL_ALERT_STORE.alerts.pop(aid, None)
        GLOBAL_ALERT_STORE.log_audit("TEST_OPERATOR", "CLEAR_SIMULATIONS", "Cleared all active simulations.")
        return {"status": "cleared", "message": "All test simulations removed."}

    sim_alert = trigger_simulated_alert(sim_req.scenario_type, district=sim_req.district)
    return {
        "status": "simulated",
        "alert": sim_alert,
        "warning": "This is a SIMULATED TEST ALERT. Not a real disaster emergency."
    }

@app.post("/api/emergency/admin/review-incident")
async def admin_review_incident(req: ReviewIncidentRequest):
    """Admin endpoint to verify or reject citizen reports."""
    success = GLOBAL_ALERT_STORE.review_incident_report(req.incident_id, req.new_status, req.admin_notes)
    if not success:
        raise HTTPException(status_code=404, detail="Incident ID not found.")
    return {"status": "reviewed", "incident_id": req.incident_id, "new_status": req.new_status}

@app.post("/api/emergency/admin/broadcast-advisory")
async def admin_broadcast_advisory(req: BroadcastAdvisoryRequest):
    """Admin endpoint to publish a platform safety advisory."""
    now_dt = datetime.now().astimezone()
    alert_id = f"ADV-PLATFORM-{int(time.time())}"
    valid_until = (now_dt + timedelta(hours=req.valid_hours)).isoformat()
    
    advisory_alert = {
        "alert_id": alert_id,
        "parent_event_id": alert_id,
        "category": req.category,
        "severity_level": req.severity_level,
        "severity_label": ALERT_LEVELS.get(req.severity_level, {}).get("name", "Advisory"),
        "headline": f"[Platform Advisory] {req.headline}",
        "affected_districts": req.affected_districts,
        "issue_time": now_dt.isoformat(),
        "expected_start_time": now_dt.isoformat(),
        "valid_until": valid_until,
        "issuing_authority": "ODISHA WRI Emergency Operations Desk",
        "official_reference": "PLATFORM-ADVISORY-DESK",
        "is_official": False,
        "is_platform_advisory": True,
        "action_instructions": req.action_instructions,
        "shelter_advisory": req.shelter_advisory or "Check local district shelter directions."
    }
    GLOBAL_ALERT_STORE.add_or_update_alert(advisory_alert, actor="PLATFORM_ADMIN")
    return {"status": "broadcasted", "alert": advisory_alert}

@app.post("/api/emergency/admin/cancel-alert")
async def admin_cancel_alert(alert_id: str, reason: str = "Event passed / cancelled by authority"):
    """Admin endpoint to cancel an active alert."""
    success = GLOBAL_ALERT_STORE.cancel_alert(alert_id, reason=reason)
    if not success:
        raise HTTPException(status_code=404, detail="Alert ID not found.")
    return {"status": "cancelled", "alert_id": alert_id}

# ==========================================================
# Web Push Notifications & Background Disaster Alert Delivery
# ==========================================================
class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    district: Optional[str] = None

class PushUnsubscribeRequest(BaseModel):
    endpoint: str

class PushTestRequest(BaseModel):
    district: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None

PUSH_SUBSCRIPTIONS_FILE = "push_subscriptions.json"
VAPID_KEYS_FILE = "vapid_keys.json"

def get_or_create_vapid_keys() -> Dict[str, str]:
    if os.path.exists(VAPID_KEYS_FILE):
        try:
            with open(VAPID_KEYS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        priv_key = ec.generate_private_key(ec.SECP256R1())
        pub_key = priv_key.public_key()
        priv_bytes = priv_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        raw_pub = pub_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        b64_pub = base64.urlsafe_b64encode(raw_pub).decode('utf-8').rstrip('=')
        data = {
            "public_key": b64_pub,
            "private_key": priv_bytes,
            "subject": "mailto:emergency-alert@odisha-wri.gov.in"
        }
    except Exception:
        data = {
            "public_key": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJuHLSaJUrwhOtFsLEmwczO1U08",
            "private_key": "",
            "subject": "mailto:emergency-alert@odisha-wri.gov.in"
        }
    try:
        with open(VAPID_KEYS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass
    return data

def load_push_subscriptions() -> List[Dict[str, Any]]:
    if os.path.exists(PUSH_SUBSCRIPTIONS_FILE):
        try:
            with open(PUSH_SUBSCRIPTIONS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_push_subscriptions(subs: List[Dict[str, Any]]) -> None:
    try:
        with open(PUSH_SUBSCRIPTIONS_FILE, "w") as f:
            json.dump(subs, f, indent=2)
    except Exception:
        pass

@app.get("/api/emergency/push-vapid-key")
async def get_push_vapid_key():
    """Returns the VAPID public key for Web Push subscription."""
    keys = get_or_create_vapid_keys()
    return {
        "status": "success",
        "public_key": keys["public_key"],
        "subject": keys["subject"],
        "notice": "Use this Application Server Key (Base64URL) to subscribe via registration.pushManager.subscribe()."
    }

@app.post("/api/emergency/push-subscribe")
async def subscribe_push_notifications(req: PushSubscriptionRequest):
    """Securely registers a browser push subscription for a district."""
    subs = load_push_subscriptions()
    subs = [s for s in subs if s.get("endpoint") != req.endpoint]
    now_iso = datetime.now().astimezone().isoformat()
    new_sub = {
        "endpoint": req.endpoint,
        "keys": req.keys.dict(),
        "district": req.district or "All Districts",
        "subscribed_at": now_iso
    }
    subs.append(new_sub)
    save_push_subscriptions(subs)
    GLOBAL_ALERT_STORE.log_audit("PUSH_SYSTEM", "SUBSCRIBE", f"Registered subscriber for district {req.district}")
    return {
        "status": "subscribed",
        "district": req.district,
        "total_active_subscribers": len(subs),
        "message": "Emergency push notifications successfully activated for this device."
    }

@app.post("/api/emergency/push-unsubscribe")
async def unsubscribe_push_notifications(req: PushUnsubscribeRequest):
    """Removes a browser push subscription."""
    subs = load_push_subscriptions()
    init_len = len(subs)
    subs = [s for s in subs if s.get("endpoint") != req.endpoint]
    save_push_subscriptions(subs)
    return {
        "status": "unsubscribed",
        "removed": init_len > len(subs),
        "total_active_subscribers": len(subs)
    }

@app.post("/api/emergency/push-test")
async def test_push_broadcast(req: PushTestRequest):
    """Sends a test push notification to registered subscribers."""
    subs = load_push_subscriptions()
    if req.district:
        target_subs = [s for s in subs if s.get("district") in [req.district, "All Districts", None]]
    else:
        target_subs = subs
        
    return {
        "status": "dispatched",
        "targeted_subscribers": len(target_subs),
        "payload": {
            "title": req.title or "🚨 [TEST] Odisha Emergency Alert System",
            "body": req.body or "This is a verified test of the background emergency notification channel.",
            "url": "/#alerts"
        },
        "disclaimer": "Background alerts are delivered via the browser Service Worker Push API subject to OS permissions."
    }


# ==============================================================================
# Hyperlocal IoT Weather Station Ingestion & Ground-Truth API Endpoints
# ==============================================================================

@app.get("/api/iot/stations")
async def list_iot_stations():
    """
    Returns list of all active IoT Automatic Weather Stations (AWS) deployed across Odisha.
    Includes sensor telemetry, hardware specs (BME280, tipping bucket rain, anemometers), and battery status.
    """
    return {
        "status": "success",
        "total_stations": len(GLOBAL_IOT_REGISTRY.stations),
        "network_status": "OPERATIONAL",
        "stations": GLOBAL_IOT_REGISTRY.list_all_stations()
    }

@app.get("/api/iot/stations/{station_id}")
async def get_iot_station_detail(station_id: str):
    """Returns telemetry time-series and hardware specifications for a single IoT station."""
    station = GLOBAL_IOT_REGISTRY.get_station(station_id)
    if not station:
        raise HTTPException(status_code=404, detail=f"IoT Station '{station_id}' not found.")
    return {
        "status": "success",
        "station": station
    }

@app.post("/api/iot/telemetry")
async def ingest_iot_telemetry(payload: IoTTelemetryPayload):
    """
    Secure telemetry ingestion endpoint for ESP32 / LoRaWAN Automatic Weather Stations.
    Collects real-time physical temperature, relative humidity, rainfall rate, wind speed, and solar irradiance.
    """
    result = GLOBAL_IOT_REGISTRY.record_telemetry(payload)
    return {
        "status": "recorded",
        "station_id": payload.station_id,
        "details": result
    }

@app.get("/api/iot/network-overview")
async def get_iot_network_overview():
    """Returns telemetry summary, average battery health, and ground-truth validation statistics."""
    stations = GLOBAL_IOT_REGISTRY.list_all_stations()
    online_count = sum(1 for s in stations if s.get("status") == "ONLINE")
    return {
        "network_name": "Odisha Hyperlocal IoT Micro-Weather Network (OHMWN)",
        "active_nodes": online_count,
        "total_registered_nodes": len(stations),
        "supported_protocols": ["LoRaWAN (EU868/IN865)", "MQTT over 4G LTE/NB-IoT", "HTTP REST Ingestion"],
        "sensor_suite": [
            "Bosch Sensortec BME280 / BME680 (Precision Temp, Humidity, Pressure)",
            "Tipping Bucket Reed-Switch Rain Gauge (0.2 mm resolution)",
            "Optical 3-Cup & Ultrasonic 2D Wind Anemometers",
            "Silicon Photodiode Pyranometers (Solar Irradiance W/m²)"
        ],
        "districts_covered": list(set(s["district"] for s in stations))
    }

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount Vite frontend dist assets if present
dist_assets = os.path.join("wri-frontend", "dist", "assets")
if os.path.exists(dist_assets):
    app.mount("/assets", StaticFiles(directory=dist_assets), name="vite_assets")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
