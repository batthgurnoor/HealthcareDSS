#!/usr/bin/env python3
"""
Reads data/predicted_demand_shift_pi.csv and creates 5 scenario demand rows
using quantiles in config["uncertainty"]["scenarioQuantiles"].
Writes: data/scenario_demand.csv
"""

import os, json
import pandas as pd
import numpy as np

def load_config(path="../config/config.json"):
    with open(path, "r") as f:
        return json.load(f)

def load_shift_pi(path="data/predicted_demand_shift_pi.csv"):
    df = pd.read_csv(path)
    # expected columns: date, shift, predicted_patients, pi_lower, pi_upper
    # (predicted_patients is the mean; we’ll derive quantiles by linear interp within PI)
    return df

def quantile_within_pi(row, q):
    lo = float(row["pi_lower"])
    hi = float(row["pi_upper"])
    if hi < lo: hi = lo
    return lo + q * (hi - lo)

def scenario_name_for(q):
    # 0.10,0.30,0.50,0.70,0.90 -> worst, low, median, high, best (plain names)
    mapping = {0.10: "worst", 0.30: "low", 0.50: "median", 0.70: "high", 0.90: "best"}
    return mapping.get(round(q,2), f"q{int(q*100)}")

def main():
    cfg = load_config()
    quantiles = cfg.get("uncertainty", {}).get("scenarioQuantiles", [0.10, 0.30, 0.50, 0.70, 0.90])
    df = load_shift_pi()

    out_rows = []
    for _, r in df.iterrows():
        for q in quantiles:
            demand_q = quantile_within_pi(r, float(q))
            out_rows.append({
                "date": r["date"],
                "shift": str(r["shift"]).lower().strip(),
                "scenario": scenario_name_for(float(q)),
                "predicted_patients": round(max(0.0, demand_q), 2)
            })

    out = pd.DataFrame(out_rows).sort_values(["date","shift","scenario"]).reset_index(drop=True)
    os.makedirs("data", exist_ok=True)
    out.to_csv("data/scenario_demand.csv", index=False)
    print("[OK] wrote data/scenario_demand.csv")

if __name__ == "__main__":
    main()
