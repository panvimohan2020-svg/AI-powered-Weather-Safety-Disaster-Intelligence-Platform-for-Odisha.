import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
from districts import ODISHA_30_DISTRICTS

def generate_odisha_dataset(num_days=365*5):
    """
    Generates a realistic, meteorologically grounded historical dataset for all 30 Odisha districts
    across 5 full years (2019-2023).
    
    Reflects the 5 distinct agro-climatic zones of Odisha:
    1. Coastal Zone (Puri, Balasore, Jagatsinghpur, Ganjam, etc.) - Maritime moisture, cyclones, low DTR.
    2. Central Basin (Khurda, Cuttack, Angul, Dhenkanal, etc.) - High summer heat, moderate humidity.
    3. Western Dry Zone (Balangir, Sambalpur, Jharsuguda, Kalahandi, etc.) - Extreme summer heatwaves, dry pre-monsoon.
    4. Northern Plateau (Sundargarh, Keonjhar, Mayurbhanj, Deogarh) - Elevation cooling, forest rainfall.
    5. Southern Eastern Ghats (Koraput, Rayagada, Kandhamal, Malkangiri) - Highland microclimates (>500m), cooler temps.
    """
    print(f"Generating comprehensive dataset for all {len(ODISHA_30_DISTRICTS)} Odisha districts over {num_days} days...")
    np.random.seed(42)

    dates = [datetime(2019, 1, 1) + timedelta(days=i) for i in range(num_days)]
    data = []

    for dist_name, info in ODISHA_30_DISTRICTS.items():
        lat = info["lat"]
        lon = info["lon"]
        elev = info["elevation"]
        dist_coast = info["coast_km"]

        # Climatic zone factors
        is_coastal = dist_coast <= 50.0
        is_western = lon < 84.5 and lat > 19.5
        is_highland = elev > 400.0

        for date in dates:
            day_of_year = date.timetuple().tm_yday

            # Sinusoidal seasonal progression (Monsoon peaks around day 200 - mid July)
            # Pre-monsoon summer peaks around day 135 - mid May
            monsoon_signal = np.sin((day_of_year - 110) / 365.0 * 2 * np.pi)
            monsoon_signal = max(0.0, monsoon_signal) # Active June - September

            summer_signal = np.sin((day_of_year - 45) / 365.0 * np.pi)
            summer_signal = max(0.0, min(1.0, summer_signal)) # Peaks April - May

            winter_signal = max(0.0, np.cos((day_of_year - 15) / 365.0 * 2 * np.pi)) # Peaks Dec - Jan

            # Base temperatures
            base_tmax = 31.0
            if is_western:
                base_tmax += 4.5 * summer_signal  # Heatwaves in Titlagarh/Balangir/Sambalpur
            if is_coastal:
                base_tmax -= 1.5 * summer_signal  # Sea breeze moderation
            if is_highland:
                base_tmax -= (elev / 100.0) * 0.65 # Environmental lapse rate (~6.5C per 1000m)

            temp_max = base_tmax + 4.0 * summer_signal - 5.0 * winter_signal - 3.0 * monsoon_signal + np.random.normal(0, 1.8)
            dtr = 6.0 + 6.0 * (1.0 - monsoon_signal) + (3.0 if is_western else 0.0) - (2.5 if is_coastal else 0.0)
            temp_min = temp_max - max(4.0, dtr + np.random.normal(0, 1.0))

            # Relative Humidity
            base_rh = 60.0
            if is_coastal:
                base_rh += 18.0
            if is_highland:
                base_rh += 8.0
            if is_western:
                base_rh -= 12.0 * (1.0 - monsoon_signal)

            humidity = np.clip(base_rh + 25.0 * monsoon_signal + np.random.normal(0, 6.0), 20.0, 98.0)

            # Rain probability influenced by monsoon, coastal moisture, and topography
            rain_prob = 0.05 + 0.58 * monsoon_signal
            if is_coastal:
                rain_prob += 0.08 # Maritime convective cells
            if is_highland:
                rain_prob += 0.06 # Orographic lift
            if is_western and monsoon_signal < 0.2:
                rain_prob = max(0.02, rain_prob - 0.04)
            rain_prob = np.clip(rain_prob, 0.02, 0.95)

            is_raining = (np.random.rand() < rain_prob)
            if is_raining:
                # Gamma distribution for rainfall intensity
                prectotcorr = np.random.gamma(shape=1.8, scale=12.0)
                if is_coastal and monsoon_signal > 0.4 and np.random.rand() < 0.15:
                    # Depressions in Bay of Bengal
                    prectotcorr += np.random.uniform(25.0, 75.0)
            else:
                prectotcorr = np.random.uniform(0.0, 0.08)

            # Wind speed (km/h converted or m/s)
            wind_base = 8.0 + (35.0 / (dist_coast + 8.0)) + 6.0 * monsoon_signal
            wind_speed = np.clip(wind_base + np.random.gamma(shape=2.0, scale=2.5), 2.0, 65.0)

            # Surface pressure (hPa)
            # Pressure drops with elevation and during monsoon depressions
            ps_base = 1013.25 - (elev * 0.11)
            depression_drop = -6.0 * monsoon_signal if (is_coastal and is_raining) else 0.0
            ps = ps_base + depression_drop + np.random.normal(0, 2.0)

            # Specific Humidity proxy (qv2m in kg/kg)
            qv2m = (humidity / 100.0) * 0.022 * np.exp(0.058 * temp_max)

            row = {
                "Date": date.strftime("%Y-%m-%d"),
                "District": dist_name,
                "LATITUDE": lat,
                "LONGITUDE": lon,
                "ELEVATION": elev,
                "DISTANCE_TO_COAST": dist_coast,
                "T2M_MAX": round(float(temp_max), 2),
                "T2M_MIN": round(float(temp_min), 2),
                "RH2M": round(float(humidity), 2),
                "WS50M": round(float(wind_speed), 2),
                "PS": round(float(ps), 2),
                "QV2M": round(float(qv2m), 5),
                "PRECTOTCORR": round(float(prectotcorr), 3)
            }
            data.append(row)

    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    csv_path = 'data/odisha_historical_data.csv'
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} records across {df['District'].nunique()} districts saved to {csv_path}.")
    return df

if __name__ == "__main__":
    generate_odisha_dataset()
