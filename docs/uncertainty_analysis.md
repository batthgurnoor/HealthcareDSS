# Uncertainty Analysis

**What this covers:** how we measure uncertainty in the forecast, how we carry it into staffing decisions, and how to read the risk numbers in the UI (Planning Overview, Staffing Results, Manager Brief).

---

## 1) What uncertainty we model

- **Demand uncertainty:** patient arrivals change by hour and day. We show this as an 80% prediction interval (PI) for each hour, then roll it up to shifts.
- **Kept simple:** we keep “capacity per hour by role” fixed so the risk focus stays on demand (not on variable productivity).

---

## 2) How we get the prediction intervals (PIs)

- Train a simple, explainable model using just `hour` and `is_weekend` (0/1).  
- Compute the standard error and make **80% PIs** for each hour.  
- Roll hourly PIs up to shifts by summing the means and bounds.  
- Files created:
  - `data/predicted_demand_hourly_pi.csv`
  - `data/predicted_demand_shift_pi.csv`
  - `analysis/model_metrics.json` (has R^2, RMSE, and `pi_level`)

Why 80%? It’s a balanced first cut—wide enough to surface risk without forcing constant overstaffing.

---

## 3) How scenarios are created from the PIs

We pick five points inside the PI:
- worst (10%), low (30%), median (50%), high (70%), best (90%)

The script `analysis/build_scenarios_from_pi.py` does this and writes `data/scenario_demand.csv`.

---

## 4) How Monte Carlo shows risk

- We sample demand inside the PI bounds (uniform draw) for many runs (default 200).  
- For each sample, we re-run the staffing optimizer.  
- This gives distributions of **cost**, **coverage rate**, and **shortfall**.

Outputs:
- All draws: `data/mc_summary.csv`
- Per (date, shift) risk rollup: `analysis/mc_aggregate.json` (coverage percentiles, probability of shortfall)

How to read “probability of shortfall”: if it says 12%, that means in about 12 out of 100 simulated draws, demand was higher than capacity for that shift.

---

## 5) Where risk shows up in the UI

- **Planning Overview:** scenario compare (cost, coverage, shortfall rows).  
- **Staffing Results:** detailed rows per date/shift/scenario; you can overlay risk if Monte Carlo was run.  
- **Manager Brief:** compact table with cost, coverage, and shortfall probability.

---

## 6) Key assumptions and limits

- Simple model (hour + weekend): no holidays/seasonality yet.  
- Uniform draws inside PI: chosen for transparency; could be swapped for another distribution.  
- Fixed capacity per hour: real life varies (breaks, acuity), but we keep it constant to isolate demand risk.  
- Static roster: if risk is high, add staff or improve capacity per hour in config.

---

## 7) Manager levers 

- **PI level** (e.g., 80% vs 90%): higher = wider bounds and higher visible risk (and potentially higher staffing to cover).  
- **Scenario quantiles:** change to 0.05/0.25/0.50/0.75/0.95 to test more extreme cases.  
- **Capacity per hour by role:** small throughput gains can lower both cost and risk.  
- **Hours per shift:** changes total capacity and wage exposure.  
- **Roster size:** hiring/cross-training reduces shortfall probability.

---

## 8) Reading the metrics 

- **Average Coverage (%)**: how much predicted demand we cover on average. Closer to 100% is better.  
- **Rows with Shortfall**: how many date/shift rows have capacity gaps.  
- **Avg Chance of Shortfall (%)**: average risk across rows (from Monte Carlo).  
- **Total Cost ($)**: wage cost for that scenario or plan.

---

## 9) Reproducibility checklist

- Config in `config/config.json`: PI level, scenario quantiles, capacity per role, hours per shift, Monte Carlo draws, **seed** (for repeatable simulations).  
- Run order (`analysis/run_all.py`):
  1) `predict_demand_with_pi.py`
  2) `build_scenarios_from_pi.py`
  3) `optimize_scenarios.py`
  4) `monte_carlo_optimize.py`
  5) `export_manager_brief.py`
- Outputs are CSV/JSON and can be reloaded into the UI without code changes.
