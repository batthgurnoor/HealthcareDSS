# Integration & Architecture (Assignment 2)

**Project:** Healthcare DSS — Inventory, Patient Flow, Staffing, ROI  
**Goal:** Show how the new predictive and prescriptive pieces connect to the DSS. Add business KPIs, simple API specs, and a short deployment plan.

---

## 1) End‑to‑end data flow 



```
Historical arrivals (CSV)
       │
       ▼
[Predictive model]  analysis/predict_demand.py
  - trains a simple regression on hour + weekend flag
  - reports R² and RMSE to model_metrics.json
  - forecasts next-day patients per shift
       │
       ▼
Forecasted demand = data/predicted_demand.csv
       │
       ▼
[Prescriptive model]  analysis/optimize_staffing.py
  - reads forecast + roster + config capacities
  - minimizes labor cost with coverage constraints
  - writes staffing_plan.csv and staffing_summary.csv
       │
       ▼
DSS UI 
  - StaffingResults.jsx loads staffing_summary.csv for managers
  - ROI.jsx uses totals to estimate financial impact
```

**Why this matters:**  
- Predictions directly shape the optimization .  
- Optimizer outputs feed the UI for human decisions and ROI.

---

## 2) Business KPIs 

These KPIs appear in CSVs and the UI so a non-technical reader can judge value quickly.

### Forecast (predictive)
- **R²** — how much variance our model explains (higher is better)  
- **RMSE** — average prediction error in “patients per hour” (lower is better)

### Staffing (prescriptive)
- **Coverage rate** = min(1, capacity ÷ demand)  
- **Shortfall (patients)** = max(0, demand − capacity)  
- **Total labor cost (per date/shift)** = wage × hours × headcount  
- **Cost per predicted patient** = cost ÷ demand (when demand > 0)

### Roll‑ups (for reports)
- **Total cost (period)** = sum over all slices  
- **Avg coverage rate (period)** = mean of slice coverage rates  
- **# slices with shortfall** = count where shortfall > 0

These KPIs are saved to `analysis/model_metrics.json` and `data/staffing_summary.csv`, and shown on the **Staffing Results** page.

---

## 3) API design (documentation only)

If we deployed this with a backend later, we could expose two simple endpoints.
This shows a clear contract between the UI and the analytics layer.

### POST `/api/forecast`
**Purpose:** Train and/or run the forecast and return predictions.  
**Request (JSON):**
```json
{
  "horizon_days": 1,
  "scenarios": ["pessimistic", "baseline", "optimistic"]
}
```
**Response (JSON):**
```json
{
  "metrics": { "r2": 0.62, "rmse": 2.7 },
  "predictions": [
    { "date": "2025-10-29", "shift": "morning", "scenario": "baseline", "predicted_patients": 31.4 },
    { "date": "2025-10-29", "shift": "evening", "scenario": "baseline", "predicted_patients": 28.1 }
  ]
}
```

### POST `/api/optimize`
**Purpose:** Create a staffing plan that covers forecasted demand with minimum cost.  
**Request (JSON):**
```json
{
  "date": "2025-10-29",
  "demand": [
    {"shift": "morning", "scenario": "baseline", "predicted_patients": 31.4},
    {"shift": "evening", "scenario": "baseline", "predicted_patients": 28.1}
  ],
  "hoursPerShift": 8,
  "capacityPerHourByRole": { "RN": 3.0, "LPN": 2.0, "Clerk": 0.5 }
}
```
**Response (JSON):**
```json
{
  "plan": [
    {"shift": "morning", "role": "RN", "staffScheduled": 4, "roleCapacity": 96, "roleCost": 1280},
    {"shift": "morning", "role": "LPN", "staffScheduled": 2, "roleCapacity": 32, "roleCost": 576}
  ],
  "kpis": {
    "totalCapacity": 128,
    "predictedPatients": 110,
    "shortfall": 0,
    "totalCost": 1856,
    "coverageRate": 1.0
  }
}
```

> Note:  we do **not** implement these APIs. The scripts + CSVs are enough. This API section just documents a clean interface for future work.

---

## 4) Governance, config, and reproducibility

- **No hidden constants:** All key assumptions live in `config/config.json` (hours per shift, capacity per hour by role, scenario multipliers, finance rates).  
- **Clear inputs/outputs:**  
  - Inputs: `data/patient_arrivals_history.csv`, `staff_roster.csv`  
  - Predictive outputs: `data/predicted_demand.csv`, `analysis/model_metrics.json`  
  - Prescriptive outputs: `data/staffing_plan.csv`, `data/staffing_summary.csv`, `analysis/optimize_report.json`
- **How to re‑run from scratch:**  
  1) `python analysis/predict_demand.py` → writes predictions  
  2) `python analysis/optimize_staffing.py` → writes staffing plan + KPIs  
  3) Open the React app and load `staffing_summary.csv` on **Staffing Results**


---

## 5) Deployment plan 

**Goal:** Keep it simple, cheap, and easy to maintain, but ready to grow.

**Runtime choice:** For this class project, a **single‑machine** setup is enough: the React app is built with Vite and served as static files (e.g., on Netlify or an Nginx container), and the analytics run as **batch scripts** in Python that teammates execute locally. If we wanted a one‑click experience, we could wrap the two Python scripts in a tiny FastAPI service and run everything in a single **Docker** image.

**Environments:** Start with **dev only** (local). If we share with others, add a lightweight **staging** deploy (same Docker image, sample data). Production is out of scope , but the design supports it.

**Data handling:** We purposely keep **CSV I/O** to avoid database setup. If data volume grows, we can move to SQLite or Postgres and keep the same contracts. The config remains a simple JSON file so changes don’t require code edits.

**Scheduling:** If daily forecasts are needed, use a cron job or GitLab CI scheduled pipeline that runs `predict_demand.py` each morning, commits `predicted_demand.csv` to a branch, and triggers `optimize_staffing.py`. Artifacts (the CSVs) can be published for the UI to download.

**Scalability:** The linear programs are tiny (per shift), so CBC (PuLP’s default) is fine. If we add many roles/units, we can still solve fast on a shared VM. For heavier loads, we can swap to OR‑Tools or a hosted solver without changing the model’s structure.

**Observability:** We track **R²/RMSE** for the forecast and **coverage/cost/shortfall** for optimization. If any metric degrades (e.g., RMSE spikes), we alert and retrain with more features (day of week, holidays).

**Security:** No PHI is stored; data is aggregate arrivals and wages. Restrict repo access, don’t commit sensitive CSVs, and avoid public links for artifacts.

**Change management:** Parameters (capacities, hours) are in `config.json`. Changes are versioned in Git, reviewed by ops + finance, and documented in release notes. This keeps decisions auditable.

---

## 6) What changed vs. Assignment 1 (at a glance)

- Added **predictive** (forecast) and **prescriptive** (optimization) scripts in `/analysis`  
- Added `/data` inputs/outputs and `/config/config.json` for assumptions  
- Added **Staffing Results** page to load optimizer KPIs for managers  
- Documented **KPIs**, **API contracts**, and **deployment** strategy


