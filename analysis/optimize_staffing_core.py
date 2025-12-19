# analysis/optimize_staffing_core.py
import pandas as pd
import pulp


def summarize_roster(roster_path="public/samples/staff_roster.csv"):
    """
    Summarize roster by role:
      - available headcount per role
      - average wage per hour per role
    """
    df = pd.read_csv(roster_path)
    by = df.groupby("role", as_index=False).agg(
        available=("staff_id", "count"),
        wage=("wage_per_hour", "mean"),
    )
    roles = sorted(by["role"].tolist())
    available_by_role = dict(zip(by["role"], by["available"]))
    wage_by_role = dict(zip(by["role"], by["wage"]))
    return roles, available_by_role, wage_by_role

def solve_one(date, shift, demand, cfg, roster_path="staff_roster.csv"):
    """
    Solve a single (date, shift) problem with integer headcounts per role.
    Returns totals AND chosen counts per role so you can keep your plan rows.
    """
    hours = int(cfg.get("staffing", {}).get("defaultHoursPerShift", 8))
    cap_per_hr = cfg.get("staffing", {}).get("capacityPerHourByRole", {})

    roles, avail_by_role, wage_by_role = summarize_roster(roster_path)

    prob = pulp.LpProblem(f"opt_{date}_{shift}", sense=pulp.LpMinimize)
    x = {
        r: pulp.LpVariable(f"x_{r}", lowBound=0, upBound=avail_by_role.get(r, 0), cat=pulp.LpInteger)
        for r in roles
    }
    # Minimize wage * hours * headcount
    prob += pulp.lpSum(wage_by_role[r] * hours * x[r] for r in roles)
    # Capacity >= demand
    prob += pulp.lpSum(float(cap_per_hr.get(r, 0.0)) * hours * x[r] for r in roles) >= float(demand), "cover"

    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    chosen = {r: int(pulp.value(x[r])) for r in roles}
    total_capacity = sum(float(cap_per_hr.get(r, 0.0)) * hours * chosen[r] for r in roles)
    total_cost = sum(wage_by_role[r] * hours * chosen[r] for r in roles)
    shortfall = max(0.0, float(demand) - total_capacity)
    coverage_rate = 0.0 if float(demand) <= 0 else min(1.0, total_capacity / float(demand))

    return {
        "roles": roles,
        "available_by_role": avail_by_role,
        "wage_by_role": wage_by_role,
        "hours": hours,
        "cap_per_hr": cap_per_hr,
        "chosen": chosen,
        "total_capacity": total_capacity,
        "total_cost": total_cost,
        "shortfall": shortfall,
        "coverage_rate": coverage_rate,
        "status": "Optimal" if shortfall == 0 else "Feasible",
    }
