#!/usr/bin/env python3

import os
import json
import pandas as pd
from optimize_staffing_core import solve_one, summarize_roster 

def load_config(path="../config/config.json"):
    with open(path, "r") as f:
        return json.load(f)

def load_predicted_demand(path="../data/predicted_demand.csv"):
    df = pd.read_csv(path)
    # normalize text
    for col in ["shift", "scenario"]:
        df[col] = df[col].astype(str).str.strip().str.lower()
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["predicted_patients"] = df["predicted_patients"].astype(float).clip(lower=0.0)
    return df

# --- REMOVED: local load_staff_roster / summarize_roster / optimize_one ---

def main():
    print("Loading config/config.json ...")
    config = load_config()

    hours_per_shift = int(config.get("staffing", {}).get("defaultHoursPerShift", 8))
    cap_per_hour_by_role = config.get("staffing", {}).get("capacityPerHourByRole", {})

    print("Loading data/predicted_demand.csv ...")
    demand_df = load_predicted_demand()
    demand_df = demand_df.sort_values(["date", "shift", "scenario"]).reset_index(drop=True)

    # Use the shared core to summarize the roster (from the file you already use)
    roster_path = "../public/samples/staff_roster.csv"
    roles, avail_by_role, wage_by_role = summarize_roster(roster_path)
    print(f"Roles in roster: {roles}")
    print(f"Hours per shift: {hours_per_shift}")
    print(f"Capacity/hour by role (from config): {cap_per_hour_by_role}")

    plan_rows = []
    summary_rows = []

    for _, row in demand_df.iterrows():
        date = row["date"]
        shift = row["shift"]
        scenario = row["scenario"]
        demand = float(row["predicted_patients"])

        # --- Use the core solver for this (date, shift) ---
        kpis = solve_one(date, shift, demand, config, roster_path=roster_path)

        # Keep your per-role output (using chosen counts from the core)
        for r in roles:
            staff_scheduled = kpis["chosen"].get(r, 0)
            role_capacity = float(cap_per_hour_by_role.get(r, 0.0)) * kpis["hours"] * staff_scheduled
            role_cost = float(wage_by_role.get(r, 0.0)) * kpis["hours"] * staff_scheduled

            plan_rows.append({
                "date": date,
                "shift": shift,
                "scenario": scenario,
                "role": r,
                "staff_available": int(avail_by_role.get(r, 0)),
                "staff_scheduled": staff_scheduled,
                "role_capacity": round(role_capacity, 2),
                "role_cost": round(role_cost, 2),
                "predicted_patients": round(demand, 2),
                "total_capacity_all_roles": round(kpis["total_capacity"], 2),
                "shortfall_all_roles": round(kpis["shortfall"], 2),
                "status": kpis["status"]
            })

        summary_rows.append({
            "date": date,
            "shift": shift,
            "scenario": scenario,
            "predicted_patients": round(demand, 2),
            "total_capacity": round(kpis["total_capacity"], 2),
            "shortfall": round(kpis["shortfall"], 2),
            "total_cost": round(kpis["total_cost"], 2),
            "coverage_rate": round(0.0 if demand <= 0 else min(1.0, kpis["total_capacity"] / demand), 3),
            "status": kpis["status"]
        })

    os.makedirs("../data", exist_ok=True)
    os.makedirs("../analysis", exist_ok=True)

    plan_path = "../data/staffing_plan.csv"
    summary_path = "../data/staffing_summary.csv"
    json_path = "../analysis/optimize_report.json"

    pd.DataFrame(plan_rows).to_csv(plan_path, index=False)
    pd.DataFrame(summary_rows).to_csv(summary_path, index=False)

    with open(json_path, "w") as f:
        json.dump({"summary": summary_rows}, f, indent=2)

    print(f"[OK] wrote {plan_path}")
    print(f"[OK] wrote {summary_path}")
    print(f"[OK] wrote {json_path}")

if __name__ == "__main__":
    main()
