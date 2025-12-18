#!/usr/bin/env python3
"""
Draws demand samples from prediction intervals and re-solves optimization to estimate
distributions of total cost / coverage / shortfall.
Inputs:
  data/predicted_demand_shift_pi.csv
  staff_roster.csv
  config/config.json
Outputs:
  data/mc_summary.csv   (per draw + per shift KPIs)
  analysis/mc_aggregate.json  (percentiles for managers)
"""

import os, json, math, random
import pandas as pd
import numpy as np
from collections import defaultdict

from optimize_staffing_core import solve_one # <- factor tiny core from optimize_staffing.py

def load_cfg(path="config/config.json"):
    with open(path,"r") as f: return json.load(f)

def load_shift_pi(path="data/predicted_demand_shift_pi.csv"):
    df = pd.read_csv(path)
    # expect: date, shift, predicted_patients, pi_lower, pi_upper
    return df

def sample_demand_row(row):
    # Simple uniform-in-PI draw (transparent). Could swap to Normal if desired.
    lo = float(row["pi_lower"]); hi = float(row["pi_upper"])
    if hi < lo: hi = lo
    return random.uniform(lo, hi)

def main():
    cfg = load_cfg()
    draws = int(cfg.get("uncertainty",{}).get("monteCarloDraws", 200))
    shifts = load_shift_pi()

    records = []
    for d in range(draws):
        for _, r in shifts.iterrows():
            sampled_demand = sample_demand_row(r)
            # solve_one(date, shift, demand, cfg) should return cost, capacity, shortfall, coverage
            sol = solve_one(r["date"], r["shift"], float(sampled_demand), cfg)
            records.append({
                "draw": d,
                "date": r["date"],
                "shift": r["shift"],
                "demand_sample": sampled_demand,
                **sol
            })

    out = pd.DataFrame(records)
    os.makedirs("data", exist_ok=True)
    os.makedirs("analysis", exist_ok=True)
    out.to_csv("data/mc_summary.csv", index=False)

    # Aggregate percentiles for managers (per shift)
    pct = (out.groupby(["date","shift"])
              .agg(cost_p50=("total_cost","median"),
                   cost_p90=("total_cost", lambda x: np.percentile(x,90)),
                   coverage_p50=("coverage_rate","median"),
                   coverage_p10=("coverage_rate", lambda x: np.percentile(x,10)),
                   shortfall_p90=("shortfall","median"))
              .reset_index().to_dict(orient="records"))

    with open("analysis/mc_aggregate.json","w") as f:
        json.dump({"draws": draws, "per_shift_stats": pct}, f, indent=2)

    print("[OK] data/mc_summary.csv")
    print("[OK] analysis/mc_aggregate.json")

if __name__ == "__main__":
    main()
