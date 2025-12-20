# Reproducibility & Governance (Final Project)

This checklist proves the results are **data-driven**, **configurable**, and **repeatable** with uncertainty, scenarios, and Monte Carlo risk.

---

## 1) Inputs (no hardcoded numbers)

- `data/patient_arrivals_history.csv` — historical hourly arrivals (training data)
- `staff_roster.csv` — who can work and their wage (by role)
- `config/config.json` — all tunable assumptions
  - `staffing.defaultHoursPerShift`
  - `staffing.capacityPerHourByRole` (patients/hour by role)
  - `forecastScenarios.*` (kept for completeness)
  - `uncertainty.*` (predictionIntervalLevel, monteCarloDraws, scenarioQuantiles)
  - `patientFlow.*`, `inventory.*`, `finance.*`

> If you change **any** of these, you will get new forecasts/decisions — by design.

---

## 2) One-click (single-command) pipeline

```bash
# End-to-end: forecast with PIs -> scenarios -> scenario optimization -> Monte Carlo -> manager brief
python analysis/run_all.py
```

**Expected outputs** (versioned artifacts you can attach to the report):
- `data/predicted_demand_hourly_pi.csv`
- `data/predicted_demand_shift_pi.csv`
- `analysis/model_metrics.json` (R^2, RMSE, PI level, sample sizes)
- `data/scenario_demand.csv`
- `data/scenario_staffing_plan.csv`
- `data/scenario_staffing_summary.csv`
- `analysis/scenario_compare.json`
- `data/mc_summary.csv`
- `analysis/mc_aggregate.json`
- `data/manager_brief.csv`
- `analysis/manager_brief.json`

---

## 3) Results traceability

- Each scenario output row in `scenario_staffing_summary.csv` includes `date`, `shift`, `scenario`, and the **input** `predicted_patients` it covers.
- Capacity = `capacityPerHourByRole[role] * defaultHoursPerShift * staffScheduled`.
- Cost = `wage_per_hour(role) * defaultHoursPerShift * staffScheduled`.
- Coverage = `min(1, totalCapacity / predictedPatients)`.
- Monte Carlo draws record `demand_sample`, `total_cost`, `coverage_rate`, `shortfall` to quantify risk (probability of shortfall, coverage percentiles).

These formulas are **documented** and **re-computable** from the CSVs.

---

## 4) Minimal environment

```bash
# Python
pip install pandas numpy scikit-learn scipy pulp

# Node (for the UI)
npm install
npm run dev
```

> No database or server required. CSV-in / CSV-out keeps the build simple.

---

## 5) Config governance

- All assumptions live in `config/config.json` (not buried in code).
- Changes are committed with a message explaining **why** they changed.
- Suggested reviewers for config-only PRs: operations lead + finance partner.

---

## 6) Failure modes & how to recover

- **CSV schema errors** -> Fix headers (lowercase, exact names).  
- **Shortfall remains** -> Increase capacity per role in config or add staff to roster.  
- **Poor forecast accuracy (high RMSE)** -> Add more days, add features (day-of-week/holiday), or retrain later.  
- **Solver not installed** -> `pip install pulp`.  
- **Monte Carlo too noisy** -> Increase `uncertainty.monteCarloDraws` (trade-off: runtime).

---

## 7) Re-run validity

Anyone can reproduce the exact same numbers by using the **same**:
- input CSVs,
- `config/config.json`,
- versions of the scripts (`analysis/*.py`).
