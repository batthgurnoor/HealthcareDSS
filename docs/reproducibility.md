# Reproducibility & Governance (Assignment 2 — Step 4)

This checklist proves the results are **data-driven**, **configurable**, and **repeatable**.

---

## 1) Inputs (no hardcoded numbers)

- `data/patient_arrivals_history.csv` — historical hourly arrivals (training data)
- `staff_roster.csv` — who can work and their wage (by role)
- `config/config.json` — all tunable assumptions
  - `staffing.defaultHoursPerShift`
  - `staffing.capacityPerHourByRole` (patients/hour by role)
  - `forecastScenarios.*` (scenario multipliers)
  - `patientFlow.*`, `inventory.*`, `finance.*` (kept for completeness)

> If you change **any** of these, you will get new forecasts/decisions — by design.

---

## 2) One-click (two-command) pipeline

```bash
# 1) Forecast demand per shift (writes predictions + accuracy metrics)
python analysis/predict_demand.py

# 2) Optimize staffing using that forecast (writes plan + KPIs)
python analysis/optimize_staffing.py
```

**Expected outputs** (versioned artifacts you can attach to the report):
- `data/predicted_demand.csv`
- `analysis/model_metrics.json` (R², RMSE, sample sizes)
- `data/staffing_plan.csv`
- `data/staffing_summary.csv`
- `analysis/optimize_report.json`

---

## 3) Results traceability

- Each output row in `staffing_plan.csv` includes `date`, `shift`, `scenario`, and the **input** `predicted_patients` it is covering.
- Capacity = `capacityPerHourByRole[role] × defaultHoursPerShift × staffScheduled`.
- Cost = `wage_per_hour(role) × defaultHoursPerShift × staffScheduled`.
- Coverage = `min(1, totalCapacity / predictedPatients)`.

These formulas are **documented** and **re-computable** from the CSVs.

---

## 4) Minimal environment

```bash
# Python
pip install pandas scikit-learn pulp

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

- **CSV schema errors** → Fix headers (lowercase, exact names).  
- **Shortfall remains** → Increase capacity per role in config or add staff to roster.  
- **Poor forecast accuracy (high RMSE)** → Add more days, add features (day-of-week/holiday), or retrain later.  
- **Solver not installed** → `pip install pulp`.

---

## 7) Re-run validity

Anyone can reproduce the exact same numbers by using the **same**:
- input CSVs,
- `config/config.json`,
- versions of the scripts (`analysis/*.py`).

