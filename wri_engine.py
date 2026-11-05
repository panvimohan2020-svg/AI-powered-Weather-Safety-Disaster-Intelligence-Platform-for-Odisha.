import math
from typing import Dict, Any, Optional, List

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two lat/lon points in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_distance_to_coast(lat: float, lon: float) -> float:
    """Calculates minimum distance to the Odisha coastline along the Bay of Bengal."""
    coast_points = [
        (19.290, 84.935), # Gopalpur
        (19.813, 85.831), # Puri
        (20.272, 86.680), # Paradip
        (20.800, 86.900), # Chandbali / Dhamra
        (21.493, 86.925), # Balasore / Chandipur
        (21.571, 87.491)  # Digha (Odisha-WB Border)
    ]
    distances = [haversine(lat, lon, cp_lat, cp_lon) for cp_lat, cp_lon in coast_points]
    return min(distances)

def calculate_heat_index_celsius(temp_c: float, humidity_rh: float) -> float:
    """
    Computes NOAA Rothfusz Heat Index in Celsius.
    Heat Index measures apparent temperature incorporating evaporative cooling resistance.
    """
    if temp_c < 26.0 or humidity_rh < 40.0:
        return temp_c

    tf = temp_c * 9.0 / 5.0 + 32.0
    rh = humidity_rh
    hi_f = (
        -42.379 + 2.04901523 * tf + 10.14333127 * rh
        - 0.22475541 * tf * rh - 0.00683783 * tf * tf
        - 0.05481717 * rh * rh + 0.00122874 * tf * tf * rh
        + 0.00085282 * tf * rh * rh - 0.00000199 * tf * tf * rh * rh
    )
    hi_c = (hi_f - 32.0) * 5.0 / 9.0
    return max(temp_c, hi_c)

def calculate_wind_chill_celsius(temp_c: float, wind_speed_kmh: float) -> float:
    """
    Computes Environment Canada / NOAA Wind Chill Temperature in Celsius.
    Relevant for winter mornings in highland Odisha (Koraput, Kandhamal, Mayurbhanj).
    Valid when temp_c <= 10.0 and wind_speed_kmh > 4.8.
    """
    if temp_c > 10.0 or wind_speed_kmh < 4.8:
        return temp_c
    v_factor = wind_speed_kmh ** 0.16
    twc = 13.12 + 0.6215 * temp_c - 11.37 * v_factor + 0.3965 * temp_c * v_factor
    return min(temp_c, twc)

def calculate_wbgt_approx(
    temp_c: float, 
    humidity_rh: float,
    wind_speed_kmh: float = 10.0,
    solar_radiation_wm2: Optional[float] = None,
    uv_index: float = 0.0,
    is_daytime: bool = True
) -> float:
    """
    Wet-Bulb Globe Temperature (WBGT) simplified approximation (Australian BOM / Stull formulation)
    augmented with direct solar radiant heating and convective wind damping (ACGIH / Liljegren formulation).
    Standard occupational metric for outdoor heat stress and mandatory rest-work cycles.
    """
    # 1. Actual vapor pressure e (hPa) via Tetens equation
    es = 6.105 * math.exp((17.27 * temp_c) / (237.7 + temp_c))
    e = (humidity_rh / 100.0) * es
    wbgt_shade = 0.567 * temp_c + 0.393 * e + 3.94

    # 2. Outdoor Solar Radiant Heating & Wind Convective Damping
    if is_daytime and (solar_radiation_wm2 is not None or uv_index > 0):
        if solar_radiation_wm2 is not None:
            solar_flux = max(0.0, solar_radiation_wm2)
        else:
            solar_flux = max(0.0, uv_index * 85.0)

        ws_ms = max(0.2, wind_speed_kmh / 3.6)
        solar_delta = (solar_flux * 0.0075) / math.sqrt(max(1.0, ws_ms))
        solar_delta = min(3.8, max(0.0, solar_delta))
        return wbgt_shade + solar_delta

    return wbgt_shade

def get_iso7243_work_rest_cycle(wbgt_c: float) -> Dict[str, Any]:
    """
    Maps effective WBGT to ISO 7243 / ACGIH heat stress work-rest regimen
    for moderate to heavy physical labor.
    """
    if wbgt_c < 25.0:
        return {
            "regime": "Continuous Outdoor Work (100% Work / 0% Rest)",
            "work_pct": 100,
            "rest_pct": 0,
            "rest_minutes_per_hour": 0,
            "work_minutes_per_hour": 60,
            "work_rest_cycle": "Continuous (No Mandatory Rest)",
            "hydration_target_ml_hr": 500,
            "hydration_instruction": "Drink ~250 mL every 30 minutes (500 mL/hr total). Standard hydration.",
            "acclimatized_advice": "Continuous outdoor manual work permitted with standard hydration breaks.",
            "unacclimatized_advice": "Allow new workers to build pace gradually over 3-5 days.",
            "severity_band": "LOW / NORMAL",
            "band_color": "emerald"
        }
    elif wbgt_c < 28.0:
        return {
            "regime": "75% Work / 25% Rest (15 min rest per hour)",
            "work_pct": 75,
            "rest_pct": 25,
            "rest_minutes_per_hour": 15,
            "work_minutes_per_hour": 45,
            "work_rest_cycle": "75% Work / 25% Rest (15 min/hr in shade)",
            "hydration_target_ml_hr": 750,
            "hydration_instruction": "Drink ~250 mL every 20 minutes (750 mL/hr total). Drink before feeling thirsty.",
            "acclimatized_advice": "Maintain 15-minute shaded rest breaks every hour. Keep cool drinking water nearby.",
            "unacclimatized_advice": "Reduce heavy labor shift length by 20% for unacclimatized personnel.",
            "severity_band": "MODERATE STRAIN",
            "band_color": "amber"
        }
    elif wbgt_c < 30.5:
        return {
            "regime": "50% Work / 50% Rest (30 min rest per hour)",
            "work_pct": 50,
            "rest_pct": 50,
            "rest_minutes_per_hour": 30,
            "work_minutes_per_hour": 30,
            "work_rest_cycle": "50% Work / 50% Rest (30 min/hr in shade)",
            "hydration_target_ml_hr": 1000,
            "hydration_instruction": "Drink 250-300 mL every 15-20 minutes with ORS/electrolytes (1000 mL/hr).",
            "acclimatized_advice": "Strict 30-minute shaded rest per hour. Shift heavy physical tasks to early morning.",
            "unacclimatized_advice": "Unacclimatized workers must be reassigned away from direct sunlight.",
            "severity_band": "HIGH THERMAL STRAIN",
            "band_color": "orange"
        }
    elif wbgt_c < 32.5:
        return {
            "regime": "25% Work / 75% Rest (45 min rest per hour)",
            "work_pct": 25,
            "rest_pct": 75,
            "rest_minutes_per_hour": 45,
            "work_minutes_per_hour": 15,
            "work_rest_cycle": "25% Work / 75% Rest (45 min/hr in shade)",
            "hydration_target_ml_hr": 1250,
            "hydration_instruction": "Consume 1.25 Liters of electrolyte water per hour in shaded active cooling area.",
            "acclimatized_advice": "Minimize direct sunlight exposure. Rest 45 minutes of every hour in shaded, ventilated area.",
            "unacclimatized_advice": "Mandatory suspension of strenuous manual labor for unacclimatized workers.",
            "severity_band": "VERY HIGH STRAIN",
            "band_color": "rose"
        }
    else:
        return {
            "regime": "Cease Heavy Outdoor Labor (Mandatory Halt)",
            "work_pct": 0,
            "rest_pct": 100,
            "rest_minutes_per_hour": 60,
            "work_minutes_per_hour": 0,
            "work_rest_cycle": "Cease Work (Mandatory Outdoor Labor Suspension)",
            "hydration_target_ml_hr": 1500,
            "hydration_instruction": "Drink cool electrolyte water continuously. Active body cooling required.",
            "acclimatized_advice": "IMMEDIATE SUSPENSION of strenuous physical outdoor labor. High risk of fatal heat stroke.",
            "unacclimatized_advice": "Severe hazard. Strictly stay in air-cooled or heavily shaded indoor environments.",
            "severity_band": "EXTREME HEAT STROKE HAZARD",
            "band_color": "red"
        }

def evaluate_sector_permissibility(
    temp_c: float,
    wbgt_c: float,
    heat_index_c: float,
    wind_speed: float,
    wind_gusts: float,
    rain_prob: float,
    precip_mm: float,
    weather_code: int,
    uv_index: float,
    is_coastal: bool = False
) -> Dict[str, Any]:
    """
    Generates sector-specific operational safety clearances and permits for Odisha.
    Covering Agriculture, Construction/Rigging, and Marine/Coastal.
    """
    is_thunderstorm = weather_code in [95, 96, 99]
    effective_wind = max(wind_speed, wind_gusts * 0.75)

    # 1. Agriculture
    spray_permitted = (effective_wind <= 15.0) and (rain_prob < 0.50) and (not is_thunderstorm)
    spray_reason = (
        "Safe wind & moisture" if spray_permitted else
        ("Thunderstorm hazard" if is_thunderstorm else
        (f"High wind ({effective_wind:.0f} km/h) causes chemical drift" if effective_wind > 15.0 else
         f"High rain risk ({int(rain_prob*100)}%) washes off chemicals"))
    )

    harvest_drying_permitted = (rain_prob < 0.35) and (precip_mm < 1.0) and (not is_thunderstorm)
    harvest_reason = (
        "Clear drying skies" if harvest_drying_permitted else
        ("Thunderstorm/rain threat to harvested grains; keep tarpaulins ready" if is_thunderstorm or rain_prob >= 0.35 else
         "Moist conditions; delay open grain drying")
    )

    # 2. Construction
    crane_permitted = (effective_wind <= 35.0) and (wind_gusts < 42.0) and (not is_thunderstorm)
    crane_reason = (
        "Wind within safe crane limits (<35 km/h)" if crane_permitted else
        ("Lightning hazard on metallic jib/boom" if is_thunderstorm else
         f"High wind ({effective_wind:.0f} km/h, gusts {wind_gusts:.0f} km/h) exceeds safe crane load limits")
    )

    scaffolding_permitted = (effective_wind <= 28.0) and (wind_gusts < 35.0) and (not is_thunderstorm) and (precip_mm < 15.0)
    scaffolding_reason = (
        "Stable structural wind conditions" if scaffolding_permitted else
        ("Lightning hazard on metal scaffolding" if is_thunderstorm else
         f"High wind/gusts ({effective_wind:.0f} km/h, gusts {wind_gusts:.0f} km/h) create fall hazard on elevated platforms")
    )

    roofing_permitted = (effective_wind <= 20.0) and (not is_thunderstorm) and (rain_prob < 0.40) and (wbgt_c < 32.0)
    roofing_reason = (
        "Safe for elevated roof installation" if roofing_permitted else
        ("Extreme surface thermal heat on metal roofs" if wbgt_c >= 32.0 else
         ("High wind sheet lifting hazard" if effective_wind > 20.0 else "Storm / rain slick hazard"))
    )

    # 3. Marine / Fishery
    marine_advisory_active = (effective_wind > 32.0) or (wind_gusts > 45.0) or is_thunderstorm
    sea_state = (
        "Rough to Very Rough - Small craft stay in port" if marine_advisory_active else
        ("Moderate - Coastal fishing feasible with caution" if effective_wind > 20.0 else
         "Slight / Calm - Normal fishing operations permitted")
    )

    return {
        "agriculture": {
            "pesticide_spraying_permitted": spray_permitted,
            "pesticide_spraying_status": "PERMITTED" if spray_permitted else "RESTRICTED",
            "pesticide_spraying_reason": spray_reason,
            "crop_harvest_drying_permitted": harvest_drying_permitted,
            "crop_harvest_drying_reason": harvest_reason,
            "tilling_irrigation_suitable": not is_thunderstorm and wbgt_c < 32.0
        },
        "construction": {
            "crane_lifts_permitted": crane_permitted,
            "crane_lifts_status": "PERMITTED" if crane_permitted else "SUSPENDED",
            "crane_lifts_reason": crane_reason,
            "high_scaffolding_permitted": scaffolding_permitted,
            "high_scaffolding_status": "PERMITTED" if scaffolding_permitted else "RESTRICTED",
            "high_scaffolding_reason": scaffolding_reason,
            "roofing_installation_permitted": roofing_permitted,
            "roofing_installation_reason": roofing_reason
        },
        "marine_coastal": {
            "small_craft_advisory": marine_advisory_active,
            "fishermen_sea_venture_permitted": not marine_advisory_active,
            "sea_state": sea_state,
            "is_coastal_district": is_coastal
        }
    }

def calculate_wri(
    rain_prob: float, 
    temp_c: float, 
    temp_max: float,
    wind_speed: float, 
    humidity_rh: float = 65.0,
    precip_today_mm: float = 0.0,
    wind_gusts: float = 0.0,
    uv_index: float = 0.0,
    pressure_delta_24h: float = 0.0,
    weather_code: int = 0,
    is_daytime: bool = True
) -> Dict[str, Any]:
    """
    Advanced Multi-Hazard Workability Risk Index (WRI) & Continuous Safety Engine.
    
    Safety Scale: 0.0 (Extreme Hazard) to 10.0 (Optimal / Safe).
    Higher is safer.
    
    Category Interpretation (0-10 scale):
    - 8.0 - 10.0: Favorable working conditions (GREEN)
    - 6.0 - 7.9:  Caution required (YELLOW)
    - 4.0 - 5.9:  Elevated risk (ORANGE)
    - 2.0 - 3.9:  High risk; restrict heavy outdoor labor (RED)
    - 0.0 - 1.9:  Very hazardous conditions (DARK RED)

    Scientifically combines 5 continuous hazard vectors:
    1. Thermal Strain: Evaluates WBGT, Heat Index, and THI against OSHA/ACGIH physical labor thresholds.
    2. Precipitation & Convective Storms: Combines calibrated ML rain probability, precipitation intensity,
       and convective thunderstorm WMO codes.
    3. Mechanical Wind Force: Evaluates sustained wind and gusts impacting spray drift, scaffolds, and structures.
    4. Solar UV Radiation: Evaluates UV Index exposure risk during daylight.
    5. Barometric Pressure Depression: Evaluates rapid 24h pressure drops signaling Bay of Bengal cyclonic systems.
    """
    effective_temp = max(temp_c, (temp_c + temp_max) / 2.0) if is_daytime else temp_c

    effective_wind = max(wind_speed, wind_gusts * 0.75)

    # 1. Thermal Strain Penalty (Continuous scaling, max 4.0 pts)
    heat_index = calculate_heat_index_celsius(effective_temp, humidity_rh)
    wbgt_shade = calculate_wbgt_approx(effective_temp, humidity_rh, wind_speed_kmh=effective_wind, uv_index=0.0, is_daytime=False)
    wbgt = calculate_wbgt_approx(effective_temp, humidity_rh, wind_speed_kmh=effective_wind, uv_index=uv_index, is_daytime=is_daytime)
    thi = effective_temp - (0.55 - 0.0055 * humidity_rh) * (effective_temp - 14.5)

    # Heat strain calculation (OSHA / ACGIH WBGT > 25°C)
    heat_strain = 0.0
    if wbgt > 25.0:
        wbgt_strain = (wbgt - 25.0) * 0.45
        hi_strain = max(0.0, (heat_index - 33.0) * 0.25)
        heat_strain = min(4.0, wbgt_strain + hi_strain)
    elif effective_temp > 34.0:
        heat_strain = min(2.5, (effective_temp - 34.0) * 0.35)

    # Cold strain calculation for highland winter mornings (Daringbadi / Koraput / Similipal)
    cold_strain = 0.0
    wind_chill_val = temp_c
    if temp_c < 14.0:
        wind_chill_val = calculate_wind_chill_celsius(temp_c, effective_wind)
        if wind_chill_val < 12.0:
            cold_strain = min(2.5, ((12.0 - wind_chill_val) / 8.0) * 2.5)

    thermal_penalty = max(heat_strain, cold_strain)

    # 2. Precipitation & Convective Storm Penalty (Continuous scaling, max 4.5 pts)
    # WMO thunderstorm codes: 95 (Thunderstorm), 96 (Thunderstorm with hail), 99 (Heavy hail storm)
    is_thunderstorm = weather_code in [95, 96, 99]
    is_heavy_rain = weather_code in [65, 82] # Heavy rain or violent showers

    # Non-linear rain intensity factor (25 mm/day is heavy rain threshold)
    rain_intensity_factor = min(1.0, math.sqrt(precip_today_mm / 25.0))
    composite_rain_hazard = 0.60 * rain_prob + 0.40 * rain_intensity_factor

    rain_penalty = 4.2 * (composite_rain_hazard ** 1.3)
    if is_thunderstorm:
        # Mandatory lightning safety deduction
        rain_penalty = max(3.5, rain_penalty + 1.2)
    elif is_heavy_rain:
        rain_penalty = max(2.8, rain_penalty + 0.8)
    rain_penalty = min(4.5, rain_penalty)

    # 3. Wind & Gust Hazard Penalty (Continuous scaling, max 2.5 pts)
    wind_penalty = 0.0
    # > 12 km/h impacts precision spraying; > 28 km/h impacts scaffolding & high work
    if effective_wind > 12.0:
        wind_penalty = min(2.5, ((effective_wind - 12.0) / 30.0) ** 1.1 * 2.5)

    # 4. Solar UV Radiation Penalty (Daytime only, max 1.5 pts)
    uv_penalty = 0.0
    if is_daytime and uv_index > 5.0:
        # WHO UV Index: >5 Moderate/High, >8 Very High, >11 Extreme
        uv_penalty = min(1.5, ((uv_index - 5.0) / 7.0) * 1.5)

    # 5. Barometric Pressure Depression Penalty (Max 1.0 pts)
    # Sudden drop in 24h pressure (< -2.5 hPa) indicates approaching tropical depression
    pressure_penalty = 0.0
    if pressure_delta_24h < -2.0:
        pressure_penalty = min(1.0, abs(pressure_delta_24h + 2.0) * 0.25)

    # Deductive aggregation
    total_penalty = thermal_penalty + rain_penalty + wind_penalty + uv_penalty + pressure_penalty
    total_penalty = round(min(9.5, max(0.0, total_penalty)), 2)

    # Raw continuous safety score (0.5 to 10.0)
    safety_score = round(max(0.5, 10.0 - total_penalty), 1)
    safety_score_100 = int(round(safety_score * 10))

    # Standardized Risk Classification
    if safety_score >= 8.0:
        zone = "GREEN"
        risk_level = "Favorable"
        advice_en = "Conditions are favorable for all outdoor operations. Maintain standard hydration."
        advice_or = "କାମ କରିବା ପାଇଁ ପାଗ ସମ୍ପୂର୍ଣ୍ଣ ଅନୁକୂଳ ଅଟେ। ସାଧାରଣ ପାଣି ପିଇବା ବଜାୟ ରଖନ୍ତୁ।"
        advice_hi = "बाहरी काम के लिए मौसम पूरी तरह अनुकूल है। नियमित रूप से पानी पीते रहें।"
    elif safety_score >= 6.0:
        zone = "YELLOW"
        risk_level = "Moderate Caution"
        advice_en = "Moderate conditions. Schedule regular shaded rest breaks and monitor afternoon sky."
        advice_or = "ମଧ୍ୟମ ଧରଣର ସତର୍କତା। ଛାଇରେ ବିଶ୍ରାମ ନିଅନ୍ତୁ ଏବଂ ଅପରାହ୍ନ ପାଗ ଉପରେ ନଜର ରଖନ୍ତୁ।"
        advice_hi = "मध्यम सावधानी। काम के बीच छाया में आराम करें और मौसम पर नज़र रखें।"
    elif safety_score >= 4.0:
        zone = "ORANGE"
        risk_level = "Elevated Risk"
        advice_en = "Elevated risk. Postpone chemical spraying, secure elevated structures, reduce physical load."
        advice_or = "ଉଚ୍ଚ ସତର୍କତା। ଔଷଧ ସିଞ୍ଚନ ବନ୍ଦ ରଖନ୍ତୁ, ଉଚ୍ଚ ସ୍ଥାନରେ କାମ ସୀମିତ କରନ୍ତୁ।"
        advice_hi = "उच्च जोखिम। कीटनाशक छिड़काव टालें, ऊंचे मचान पर काम सीमित करें।"
    elif safety_score >= 2.0:
        zone = "RED"
        risk_level = "High Risk"
        advice_en = "High risk. Strenuous outdoor labor should be modified or suspended. Take shelter from hazards."
        advice_or = "ଅତ୍ୟଧିକ ବିପଦ। ବାହାରେ କଠିନ ପରିଶ୍ରମ ବନ୍ଦ ରଖନ୍ତୁ ଏବଂ ସୁରକ୍ଷିତ ଆଶ୍ରୟ ନିଅନ୍ତୁ।"
        advice_hi = "गंभीर जोखिम। धूप या बारिश से बचें और बाहरी भारी कार्य तुरंत रोकें।"
    else:
        zone = "DARK_RED"
        risk_level = "Severe Hazard"
        advice_en = "Severe meteorological hazard. Outdoor operations strictly prohibited. Stay indoors."
        advice_or = "ଚରମ ବିପଦ! ବାହାରେ କାମ ସମ୍ପୂର୍ଣ୍ଣ ନିଷେଧ। ଘର ଭିତରେ ସୁରକ୍ଷିତ ରୁହନ୍ତୁ।"
        advice_hi = "अत्यधिक गंभीर खतरा! बाहर काम करना सख्त मना है। तुरंत सुरक्षित स्थान पर रहें।"

    # Mathematical contribution percentages
    penalty_sum = total_penalty if total_penalty > 0.05 else 1.0
    contributions = {
        "thermal_pct": int(round((thermal_penalty / penalty_sum) * 100)) if total_penalty > 0.05 else 0,
        "rain_pct": int(round((rain_penalty / penalty_sum) * 100)) if total_penalty > 0.05 else 0,
        "wind_pct": int(round((wind_penalty / penalty_sum) * 100)) if total_penalty > 0.05 else 0,
        "uv_pct": int(round((uv_penalty / penalty_sum) * 100)) if total_penalty > 0.05 else 0,
        "pressure_pct": int(round((pressure_penalty / penalty_sum) * 100)) if total_penalty > 0.05 else 0
    }

    # ISO 7243 & ACGIH Occupational Guidelines
    occupational_guidelines = get_iso7243_work_rest_cycle(wbgt)

    # Sector Permissibility Clearances
    sector_permissibility = evaluate_sector_permissibility(
        temp_c=effective_temp,
        wbgt_c=wbgt,
        heat_index_c=heat_index,
        wind_speed=wind_speed,
        wind_gusts=wind_gusts,
        rain_prob=rain_prob,
        precip_mm=precip_today_mm,
        weather_code=weather_code,
        uv_index=uv_index
    )

    # Itemized Transparent Deductions Breakdown
    transparent_deductions: List[Dict[str, Any]] = []
    if thermal_penalty > 0.05:
        if cold_strain > heat_strain:
            transparent_deductions.append({
                "category": "Thermal Strain",
                "factor": "Highland Winter Cold & Wind Chill",
                "deduction_points": round(thermal_penalty, 2),
                "threshold_standard": "NOAA / Environment Canada Cold Stress (< 12°C Chill)",
                "observed_value": f"{temp_c:.1f}°C ambient / {wind_chill_val:.1f}°C wind chill",
                "severity": "MODERATE" if thermal_penalty < 1.5 else "HIGH",
                "mitigation": "Wear multi-layered thermal insulation and windproof jackets. Limit early dawn exposure."
            })
        else:
            transparent_deductions.append({
                "category": "Thermal Strain",
                "factor": "Outdoor WBGT Heat Stress",
                "deduction_points": round(thermal_penalty, 2),
                "threshold_standard": "ISO 7243 / OSHA Physical Labor Baseline (> 25°C WBGT)",
                "observed_value": f"{wbgt:.1f}°C outdoor WBGT ({heat_index:.1f}°C Heat Index)",
                "severity": "MODERATE" if wbgt < 28.0 else ("ELEVATED" if wbgt < 31.0 else "SEVERE"),
                "mitigation": f"Adopt {occupational_guidelines['work_rest_cycle']}; hydrate at {occupational_guidelines['hydration_target_ml_hr']} mL/hr."
            })

    if rain_penalty > 0.05:
        transparent_deductions.append({
            "category": "Precipitation & Convective",
            "factor": "Thunderstorm & Lightning Threat" if is_thunderstorm else "Precipitation Inundation",
            "deduction_points": round(rain_penalty, 2),
            "threshold_standard": "IMD Convective Weather Standards & Calibrated ML Rainfall",
            "observed_value": f"{int(round(rain_prob * 100))}% prob ({precip_today_mm:.1f} mm forecast)" + (" [THUNDERSTORM]" if is_thunderstorm else ""),
            "severity": "SEVERE" if is_thunderstorm else ("HIGH" if rain_penalty > 2.5 else "MODERATE"),
            "mitigation": "Halt open field activity immediately if lightning occurs; secure crop drainage channels."
        })

    if wind_penalty > 0.05:
        transparent_deductions.append({
            "category": "Mechanical Wind Force",
            "factor": "Wind & Structural Gust Hazards",
            "deduction_points": round(wind_penalty, 2),
            "threshold_standard": "ACGIH Structural Limits (> 15 km/h spray drift, > 28 km/h scaffolding)",
            "observed_value": f"{effective_wind:.1f} km/h (Gusts: {wind_gusts:.1f} km/h)",
            "severity": "HIGH" if effective_wind > 32.0 else "MODERATE",
            "mitigation": "Postpone chemical pesticide spraying; tie down elevated scaffolding and crane loads."
        })

    if uv_penalty > 0.05:
        transparent_deductions.append({
            "category": "Solar Radiation",
            "factor": "Ultraviolet (UV) Exposure",
            "deduction_points": round(uv_penalty, 2),
            "threshold_standard": "WHO Global Solar UV Index (> 5.0 High Risk)",
            "observed_value": f"UV Index {uv_index:.1f}",
            "severity": "HIGH" if uv_index > 8.0 else "MODERATE",
            "mitigation": "Wear wide-brim hats, long protective sleeves, and seek shaded areas during peak daylight."
        })

    if pressure_penalty > 0.05:
        transparent_deductions.append({
            "category": "Barometric Depression",
            "factor": "Tropical Low Pressure Tendency",
            "deduction_points": round(pressure_penalty, 2),
            "threshold_standard": "IMD Bay of Bengal Depression Indicator (Δ24h < -2.0 hPa)",
            "observed_value": f"Δ24h {pressure_delta_24h:+.1f} hPa",
            "severity": "ELEVATED",
            "mitigation": "Monitor regional IMD / OSDMA cyclone warnings and prepare for squally weather."
        })

    # Determine Primary Limiting Factor
    if total_penalty < 0.2:
        primary_limiting_factor = "Optimal Atmospheric Conditions (No Limiting Factor)"
    else:
        max_deduction = max(thermal_penalty, rain_penalty, wind_penalty, uv_penalty, pressure_penalty)
        if max_deduction == thermal_penalty:
            primary_limiting_factor = f"Thermal Stress ({'WBGT ' + str(round(wbgt, 1)) + '°C' if wbgt > 25.0 else 'Cold Highland Chill'})"
        elif max_deduction == rain_penalty:
            primary_limiting_factor = "Severe Thunderstorm & Lightning" if is_thunderstorm else f"High Rain Probability ({int(rain_prob * 100)}%)"
        elif max_deduction == wind_penalty:
            primary_limiting_factor = f"Strong Mechanical Winds ({effective_wind:.0f} km/h)"
        elif max_deduction == uv_penalty:
            primary_limiting_factor = f"Intense Midday Solar UV (Index {uv_index:.1f})"
        else:
            primary_limiting_factor = f"Barometric Pressure Drop ({pressure_delta_24h:+.1f} hPa)"

    # Persona-specific tailored advisories
    persona_advisories = generate_persona_advisories(
        safety_score=safety_score,
        temp_c=effective_temp,
        heat_index=heat_index,
        wbgt=wbgt,
        rain_prob=rain_prob,
        precip_mm=precip_today_mm,
        wind_speed=effective_wind,
        uv_index=uv_index,
        is_thunderstorm=is_thunderstorm
    )

    return {
        "safety_score": safety_score,
        "safety_score_100": safety_score_100,
        "wri_score": safety_score,
        "score_direction": "Higher means safer (10 = ideal conditions, 0 = severe hazard)",
        "zone": zone,
        "predicted_risk_level": risk_level,
        "advice": advice_en,
        "translations": {
            "odia": advice_or,
            "hindi": advice_hi
        },
        "penalties": {
            "thermal": round(thermal_penalty, 2),
            "rain": round(rain_penalty, 2),
            "wind": round(wind_penalty, 2),
            "uv": round(uv_penalty, 2),
            "pressure": round(pressure_penalty, 2),
            "total": round(total_penalty, 2),
            # Convenient aliases for legacy cards
            "temp": round(thermal_penalty, 2),
            "humidity": round(thermal_penalty * (humidity_rh / 100.0), 2)
        },
        "contributions": contributions,
        "meteorological_indices": {
            "thi": round(thi, 1),
            "heat_index_c": round(heat_index, 1),
            "wbgt_c": round(wbgt, 1),
            "wbgt_shade_c": round(wbgt_shade, 1),
            "wbgt_outdoor_c": round(wbgt, 1),
            "wind_chill_c": round(wind_chill_val, 1),
            "rain_hazard_index": round(composite_rain_hazard, 3),
            "uv_index": round(uv_index, 1)
        },
        "occupational_guidelines": occupational_guidelines,
        "sector_permissibility": sector_permissibility,
        "transparent_deductions": transparent_deductions,
        "primary_limiting_factor": primary_limiting_factor,
        "persona_advisories": persona_advisories,
        "preliminary_indicator_notice": (
            "District safety score calculated using continuous meteorological risk deductions "
            "and calibrated ML precipitation models. Always adhere to official IMD/OSDMA alerts."
        )
    }

def generate_persona_advisories(
    safety_score: float,
    temp_c: float,
    heat_index: float,
    wbgt: float,
    rain_prob: float,
    precip_mm: float,
    wind_speed: float,
    uv_index: float,
    is_thunderstorm: bool
) -> Dict[str, Any]:
    """Generates practical, persona-targeted advisories in English, Odia, and Hindi."""

    # 1. Farmers (ଚାଷୀ / किसान)
    if is_thunderstorm:
        farm_en = "STOP field activities immediately. Move away from open paddy fields, metal tractors, and isolated trees."
        farm_or = "ବିଜୁଳି ଘଡ଼ଘଡ଼ି ଆଶଙ୍କା! ଖୋଲା ବିଲ ଏବଂ ଗଛ ମୂଳରୁ ତୁରନ୍ତ ସୁରକ୍ଷିତ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ।"
        farm_hi = "बिजली गिरने का खतरा! खुले खेतों और पेड़ों के नीचे से तुरंत सुरक्षित स्थान पर जाएं।"
    elif wind_speed > 15.0:
        farm_en = f"Winds of {wind_speed:.0f} km/h will cause pesticide/fertilizer spray drift. Postpone chemical spraying until winds subside."
        farm_or = "ପବନର ବେଗ ଅଧିକ ଥିବାରୁ କୀଟନାଶକ ସିଞ୍ଚନ ବନ୍ଦ ରଖନ୍ତୁ।"
        farm_hi = "तेज़ हवा के कारण कीटनाशक का छिड़काव स्थगित करें।"
    elif rain_prob > 0.6 or precip_mm > 10.0:
        farm_en = f"High rain probability ({int(rain_prob*100)}%). Ensure drainage in seedbeds and postpone crop harvest/drying."
        farm_or = "ବର୍ଷା ଆଶଙ୍କା ଥିବାରୁ ଫସଲ ଅମଳ କାର୍ଯ୍ୟ ଏବଂ ଜଳ ନିଷ୍କାସନ ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ।"
        farm_hi = "बारिश की संभावना अधिक है। कटी हुई फसल को सुरक्षित रखें और जल निकासी सुनिश्चित करें।"
    elif wbgt > 28.0:
        farm_en = f"Elevated heat strain (WBGT {wbgt:.1f}°C). Complete tilling and weeding before 10 AM or after 4 PM."
        farm_or = "ପ୍ରବଳ ଗରମ! ସକାଳ ୧୦ଟା ପୂର୍ବରୁ କିମ୍ବା ଅପରାହ୍ନ ୪ଟା ପରେ କ୍ଷେତ କାର୍ଯ୍ୟ କରନ୍ତୁ।"
        farm_hi = "तेज धूप और उमस। सुबह 10 बजे से पहले या शाम 4 बजे के बाद ही खेतों में काम करें।"
    else:
        farm_en = "Favorable agricultural conditions. Suitable for irrigation, planting, and field management."
        farm_or = "କୃଷି କାର୍ଯ୍ୟ ପାଇଁ ପାଗ ଅନୁକୂଳ ଅଟେ।"
        farm_hi = "खेती-किसानी के लिए मौसम अनुकूल है।"

    # 2. Construction & Outdoor Workers (ନିର୍ମାଣ ଶ୍ରମିକ / निर्माण श्रमिक)
    if is_thunderstorm:
        const_en = "MANDATORY WORK HALT: Lightning risk. Clear metal cranes, scaffolding, and steel roofing immediately."
        const_or = "ବଜ୍ରପାତ ସତର୍କତା: ଭାରା (Scaffolding) ଏବଂ କ୍ରେନ୍ ଉପରେ କାମ ତୁରନ୍ତ ବନ୍ଦ କରନ୍ତୁ।"
        const_hi = "बिजली का खतरा: क्रेन, मचान और लोहे के ढांचे पर काम तुरंत रोकें।"
    elif wind_speed > 30.0:
        const_en = f"Wind gusts reach {wind_speed:.0f} km/h. Working on scaffolds or lifting roof panels is dangerous."
        const_or = "ପବନ ବେଗ ଅଧିକ: ଉଚ୍ଚ ସ୍ଥାନରେ କାମ କରିବା ବିପଦଜ୍ଜନକ।"
        const_hi = "तेज हवा: ऊंचाई पर मचान पर काम करना खतरनाक है।"
    elif wbgt > 29.0:
        const_en = f"High thermal strain (WBGT {wbgt:.1f}°C). ACGIH guidelines mandate 30 minutes rest per hour in shade with cool ORS hydration."
        const_or = "ଅତ୍ୟଧିକ ଖରା: ପ୍ରତି ଘଣ୍ଟାରେ ୩୦ ମିନିଟ୍ ଛାଇରେ ବିଶ୍ରାମ ଏବଂ ORS ପାଣି ପିଅନ୍ତୁ।"
        const_hi = "भीषण गर्मी: हर घंटे में आराम करें और ओआरएस/पानी का सेवन करें।"
    else:
        const_en = "Site conditions are stable. Follow standard structural and personal protective equipment safety protocols."
        const_or = "ନିର୍ମାଣ କାର୍ଯ୍ୟ ପାଇଁ ପାଗ ଠିକ୍ ଅଛି। ସୁରକ୍ଷା ଉପକରଣ ବ୍ୟବହାର କରନ୍ତୁ।"
        const_hi = "निर्माण कार्य के लिए स्थिति अनुकूल है। सुरक्षा नियमों का पालन करें।"

    # 3. Daily-Wage Workers (ଦିନ ମଜୁରିଆ / दिहाड़ी मजदूर)
    if safety_score < 4.0:
        wage_en = "Unfavorable weather. High hazard for heavy manual labor. Wear protection, take frequent shade breaks, and carry drinking water."
        wage_or = "ବାହାରେ କାମ କରିବା କଷ୍ଟକର। ଛତା ବ୍ୟବହାର କରନ୍ତୁ ଏବଂ ଯଥେଷ୍ଟ ପାଣି ପିଅନ୍ତୁ।"
        wage_hi = "मौसम कठिन है। धूप या बारिश से बचें और पर्याप्त पानी साथ रखें।"
    elif safety_score < 7.0:
        wage_en = "Moderate outdoor conditions. Workable with precautions: avoid direct sun exposure between 12 PM and 3 PM."
        wage_or = "ଦ୍ୱିପହର ୧୨ ରୁ ୩ ଟା ମଧ୍ୟରେ ଖରାରେ କାମ କରିବାରୁ ଦୂରେଇ ରୁହନ୍ତୁ।"
        wage_hi = "दोपहर 12 से 3 बजे के बीच सीधी धूप से बचें।"
    else:
        wage_en = "Good working conditions across shifts. Ideal day for manual labor."
        wage_or = "ଆଜି କାମ କରିବା ପାଇଁ ଭଲ ଦିନ।"
        wage_hi = "आज काम के लिए मौसम बहुत अच्छा है।"

    # 4. General Public (ସାଧାରଣ ଜନତା / आम जनता)
    if is_thunderstorm:
        pub_en = "Severe thunderstorm alert: Avoid outdoor travel, unplug sensitive electronics, stay away from water bodies."
        pub_or = "ବଜ୍ରପାତ ସତର୍କତା: ଘରୁ ବାହାରକୁ ଯାଆନ୍ତୁ ନାହିଁ।"
        pub_hi = "आंधी-तूफान की चेतावनी: यात्रा टालें और सुरक्षित घर के अंदर रहें।"
    elif rain_prob > 0.7:
        pub_en = f"Rain likely ({int(rain_prob*100)}%). Carry rain gear; watch for waterlogging on roads."
        pub_or = "ବର୍ଷା ହେବାର ସମ୍ଭାବନା ଅଛି। ବାହାରକୁ ଗଲେ ଛତା କିମ୍ବା ରେନକୋଟ୍ ନିଅନ୍ତୁ।"
        pub_hi = "बारिश की संभावना है। बाहर जाते समय छाता या रेनकोट साथ रखें।"
    elif heat_index > 38.0:
        pub_en = f"Heat Index reaches {heat_index:.1f}°C. High dehydration risk. Wear loose cotton clothes and carry water."
        pub_or = "ଅସହ୍ୟ ଖରା ଏବଂ ଗୁଳୁଗୁଳି। ସୂତା ପୋଷାକ ପିନ୍ଧନ୍ତୁ ଏବଂ ପାଣି ପିଅନ୍ତୁ।"
        pub_hi = "उमस और गर्मी ज्यादा है। सूती कपड़े पहनें और धूप से बचें।"
    else:
        pub_en = "Pleasant and stable weather. Great day for travel and outdoor recreation."
        pub_or = "ପାଗ ସୁନ୍ଦର ଏବଂ ଶାନ୍ତ ଅଛି।"
        pub_hi = "मौसम सुहावना है। यात्रा के लिए अच्छा दिन है।"

    return {
        "farmers": {"title": "Farmers & Cultivators", "icon": "sprout", "en": farm_en, "or": farm_or, "hi": farm_hi},
        "construction": {"title": "Construction & Heavy Labor", "icon": "hard-hat", "en": const_en, "or": const_or, "hi": const_hi},
        "daily_wage": {"title": "Daily-Wage Workers", "icon": "briefcase", "en": wage_en, "or": wage_or, "hi": wage_hi},
        "general_public": {"title": "General Public & Travel", "icon": "users", "en": pub_en, "or": pub_or, "hi": pub_hi}
    }
