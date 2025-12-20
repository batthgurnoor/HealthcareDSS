# Integration & Architecture (Final Project)

**Project:** Healthcare DSS -- Inventory, Patient Flow, Staffing, ROI  
**Goal:** Show how the uncertainty-aware predictive and prescriptive pieces connect to the DSS. Include business KPIs, clear contracts, and a simple deployment/run plan.

---

## 1) End-to-end data flow

```
Historical arrivals (CSV)
    |
    v
[Predictive model] analysis/predict_demand_with_pi.py
  - trains regression on hour + weekend flag
  - computes R^2, RMSE, and 80% prediction intervals
  - writes hourly and shift PIs
    |
    v
Shift forecast with PI = data/predicted_demand_shift_pi.csv
    |
    v
[Scenario generator] analysis/build_scenarios_from_pi.py
  - maps PI quantiles to 5 scenarios (worst/low/median/high/best)
  - writes data/scenario_demand.csv
    |
    v
[Scenario optimizer] analysis/optimize_scenarios.py
  - reads scenario_demand + roster + config capacities
  - minimizes labor cost with coverage constraints
  - writes scenario_staffing_plan.csv and scenario_staffing_summary.csv
    |
    v
[Monte Carlo coverage] analysis/monte_carlo_optimize.py
  - samples demand within PI bounds, resolves staffing
  - writes data/mc_summary.csv and analysis/mc_aggregate.json
    |
    v
[Manager rollup] analysis/export_manager_brief.py
  - combines scenario KPIs + Monte Carlo shortfall risk
  - writes data/manager_brief.csv and analysis/manager_brief.json
    |
    v
UI
  - StaffingResults.jsx loads scenario_staffing_summary.csv or manager_brief.csv
  - ROI.jsx uses staffing totals; narrative can include risk bands
```

`analysis/run_all.py` orchestrates the full sequence (forecast -> scenarios -> scenario optimization -> Monte Carlo -> manager brief).

**Why this matters:**  
- Prediction intervals flow into scenarios; scenarios and Monte Carlo drive coverage/cost/risk KPIs.  
- Optimizer outputs feed the UI and ROI, keeping decisions auditable and reproducible.

---

## 2) Business KPIs

These KPIs appear in CSVs/JSON and the UI so non-technical readers can judge value quickly.

### Forecast (predictive)
- **R^2** — variance explained (higher is better)  
+- **RMSE** — average prediction error (lower is better)  
*- **PI bounds (80%)** — lower/upper demand envelopes per shift (used for scenarios and Monte Carlo)

### Staffing (prescriptive + scenarios)
- **Coverage rate** = min(1, capacity / demand)  
- **Shortfall (patients)** = max(0, demand - capacity)  
- **Total labor cost (per date/shift)** = wage * hours * headcount  
- **Cost per predicted patient** = cost / demand (when demand > 0)

### Risk (Monte Carlo + rollups)
- **Probability of shortfall** per shift  
- **Coverage percentiles** (e.g., P10, P50, P90)  
- **Scenario compare** — cost, average coverage, and shortfall rows by scenario  
- **Manager brief** — compact table with cost, coverage, and shortfall probability

Rollups live in `analysis/model_metrics.json`, `analysis/scenario_compare.json`, `analysis/mc_aggregate.json`, `data/scenario_staffing_summary.csv`, and `data/manager_brief.csv`.

---

## 3) API design (documentation only)

If we deploy later, two endpoints clarify contracts between UI and analytics.

### POST `/api/forecast`
Purpose: Train/run forecast with prediction intervals.  
Request (JSON): minimal, could include `pi_level` and horizon.  
Response (JSON): metrics (R^2, RMSE, pi_level) + shift rows with `predicted_patients`, `pi_lower`, `pi_upper`.

### POST `/api/optimize`
Purpose: Create staffing plans that cover forecasted demand with minimum cost.  
Request (JSON): array of `{date, shift, scenario, predicted_patients}`, plus hoursPerShift and capacityPerHourByRole.  
Response (JSON): per-role plan rows + KPIs (`totalCapacity`, `predictedPatients`, `shortfall`, `totalCost`, `coverageRate`) per scenario/shift, plus rollups for scenario comparison.

> Note: scripts + CSVs are sufficient for this project. This API sketch documents a clean interface for future work.

---

## 4) Governance, config, and reproducibility

- **No hidden constants:** All key assumptions live in `config/config.json` (hours per shift, capacity per hour by role, finance rates, uncertainty block with PI level, Monte Carlo draws, scenario quantiles).  
- **Clear inputs/outputs:**  
  - Inputs: `data/patient_arrivals_history.csv`, `public/samples/staff_roster.csv`  
  - Predictive outputs: `data/predicted_demand_hourly_pi.csv`, `data/predicted_demand_shift_pi.csv`, `analysis/model_metrics.json`  
  - Scenario outputs: `data/scenario_demand.csv`, `data/scenario_staffing_plan.csv`, `data/scenario_staffing_summary.csv`, `analysis/scenario_compare.json`  
  - Monte Carlo: `data/mc_summary.csv`, `analysis/mc_aggregate.json`  
  - Manager rollup: `data/manager_brief.csv`, `analysis/manager_brief.json`
- **How to re-run from scratch:**  
  1) `python analysis/run_all.py`  
  2) Load `scenario_staffing_summary.csv` or `manager_brief.csv` in StaffingResults.jsx  
  3) Use ROI with updated staffing totals for finance impact

---

## 5) Deployment plan

**Goal:** Simple, cheap, and easy to maintain; ready to grow.

- **Runtime choice:** Single-machine setup is enough: React app built with Vite and served as static files (e.g., Nginx/Netlify). Analytics run as batch Python scripts locally. A thin FastAPI wrapper could expose forecast/optimize later; all can live in one Docker image.
- **Environments:** Start with dev (local). If sharing, add a lightweight staging deploy with sample data. Production is out of scope but supported by the same contracts.
- **Data handling:** Keep CSV I/O to avoid DB setup. If volume grows, move to SQLite/Postgres and keep the same schemas. Config stays JSON so parameter changes require no code edits.
- **Scheduling:** For daily runs, a cron/CI job can call `analysis/run_all.py`, publish the CSV/JSON artifacts, and make them available to the UI.
- **Scalability:** Small LPs/greedy assignments solve fast. CBC (PuLP default) is fine. For larger instances, swap to OR-Tools/other solvers without changing the model structure.
- **Observability:** Track R^2/RMSE and PI level for forecasts; coverage/cost/shortfall for scenarios; probability of shortfall and coverage percentiles for Monte Carlo. Alert if RMSE or shortfall probability spikes.
- **Security:** No PHI; data is aggregate arrivals and wages. Restrict repo access, don’t commit sensitive CSVs, avoid public artifact links.
- **Change management:** Parameters live in `config.json`. Version changes in Git, review with ops/finance, and document in release notes for auditability.

---

## 6) What changed vs. Assignment 1

- Added forecast with prediction intervals (`predict_demand_with_pi.py`)  
- Added scenario generation from PI quantiles and scenario optimization (`build_scenarios_from_pi.py`, `optimize_scenarios.py`)  
- Added Monte Carlo coverage/shortfall risk and a manager brief rollup (`monte_carlo_optimize.py`, `export_manager_brief.py`)  
- Added `analysis/run_all.py` to orchestrate the full uncertainty pipeline  
- UI consumes new CSVs (scenario summaries, manager brief) while keeping the original pages intact
