#!/usr/bin/env python3


import os
import json
import math
import pandas as pd
from collections import defaultdict
import pulp


def load_config(path="config/config.json"):
    with open(path, "r") as f:
        return json.load(f)

def load_predicted_demand(path="data/predicted_demand.csv"):
    
    df = pd.read_csv(path)
    # normalize text
    for col in ["shift", "scenario"]:
        df[col] = df[col].astype(str).str.strip().str.lower()
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["predicted_patients"] = df["predicted_patients"].astype(float).clip(lower=0.0)
    return df

def load_staff_roster(path="public/samples/staff_roster.csv"):
   
    df = pd.read_csv(path)
    df["role"] = df["role"].astype(str).str.strip()
    df["wage_per_hour"] = df["wage_per_hour"].astype(float)
    return df

def summarize_roster(roster_df):
   
    grouped = roster_df.groupby("role", as_index=False).agg(
        available_headcount=("staff_id", "count"),
        avg_wage=("wage_per_hour", "mean")
    )
    # turn into dicts
    avail = dict(zip(grouped["role"], grouped["available_headcount"]))
    avg_wage = dict(zip(grouped["role"], grouped["avg_wage"]))
    return avail, avg_wage



def optimize_one(demand_row, roles, avail_by_role, wage_by_role, cap_per_hour_by_role, hours_per_shift):
    
    date = demand_row["date"]
    shift = demand_row["shift"]
    scenario = demand_row["scenario"]
    demand = float(demand_row["predicted_patients"])

    
    prob_name = f"opt_{date}_{shift}_{scenario}"
    prob = pulp.LpProblem(prob_name, sense=pulp.LpMinimize)

    
    x_vars = {
        r: pulp.LpVariable(f"x_{r}", lowBound=0, upBound=avail_by_role.get(r, 0), cat=pulp.LpInteger)
        for r in roles
    }

    
    cost_terms = []
    for r in roles:
        wage = wage_by_role.get(r, 0.0)
        cost_terms.append(wage * hours_per_shift * x_vars[r])
    prob += pulp.lpSum(cost_terms)

    cap_terms = []
    for r in roles:
        cap_hr = float(cap_per_hour_by_role.get(r, 0.0))
        cap_terms.append(cap_hr * hours_per_shift * x_vars[r])
    prob += pulp.lpSum(cap_terms) >= demand, "capacity_meets_demand"

    # Solve
    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    # Collect results
    status = pulp.LpStatus[prob.status]
    solution = {}
    total_cost = 0.0
    total_capacity = 0.0

    for r in roles:
        val = int(pulp.value(x_vars[r])) if status == "Optimal" else 0
        role_capacity = float(cap_per_hour_by_role.get(r, 0.0)) * hours_per_shift * val
        role_cost = float(wage_by_role.get(r, 0.0)) * hours_per_shift * val

        solution[r] = {
            "staff_scheduled": val,
            "role_capacity": role_capacity,
            "role_cost": role_cost,
            "staff_available": int(avail_by_role.get(r, 0))
        }
        total_capacity += role_capacity
        total_cost += role_cost

    shortfall = max(0.0, demand - total_capacity)

    kpis = {
        "status": status,
        "date": date,
        "shift": shift,
        "scenario": scenario,
        "predicted_patients": demand,
        "total_capacity": total_capacity,
        "shortfall": shortfall,
        "total_cost": total_cost
    }

    return solution, kpis


# ---------------- Main pipeline ----------------

def main():
    print("Loading config/config.json ...")
    config = load_config()

    hours_per_shift = int(config.get("staffing", {}).get("defaultHoursPerShift", 8))
    cap_per_hour_by_role = config.get("staffing", {}).get("capacityPerHourByRole", {})

    print("Loading data/predicted_demand.csv ...")
    demand_df = load_predicted_demand()


    demand_df = demand_df.sort_values(["date", "shift", "scenario"]).reset_index(drop=True)

    print("Loading staff_roster.csv ...")
    roster_df = load_staff_roster()
    avail_by_role, wage_by_role = summarize_roster(roster_df)
    roles = sorted(avail_by_role.keys())

    print(f"Roles in roster: {roles}")
    print(f"Hours per shift: {hours_per_shift}")
    print(f"Capacity/hour by role (from config): {cap_per_hour_by_role}")

    plan_rows = []
    summary_rows = []


    for _, row in demand_df.iterrows():
        solution, kpis = optimize_one(
            demand_row=row,
            roles=roles,
            avail_by_role=avail_by_role,
            wage_by_role=wage_by_role,
            cap_per_hour_by_role=cap_per_hour_by_role,
            hours_per_shift=hours_per_shift
        )

   
        for r in roles:
            plan_rows.append({
                "date": kpis["date"],
                "shift": kpis["shift"],
                "scenario": kpis["scenario"],
                "role": r,
                "staff_available": solution[r]["staff_available"],
                "staff_scheduled": solution[r]["staff_scheduled"],
                "role_capacity": round(solution[r]["role_capacity"], 2),
                "role_cost": round(solution[r]["role_cost"], 2),
                "predicted_patients": round(kpis["predicted_patients"], 2),
                "total_capacity_all_roles": round(kpis["total_capacity"], 2),
                "shortfall_all_roles": round(kpis["shortfall"], 2),
                "status": kpis["status"]
            })

        summary_rows.append({
            "date": kpis["date"],
            "shift": kpis["shift"],
            "scenario": kpis["scenario"],
            "predicted_patients": round(kpis["predicted_patients"], 2),
            "total_capacity": round(kpis["total_capacity"], 2),
            "shortfall": round(kpis["shortfall"], 2),
            "total_cost": round(kpis["total_cost"], 2),
            "coverage_rate": round(0.0 if kpis["predicted_patients"] <= 0 else min(1.0, kpis["total_capacity"] / kpis["predicted_patients"]), 3),
            "status": kpis["status"]
        })


    os.makedirs("data", exist_ok=True)
    os.makedirs("analysis", exist_ok=True)

    plan_path = "data/staffing_plan.csv"
    summary_path = "data/staffing_summary.csv"
    json_path = "analysis/optimize_report.json"

    pd.DataFrame(plan_rows).to_csv(plan_path, index=False)
    pd.DataFrame(summary_rows).to_csv(summary_path, index=False)

    with open(json_path, "w") as f:
        json.dump({"summary": summary_rows}, f, indent=2)

    print(f"[OK] wrote {plan_path}")
    print(f"[OK] wrote {summary_path}")
    print(f"[OK] wrote {json_path}")
   


if __name__ == "__main__":
    main()
