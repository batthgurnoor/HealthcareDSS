#!/usr/bin/env python3
"""
Optimizes staffing for each (date, shift, scenario) in data/scenario_demand.csv
using the shared core solver.
Writes:
  data/scenario_staffing_plan.csv
  data/scenario_staffing_summary.csv
  analysis/scenario_compare.json (rollups)
"""

import os, json
import pandas as pd
from optimize_staffing_core import solve_one, summarize_roster  # uses your core

def load_config(path="config/config.json"):
    with open(path, "r") as f:
        return json.load(f)

def load_scenario_demand(path="data/scenario_demand.csv"):
    df = pd.read_csv(path)

    # sanity check columns
    required = {"date", "shift", "scenario", "predicted_patients"}
    missing = required - set(c.lower() for c in df.columns)
    if missing:
        raise ValueError(f"Missing required column(s) in {path}: {', '.join(sorted(missing))}")
    df.columns = [c.strip().lower() for c in df.columns]

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["shift"] = df["shift"].astype(str).str.strip().str.lower()      
    df["scenario"] = df["scenario"].astype(str).str.strip().str.lower() 
    df["predicted_patients"] = pd.to_numeric(df["predicted_patients"], errors="coerce").fillna(0.0).clip(lower=0.0)

    return df.sort_values(["date", "shift", "scenario"]).reset_index(drop=True)


def main():
    print("Loading config and scenario demand ...")
    cfg = load_config()
    demand = load_scenario_demand()

    roster_path = "public/samples/staff_roster.csv"  # keep same path you used
    roles, avail_by_role, wage_by_role = summarize_roster(roster_path)
    hours = int(cfg["staffing"]["defaultHoursPerShift"])
    cap_per_hr = cfg["staffing"]["capacityPerHourByRole"]

    plan_rows = []
    summary_rows = []

    for _, row in demand.iterrows():
        date, shift, scen = row["date"], row["shift"], row["scenario"]
        demand_val = float(row["predicted_patients"])
        kpis = solve_one(date, shift, demand_val, cfg, roster_path=roster_path)

        # per-role detail
        for r in roles:
            staff = kpis["chosen"].get(r, 0)
            role_cap = float(cap_per_hr.get(r, 0.0)) * hours * staff
            role_cost = float(wage_by_role.get(r, 0.0)) * hours * staff
            plan_rows.append({
                "date": date, "shift": shift, "scenario": scen, "role": r,
                "staff_available": int(avail_by_role.get(r,0)),
                "staff_scheduled": staff,
                "role_capacity": round(role_cap,2),
                "role_cost": round(role_cost,2),
                "predicted_patients": round(demand_val,2),
                "total_capacity_all_roles": round(kpis["total_capacity"],2),
                "shortfall_all_roles": round(kpis["shortfall"],2),
                "status": kpis["status"]
            })

        summary_rows.append({
            "date": date, "shift": shift, "scenario": scen,
            "predicted_patients": round(demand_val,2),
            "total_capacity": round(kpis["total_capacity"],2),
            "shortfall": round(kpis["shortfall"],2),
            "total_cost": round(kpis["total_cost"],2),
            "coverage_rate": round(0.0 if demand_val<=0 else min(1.0, kpis["total_capacity"]/demand_val), 3),
            "status": kpis["status"]
        })

    os.makedirs("data", exist_ok=True)
    os.makedirs("analysis", exist_ok=True)
    plan_path = "data/scenario_staffing_plan.csv"
    summ_path = "data/scenario_staffing_summary.csv"
    pd.DataFrame(plan_rows).to_csv(plan_path, index=False)
    pd.DataFrame(summary_rows).to_csv(summ_path, index=False)

    # Simple per-scenario rollups for an at-a-glance compare
    by_scen = (pd.DataFrame(summary_rows)
               .groupby("scenario", as_index=False)
               .agg(total_cost=("total_cost","sum"),
                    avg_coverage=("coverage_rate","mean"),
                    shortfall_rows=("shortfall", lambda s: int((s>0).sum()))))

    compare = by_scen.sort_values("scenario").to_dict(orient="records")
    with open("analysis/scenario_compare.json","w") as f:
        json.dump({"compare": compare}, f, indent=2)

    print(f"[OK] wrote {plan_path}")
    print(f"[OK] wrote {summ_path}")
    print(f"[OK] wrote analysis/scenario_compare.json")

if __name__ == "__main__":
    main()
