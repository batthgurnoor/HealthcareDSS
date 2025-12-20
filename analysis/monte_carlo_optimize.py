#!/usr/bin/env python3
import os, json, random
import pandas as pd
import numpy as np
from optimize_staffing_core import solve_one  # reuse your core

def load_cfg(path="../config/config.json"):
    with open(path,"r") as f: return json.load(f)

def load_shift_pi(path="../data/predicted_demand_shift_pi.csv"):
    return pd.read_csv(path)

def sample_demand(lo, hi):
    if hi < lo: hi = lo
    return random.uniform(lo, hi)

def main():
    cfg = load_cfg()
    draws = int(cfg.get("uncertainty",{}).get("monteCarloDraws", 200))
    df = load_shift_pi()

    seed = cfg.get("uncertainty", {}).get("seed")
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    recs = []
    for d in range(draws):
        for _, r in df.iterrows():
            demand = sample_demand(float(r["pi_lower"]), float(r["pi_upper"]))
            k = solve_one(r["date"], str(r["shift"]).lower().strip(), float(demand), cfg,
                          roster_path="../public/samples/staff_roster.csv")
            recs.append({
                "draw": d,
                "date": r["date"],
                "shift": str(r["shift"]).lower().strip(),
                "demand_sample": demand,
                "total_cost": k["total_cost"],
                "coverage_rate": k["coverage_rate"],
                "shortfall": k["shortfall"]
            })

    os.makedirs("data", exist_ok=True)
    os.makedirs("analysis", exist_ok=True)

    out = pd.DataFrame(recs)
    out.to_csv("../data/mc_summary.csv", index=False)

    # quick aggregate (per shift): probability of shortfall + coverage percentiles
    def pct(a, q): return float(np.percentile(a, q))
    g = out.groupby(["date","shift"])
    agg = g.agg(
        draws=("draw","nunique"),
        prob_shortfall=("shortfall", lambda s: float((s>0).mean())),
        coverage_p10=("coverage_rate", lambda s: pct(s, 10)),
        coverage_p50=("coverage_rate", "median"),
        coverage_p90=("coverage_rate", lambda s: pct(s, 90))
    ).reset_index()

    agg.to_json("../analysis/mc_aggregate.json", orient="records", indent=2)
    print("[OK] data/mc_summary.csv")
    print("[OK] analysis/mc_aggregate.json")

if __name__ == "__main__":
    main()
