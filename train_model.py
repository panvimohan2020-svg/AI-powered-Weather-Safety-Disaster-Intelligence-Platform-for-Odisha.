import pandas as pd
import numpy as np
import os
import json
import joblib
from datetime import datetime
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.model_selection import GroupKFold
from sklearn.metrics import (
    accuracy_score, roc_auc_score, average_precision_score, f1_score, 
    precision_score, recall_score, brier_score_loss, confusion_matrix, log_loss
)

FEATURE_COLUMNS = [
    'LATITUDE', 'LONGITUDE', 'ELEVATION', 'DISTANCE_TO_COAST',
    'T2M_MAX', 'T2M_MIN', 'RH2M', 'WS50M', 'PS', 'QV2M',
    'PS_DELTA_24H', 'RAIN_YESTERDAY_BIN', 'VPD', 'DTR', 'THI', 'MOISTURE_FLUX',
    'SIN_DOY', 'COS_DOY'
]

def calculate_heat_index(temp_c: pd.Series, rh: pd.Series) -> pd.Series:
    """
    NOAA Rothfusz Heat Index regression in Celsius.
    """
    # Convert to Fahrenheit for standard Rothfusz equation
    tf = temp_c * 9.0 / 5.0 + 32.0
    hi_f = (
        -42.379 + 2.04901523 * tf + 10.14333127 * rh
        - 0.22475541 * tf * rh - 0.00683783 * tf * tf
        - 0.05481717 * rh * rh + 0.00122874 * tf * tf * rh
        + 0.00085282 * tf * rh * rh - 0.00000199 * tf * tf * rh * rh
    )
    # Convert back to Celsius
    hi_c = (hi_f - 32.0) * 5.0 / 9.0
    return np.where(temp_c >= 26.0, hi_c, temp_c)

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Chronological feature engineering strictly preventing future leakage.
    Lag features use past observations only (shift 1).
    """
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by=['District', 'Date']).reset_index(drop=True)

    # 1. Temporal Lag Features (strictly shift 1 within district)
    df['PS_DELTA_24H'] = df.groupby('District')['PS'].diff(1).fillna(0.0)
    df['RAIN_YESTERDAY'] = df.groupby('District')['PRECTOTCORR'].shift(1).fillna(0.0)
    df['RAIN_YESTERDAY_BIN'] = (df['RAIN_YESTERDAY'] > 0.1).astype(int)

    # 2. Atmospheric & Thermal Indices
    # Vapor Pressure Deficit (VPD in kPa)
    es = 0.6108 * np.exp(17.27 * df['T2M_MAX'] / (df['T2M_MAX'] + 237.3))
    ea = es * (df['RH2M'] / 100.0)
    df['VPD'] = np.clip(es - ea, 0.0, None)

    # Diurnal Temperature Range (DTR in C)
    df['DTR'] = df['T2M_MAX'] - df['T2M_MIN']

    # Temperature-Humidity Index (THI)
    df['THI'] = df['T2M_MAX'] - (0.55 - 0.0055 * df['RH2M']) * (df['T2M_MAX'] - 14.5)

    # Coastal Moisture Flux Proxy
    df['MOISTURE_FLUX'] = (df['WS50M'] * df['QV2M']) / (df['DISTANCE_TO_COAST'] + 1.0)

    # 3. Cyclical Day of Year features (captures pre-monsoon vs monsoon vs winter)
    doy = df['Date'].dt.dayofyear
    df['SIN_DOY'] = np.sin(2.0 * np.pi * doy / 365.25)
    df['COS_DOY'] = np.cos(2.0 * np.pi * doy / 365.25)

    # Binary Target (0.1mm threshold defines rain day per IMD standards)
    df['RainToday'] = (df['PRECTOTCORR'] > 0.1).astype(int)

    return df

def evaluate_model(name: str, model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred).tolist()
    return {
        "model": name,
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "pr_auc": round(float(average_precision_score(y_test, y_prob)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "brier_score_loss": round(float(brier_score_loss(y_test, y_prob)), 4),
        "log_loss": round(float(log_loss(y_test, y_prob)), 4),
        "confusion_matrix": cm,
        "test_samples": int(len(y_test)),
        "rain_positive_count": int(y_test.sum()),
        "predicted_positive_count": int(y_pred.sum())
    }

def train_and_evaluate():
    data_path = 'data/odisha_historical_data.csv'
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Run data_generation.py first.")

    print(f"Loading dataset from {data_path}...")
    raw_df = pd.read_csv(data_path)
    print(f"Loaded {len(raw_df)} historical records across {raw_df['District'].nunique()} districts.")

    # 1. Feature Engineering
    print("Engineering features (temporal lags, thermodynamics, solar cycle)...")
    df = engineer_features(raw_df)

    # 2. Chronological Split (prevents temporal data leakage)
    # Train: 2019-01-01 to 2022-06-30 (3.5 years, ~70%)
    # Val:   2022-07-01 to 2022-12-31 (0.5 year, ~10% for calibration)
    # Test:  2023-01-01 to 2023-12-31 (1 full holdout year, ~20%)
    train_mask = df['Date'] < '2022-07-01'
    val_mask = (df['Date'] >= '2022-07-01') & (df['Date'] < '2023-01-01')
    test_mask = df['Date'] >= '2023-01-01'

    X_train = df.loc[train_mask, FEATURE_COLUMNS]
    y_train = df.loc[train_mask, 'RainToday']
    groups_train = df.loc[train_mask, 'District']

    X_val = df.loc[val_mask, FEATURE_COLUMNS]
    y_val = df.loc[val_mask, 'RainToday']

    X_test = df.loc[test_mask, FEATURE_COLUMNS]
    y_test = df.loc[test_mask, 'RainToday']
    test_df = df.loc[test_mask].copy()

    print(f"Train split: {len(X_train)} samples ({y_train.mean():.1%} rain positive)")
    print(f"Val split:   {len(X_val)} samples ({y_val.mean():.1%} rain positive)")
    print(f"Test split:  {len(X_test)} samples ({y_test.mean():.1%} rain positive)")

    # 3. Spatial Cross-Validation Evaluation (District-Grouped K-Fold)
    print("\nRunning 5-Fold District-Grouped Cross-Validation on Training Set...")
    gkf = GroupKFold(n_splits=5)
    cv_auc_scores = []
    cv_brier_scores = []
    
    cv_hgb = HistGradientBoostingClassifier(
        class_weight='balanced',
        learning_rate=0.05,
        max_iter=200,
        min_samples_leaf=30,
        l2_regularization=1.0,
        random_state=42
    )

    for fold, (trn_idx, val_idx) in enumerate(gkf.split(X_train, y_train, groups=groups_train)):
        fold_X_tr, fold_y_tr = X_train.iloc[trn_idx], y_train.iloc[trn_idx]
        fold_X_va, fold_y_va = X_train.iloc[val_idx], y_train.iloc[val_idx]
        cv_hgb.fit(fold_X_tr, fold_y_tr)
        va_prob = cv_hgb.predict_proba(fold_X_va)[:, 1]
        cv_auc_scores.append(roc_auc_score(fold_y_va, va_prob))
        cv_brier_scores.append(brier_score_loss(fold_y_va, va_prob))

    print(f"District GroupKFold ROC-AUC: {np.mean(cv_auc_scores):.4f} (+/- {np.std(cv_auc_scores):.4f})")
    print(f"District GroupKFold Brier Score: {np.mean(cv_brier_scores):.4f} (+/- {np.std(cv_brier_scores):.4f})")

    # 4. Model Benchmarks
    # Baseline 1: Dummy Prior Classifier
    print("\n[1/4] Training Baseline: Prior Probability Dummy Classifier...")
    dummy = DummyClassifier(strategy='prior')
    dummy.fit(X_train, y_train)
    m1_metrics = evaluate_model("Baseline: Dummy Prior", dummy, X_test, y_test)

    # Baseline 2: Logistic Regression (Standardized)
    print("\n[2/4] Training Baseline: L2 Regularized Logistic Regression...")
    log_reg = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(class_weight='balanced', max_iter=500, random_state=42))
    ])
    log_reg.fit(X_train, y_train)
    m2_metrics = evaluate_model("Baseline: Logistic Regression", log_reg, X_test, y_test)

    # Model 3: Balanced Random Forest
    print("\n[3/4] Training Balanced Random Forest Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=20,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    m3_metrics = evaluate_model("Balanced Random Forest", rf_model, X_test, y_test)

    # Champion Model 4: Tuned Calibrated HistGradientBoosting
    print("\n[4/4] Training Champion: Tuned & Calibrated HistGradientBoosting...")
    base_hgb = HistGradientBoostingClassifier(
        class_weight='balanced',
        learning_rate=0.04,
        max_iter=280,
        max_leaf_nodes=31,
        min_samples_leaf=30,
        l2_regularization=1.0,
        random_state=42
    )
    base_hgb.fit(X_train, y_train)

    # Probability Calibration using Validation Set
    calibrated_hgb = CalibratedClassifierCV(estimator=base_hgb, method='sigmoid', cv='prefit')
    calibrated_hgb.fit(X_val, y_val)
    m4_metrics = evaluate_model("Calibrated Balanced HistGB (Champion)", calibrated_hgb, X_test, y_test)

    comparison = [m1_metrics, m2_metrics, m3_metrics, m4_metrics]
    print("\n=== MODEL COMPARISON ON 2023 HOLDOUT TEST SPLIT ===")
    for m in comparison:
        print(f"{m['model']:<42} | F1: {m['f1_score']:.4f} | Rec: {m['recall']:.4f} | Prec: {m['precision']:.4f} | AUC: {m['roc_auc']:.4f} | Brier: {m['brier_score_loss']:.4f}")

    # 5. Meteorological Regime Error Analysis on 2023 Holdout Set
    print("\nCalculating error breakdown across meteorological regimes...")
    y_test_pred = calibrated_hgb.predict(X_test)
    y_test_prob = calibrated_hgb.predict_proba(X_test)[:, 1]

    # Regime 1: Monsoon / Rain days (Actual Rain > 0.1mm)
    rain_idx = (y_test == 1)
    rain_recall = recall_score(y_test[rain_idx], y_test_pred[rain_idx], zero_division=0)
    rain_brier = brier_score_loss(y_test[rain_idx], y_test_prob[rain_idx])

    # Regime 2: Heatwave conditions (T2M_MAX >= 38.0 C)
    heat_idx = (test_df['T2M_MAX'] >= 38.0)
    heat_acc = accuracy_score(y_test[heat_idx], y_test_pred[heat_idx]) if heat_idx.sum() > 0 else 0.0
    heat_brier = brier_score_loss(y_test[heat_idx], y_test_prob[heat_idx]) if heat_idx.sum() > 0 else 0.0

    # Regime 3: Ordinary / Mild weather (T2M_MAX < 38.0 and Actual Rain == 0)
    mild_idx = (test_df['T2M_MAX'] < 38.0) & (y_test == 0)
    mild_acc = accuracy_score(y_test[mild_idx], y_test_pred[mild_idx]) if mild_idx.sum() > 0 else 0.0
    mild_brier = brier_score_loss(y_test[mild_idx], y_test_prob[mild_idx]) if mild_idx.sum() > 0 else 0.0

    regime_breakdown = {
        "rainy_conditions": {
            "samples": int(rain_idx.sum()),
            "recall": round(float(rain_recall), 4),
            "brier_score": round(float(rain_brier), 4),
            "notes": "Sensitivity to precipitation events (critical for safety halts)"
        },
        "heatwave_conditions": {
            "samples": int(heat_idx.sum()),
            "accuracy": round(float(heat_acc), 4),
            "brier_score": round(float(heat_brier), 4),
            "notes": "Tmax >= 38C days (western dry belt & central basin summer)"
        },
        "ordinary_conditions": {
            "samples": int(mild_idx.sum()),
            "accuracy": round(float(mild_acc), 4),
            "brier_score": round(float(mild_brier), 4),
            "notes": "Clear/cloudy non-rain days"
        }
    }

    # 6. District Zone Performance Breakdown
    print("\nCalculating performance across regional climatic clusters...")
    test_df['y_true'] = y_test
    test_df['y_prob'] = y_test_prob
    test_df['y_pred'] = y_test_pred

    zone_metrics = {}
    zones = {
        "Coastal Zone": test_df[test_df['DISTANCE_TO_COAST'] <= 50.0],
        "Western Dry Belt": test_df[(test_df['LONGITUDE'] < 84.5) & (test_df['LATITUDE'] > 19.5)],
        "Highland Eastern Ghats": test_df[test_df['ELEVATION'] > 400.0],
        "Central & North Plains": test_df[(test_df['DISTANCE_TO_COAST'] > 50.0) & (test_df['ELEVATION'] <= 400.0) & (test_df['LONGITUDE'] >= 84.5)]
    }

    for zone_name, zdf in zones.items():
        if len(zdf) > 0:
            zone_metrics[zone_name] = {
                "samples": int(len(zdf)),
                "roc_auc": round(float(roc_auc_score(zdf['y_true'], zdf['y_prob'])), 4),
                "f1_score": round(float(f1_score(zdf['y_true'], zdf['y_pred'], zero_division=0)), 4),
                "brier_score": round(float(brier_score_loss(zdf['y_true'], zdf['y_prob'])), 4)
            }

    # 7. Calibration Curve points
    prob_true, prob_pred = calibration_curve(y_test, y_test_prob, n_bins=10)
    calibration_data = {
        "predicted_probabilities": [round(float(p), 4) for p in prob_pred],
        "empirical_probabilities": [round(float(p), 4) for p in prob_true]
    }

    # 8. Export Champion Model
    os.makedirs('model', exist_ok=True)
    model_path = 'model/weather_predictor_v2.pkl'
    print(f"\nExporting champion calibrated model to {model_path}...")
    joblib.dump(calibrated_hgb, model_path, compress=0)

    # 9. Export Comprehensive Research Metrics
    metadata = {
        "model_version": "2.2.0-calibrated-histgb",
        "trained_at": datetime.now().isoformat(),
        "training_data": {
            "source": "Simulated multi-year meteorological dataset calibrated against Odisha IMD normals",
            "districts_count": int(raw_df['District'].nunique()),
            "total_records": int(len(raw_df)),
            "train_range": "2019-01-01 to 2022-06-30",
            "val_range": "2022-07-01 to 2022-12-31",
            "test_range": "2023-01-01 to 2023-12-31",
            "train_samples": int(len(X_train)),
            "val_samples": int(len(X_val)),
            "test_samples": int(len(X_test)),
            "class_distribution_train_rain_pct": round(float(y_train.mean() * 100), 2),
            "class_distribution_test_rain_pct": round(float(y_test.mean() * 100), 2)
        },
        "feature_columns": FEATURE_COLUMNS,
        "selected_champion": "Calibrated Balanced HistGB",
        "cross_validation": {
            "method": "5-Fold District-Grouped K-Fold (train set)",
            "mean_roc_auc": round(float(np.mean(cv_auc_scores)), 4),
            "std_roc_auc": round(float(np.std(cv_auc_scores)), 4),
            "mean_brier_score": round(float(np.mean(cv_brier_scores)), 4),
            "std_brier_score": round(float(np.std(cv_brier_scores)), 4)
        },
        "benchmark_results": comparison,
        "regime_breakdown": regime_breakdown,
        "regional_zone_performance": zone_metrics,
        "calibration_curve": calibration_data,
        "scientific_disclaimer": (
            "The model provides calibrated precipitation probability based on meteorological covariates. "
            "It does not guarantee safety or absolute forecast accuracy. Official warnings from IMD and "
            "local disaster management authorities supersede ML probability estimates."
        )
    }

    metrics_path = 'model/model_metrics.json'
    with open(metrics_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved comprehensive research metrics to {metrics_path}.")

    return calibrated_hgb, metadata

if __name__ == '__main__':
    train_and_evaluate()
