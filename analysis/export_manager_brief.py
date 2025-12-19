#!/usr/bin/env python3
"""
Creates a small, manager-friendly rollup from:
  - data/scenario_staffing_summary.csv
  - data/mc_summary.csv (optional risk column)

Outputs:
  data/manager_brief.csv    (table)
  analysis/manager_brief.json (same info in JSON)
"""

import os, json
import pandas as pd
import numpy as np

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCEN_SUMM = os.path.join(BASE, "data", "scenario_staffing_summary.csv")
MC_SUMM   = os.path.join(BASE, "data", "mc_summary.csv")
OUT_CSV   = os.path.join(BASE, "data", "manager_brief.csv")
OUT_JSON  = os.path.join(BASE, "analysis", "manager_brief.json")

def maybe_load_mc():
    if not os.path.exists(MC_SUMM):
        return None
    mc = pd.read_csv(MC_SUMM)
    # probability of shortfall per (date, shift)
    g = (mc.assign(shortfall=(mc["shortfall"]>0).astype(int))
           .groupby(["date","shift"], as_index=False)
           .agg(prob_shortfall=("shortfall","mean")))
    return g

def main():
    if not os.path.exists(SCEN_SUMM):
        raise FileNotFoundError(f"Missing {SCEN_SUMM} — run optimize_scenarios.py first.")

    df = pd.read_csv(SCEN_SUMM)
    df["scenario"] = df["scenario"].astype(str).str.strip().str.lower()

    # Optional risk merge
    mc = maybe_load_mc()
    if mc is not None:
        key = ["date","shift"]
        df = df.merge(mc, on=key, how="left")
    else:
        df["prob_shortfall"] = np.nan

    # Rollup per scenario
    roll = (df.groupby("scenario", as_index=False)
              .agg(total_cost=("total_cost","sum"),
                   avg_coverage=("coverage_rate","mean"),
                   rows_with_shortfall=("shortfall", lambda s: int((s>0).sum())),
                   avg_shortfall_probability=("prob_shortfall","mean")))

    # Round & fill
    roll["total_cost"] = roll["total_cost"].round(2)
    roll["avg_coverage"] = (roll["avg_coverage"]*100).round(1)  # %
    roll["avg_shortfall_probability"] = (roll["avg_shortfall_probability"]*100).round(1)  # %

    # Save
    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    roll.to_csv(OUT_CSV, index=False)
    with open(OUT_JSON, "w") as f:
        json.dump(roll.to_dict(orient="records"), f, indent=2)

    print(f"[OK] {OUT_CSV}")
    print(f"[OK] {OUT_JSON}")

if __name__ == "__main__":
    main()
