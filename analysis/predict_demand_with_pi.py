#!/usr/bin/env python3
"""
Adds uncertainty to forecasts:
- Trains the same linear model (hour, is_weekend)
- Computes standard error of prediction and 80% prediction intervals
- Writes hourly and shift-level outputs with PI bounds
Outputs:
  data/predicted_demand_hourly_pi.csv
  data/predicted_demand_shift_pi.csv
  analysis/model_metrics.json   (extended with stderr, PI level)
"""

import os, json, math
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

def load_config(path="../config/config.json"):
    with open(path, "r") as f:
        return json.load(f)

def load_history(path="../data/patient_arrivals_history.csv"):
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    df["hour"] = df["hour"].astype(int)
    df["arrivals"] = df["arrivals"].astype(float)
    if "is_weekend" not in df.columns:
        df["is_weekend"] = df["date"].dt.weekday.isin([5,6]).astype(int)
    return df

def _design_matrix(df):
    # Intercept + hour + is_weekend (simple, transparent)
    X = np.column_stack([np.ones(len(df)), df["hour"].values, df["is_weekend"].values])
    return X

def train_model(df):
    df = df.sort_values(["date","hour"]).reset_index(drop=True)
    X = df[["hour","is_weekend"]].values
    y = df["arrivals"].values
    cut = max(1, int(0.8*len(df)))
    Xtr, ytr = X[:cut], y[:cut]
    Xte, yte = X[cut:], y[cut:]

    mdl = LinearRegression().fit(Xtr, ytr)
    metrics = {"r2_score": None, "rmse": None, "n_samples_total": len(df), "n_train": len(Xtr), "n_test": len(Xte)}
    if len(Xte)>0:
        yhat = mdl.predict(Xte)
        metrics["r2_score"] = float(r2_score(yte, yhat))
        metrics["rmse"] = float(math.sqrt(mean_squared_error(yte, yhat)))
    return mdl, metrics, df

def build_next_day(df):
    next_date = df["date"].max() + pd.Timedelta(days=1)
    hourly = pd.DataFrame({"date":[next_date]*24,"hour":list(range(24))})
    hourly["is_weekend"] = hourly["date"].dt.weekday.isin([5,6]).astype(int)
    return hourly

def prediction_intervals(model, train_df, future_hourly, pi_level=0.80):
    """
    Compute classic linear-regression prediction intervals:
    yhat(x) ± t * s * sqrt(1 + x'(X'X)^(-1)x)
    using a simple design (intercept, hour, is_weekend).
    """
    # Build training design matrix
    Xtr = _design_matrix(train_df)
    ytr = train_df["arrivals"].values
    n, p = Xtr.shape
    # Residual variance
    ytr_hat = model.predict(train_df[["hour","is_weekend"]].values)
    resid = ytr - ytr_hat
    s2 = np.sum(resid**2) / max(1, n - p)
    s = math.sqrt(s2)

    # (X'X)^(-1)
    XtX_inv = np.linalg.pinv(Xtr.T @ Xtr)

    # t-crit (approx normal for simplicity, OK for MVP)
    from scipy.stats import t
    alpha = 1.0 - pi_level
    tcrit = t.ppf(1 - alpha/2, df=max(1, n - p))

    # Future design rows
    Xf = _design_matrix(future_hourly)
    yhat = model.predict(future_hourly[["hour","is_weekend"]].values)

    se_pred = np.sqrt(np.maximum(0.0, 1 + np.sum(Xf @ XtX_inv * Xf, axis=1))) * s
    lo = yhat - tcrit * se_pred
    hi = yhat + tcrit * se_pred

    out = future_hourly.copy()
    out["predicted_arrivals"] = np.clip(yhat, 0, None)
    out["pi_lower"] = np.clip(lo, 0, None)
    out["pi_upper"] = np.clip(hi, 0, None)
    out["date"] = out["date"].dt.strftime("%Y-%m-%d")
    return out

def hour_to_shift(h):
    h = int(h)
    if 7<=h<=14: return "morning"
    if 15<=h<=22: return "evening"
    return "night"

def roll_to_shifts(df_hour):
    tmp = df_hour.copy()
    tmp["shift"] = tmp["hour"].apply(hour_to_shift)
    agg = tmp.groupby(["date","shift"], as_index=False).agg(
        predicted_patients=("predicted_arrivals","sum"),
        pi_lower=("pi_lower","sum"),
        pi_upper=("pi_upper","sum"),
    )
    return agg

def main():
    print("Loading config & data ...")
    cfg = load_config()
    df = load_history()
    pi_level = float(cfg.get("uncertainty",{}).get("predictionIntervalLevel", 0.80))

    print("Training model ...")
    mdl, metrics, df_sorted = train_model(df)
    metrics["pi_level"] = pi_level

    print("Predicting next day with PIs ...")
    future_hourly = build_next_day(df_sorted)
    hourly_pi = prediction_intervals(mdl, df_sorted, future_hourly, pi_level=pi_level)
    shift_pi  = roll_to_shifts(hourly_pi)

    os.makedirs("data", exist_ok=True)
    os.makedirs("analysis", exist_ok=True)

    hourly_pi.to_csv("data/predicted_demand_hourly_pi.csv", index=False)
    shift_pi.to_csv("data/predicted_demand_shift_pi.csv", index=False)

    with open("analysis/model_metrics.json","w") as f:
        json.dump(metrics, f, indent=2)

    print("[OK] data/predicted_demand_hourly_pi.csv")
    print("[OK] data/predicted_demand_shift_pi.csv")
    print("[OK] analysis/model_metrics.json")

if __name__ == "__main__":
    main()
