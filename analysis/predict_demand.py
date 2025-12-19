#!/usr/bin/env python3

"""
Assignment 2 - Predictive Analytics (Task 1)

This script trains a very simple demand forecast model for patient arrivals.

It does 3 big things:
1. Train a regression model using historical arrivals per hour.
2. Measure accuracy (R^2 and RMSE) on the most recent chunk of data.
3. Forecast the next day's demand per shift, with pessimistic / baseline / optimistic scenarios.

Inputs:
- config/config.json
- data/patient_arrivals_history.csv

Outputs:
- data/predicted_demand.csv          (forecast demand per shift per scenario)
- analysis/model_metrics.json        (R^2, RMSE, sample sizes)

"""

import os
import json
import math
from datetime import timedelta
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error


# --- helpers ---

def load_config(path="config/config.json"):
    with open(path, "r") as f:
        return json.load(f)

def load_history(path="../data/patient_arrivals_history.csv"):
    
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    df["hour"] = df["hour"].astype(int)
    df["arrivals"] = df["arrivals"].astype(float)

    if "is_weekend" not in df.columns:
        df["is_weekend"] = df["date"].dt.weekday.isin([5, 6]).astype(int)

    return df

def train_and_evaluate(df):
    
    df_sorted = df.sort_values(["date", "hour"]).reset_index(drop=True)

    X = df_sorted[["hour", "is_weekend"]].values
    y = df_sorted["arrivals"].values

    n = len(df_sorted)
    cutoff = int(max(1, math.floor(n * 0.8)))

    X_train, y_train = X[:cutoff], y[:cutoff]
    X_test,  y_test  = X[cutoff:], y[cutoff:]

    model = LinearRegression()
    model.fit(X_train, y_train)

    if len(X_test) > 0:
        y_pred = model.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    else:
        r2 = None
        rmse = None

    metrics = {
        "r2_score": r2,
        "rmse": rmse,
        "n_samples_total": int(n),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test))
    }

    return model, metrics, df_sorted

def build_next_day_hourly_frame(df_sorted):
    
    last_date = df_sorted["date"].max()
    next_date = last_date + timedelta(days=1)

    hours = list(range(24))
    future = pd.DataFrame({
        "date": [next_date] * 24,
        "hour": hours
    })
    future["is_weekend"] = future["date"].dt.weekday.isin([5, 6]).astype(int)
    return future

def predict_hourly(model, future_df):
   
    X_future = future_df[["hour", "is_weekend"]].values
    y_future = model.predict(X_future)
    future_df = future_df.copy()
    future_df["predicted_arrivals"] = y_future.clip(min=0)
    return future_df

def hour_to_shift(hour_int):
   
    h = int(hour_int)
    if 7 <= h <= 14:
        return "morning"
    elif 15 <= h <= 22:
        return "evening"
    else:
        return "night"

def roll_up_shifts(hourly_pred_df):
    
    tmp = hourly_pred_df.copy()
    tmp["shift"] = tmp["hour"].apply(hour_to_shift)

    shift_totals = (
        tmp.groupby(["date", "shift"], as_index=False)["predicted_arrivals"].sum()
    )
    shift_totals = shift_totals.rename(
        columns={"predicted_arrivals": "predicted_patients"}
    )
    # make date string for cleaner CSV
    shift_totals["date"] = shift_totals["date"].dt.strftime("%Y-%m-%d")

    return shift_totals

def apply_scenarios(shift_totals_df, config):
    
    pessim = config["forecastScenarios"]["pessimisticMultiplier"]
    base   = config["forecastScenarios"]["baselineMultiplier"]
    optim  = config["forecastScenarios"]["optimisticMultiplier"]

    rows = []
    for _, row in shift_totals_df.iterrows():
        for scenario_name, mult in [
            ("pessimistic", pessim),
            ("baseline",    base),
            ("optimistic",  optim)
        ]:
            rows.append({
                "date": row["date"],
                "shift": row["shift"],
                "scenario": scenario_name,
                "predicted_patients": float(row["predicted_patients"]) * float(mult)
            })

    return pd.DataFrame(rows)

def save_outputs(predicted_df, metrics):
    
    os.makedirs("../data", exist_ok=True)
    os.makedirs("../analysis", exist_ok=True)

    predicted_path = "../data/predicted_demand.csv"
    predicted_df.to_csv(predicted_path, index=False)

    metrics_path = "../analysis/model_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[OK] wrote {predicted_path}")
    print(f"[OK] wrote {metrics_path}")

# --- main ---

def main():
    print("Loading config/config.json ...")
    config = load_config()

    print("Loading data/patient_arrivals_history.csv ...")
    df_hist = load_history()

    if len(df_hist) < 30:
        print("WARNING: fewer than 30 rows in history. Expecting at least >= 30 observations.")

    print("Training simple regression model ...")
    model, metrics, df_sorted = train_and_evaluate(df_hist)

    print("Model metrics:")
    print(json.dumps(metrics, indent=2))

    print("Forecasting next day by hour ...")
    future_hours = build_next_day_hourly_frame(df_sorted)
    future_pred_hourly = predict_hourly(model, future_hours)

    print("Summarizing by shift ...")
    shift_totals = roll_up_shifts(future_pred_hourly)

    print("Applying pessimistic / baseline / optimistic scenarios ...")
    final_predictions = apply_scenarios(shift_totals, config)

    print("Saving outputs ...")
    save_outputs(final_predictions, metrics)

    
if __name__ == "__main__":
    main()
