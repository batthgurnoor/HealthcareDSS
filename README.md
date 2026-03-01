<<<<<<< HEAD
## Author

- Name: Gurnoor Singh Batth
- Student ID: 300167726  
- Course: Decision Support Systems  
- Institution: University of the Fraser Valley
- Term: Fall 2025   
- Email: gurnoor.batth@student.ufv.ca_  

## Final Project Extensions

This repository is the Final Project (Assignment 3) version of the Healthcare DSS.

New in Final Project:
- Uncertainty quantification: 80% prediction intervals for hourly and shift forecasts via `analysis/predict_demand_with_pi.py` (writes `data/predicted_demand_hourly_pi.csv`, `data/predicted_demand_shift_pi.csv`, `analysis/model_metrics.json`).
- Scenario generation from prediction intervals (worst/low/median/high/best) via `analysis/build_scenarios_from_pi.py` (writes `data/scenario_demand.csv`).
- Scenario optimization across the 5 scenarios via `analysis/optimize_scenarios.py` (writes `data/scenario_staffing_plan.csv`, `data/scenario_staffing_summary.csv`, `analysis/scenario_compare.json`).
- Monte Carlo coverage risk using the PI bounds via `analysis/monte_carlo_optimize.py` (writes `data/mc_summary.csv`, `analysis/mc_aggregate.json`).
- Manager brief rollup with shortfall probability via `analysis/export_manager_brief.py` (writes `data/manager_brief.csv`, `analysis/manager_brief.json`).
- End-to-end runner `analysis/run_all.py` to execute the full pipeline (forecast -> scenarios -> scenario optimization -> Monte Carlo -> manager brief).
- Config adds an `uncertainty` block for PI level, Monte Carlo draws, and scenario quantiles.

# Healthcare DSS -- Inventory, Patient Flow, Staffing, ROI

A small Decision Support System (DSS) for hospital/clinic operations.  
It helps managers answer everyday questions with explainable rules and now surfaces risk bands and scenario comparisons:

1) Inventory -- When should we reorder? How much should we order?  
2) Patient Flow -- How many staff do we need to keep waits down?  
3) Staffing -- Who should work each shift at the lowest cost (one shift per person per day)?  

A fourth page, Management ROI, estimates payback and NPV from using the tool. Final Project additions also show how uncertainty moves these answers.

---

## Problem domain & decisions supported

Domain: Healthcare operations (tactical, structured decisions).  

Decisions:
- Inventory management: Set reorder points, target stock levels, and typical order sizes using a simple days-of-cover policy. Compare estimated yearly cost vs. a monthly-ordering baseline.

- Patient flow (capacity): Recommend the smallest number of servers (e.g., clinicians) meeting a utilization cap and a queue-wait target using a basic M/M/s model (Erlang C).

- Staffing (assignment): Build a shift schedule by choosing the lowest-cost qualified person for each slot, with a max one shift per day rule and uncertainty-aware demand inputs.

- Management ROI: Summarize expected savings vs. costs (payback months, NPV, and cash-flow list) while flagging risk bands from the forecast scenarios.

**Final Project Extension (Healthcare, Tactical + Structured):**  
We extended the predictive + prescriptive pipeline with uncertainty. The forecast now produces 80% prediction intervals for hourly arrivals, rolls them to shifts, and generates five scenarios (worst/low/median/high/best). Each scenario is optimized for staffing, and a Monte Carlo step samples within the intervals to estimate shortfall probability and coverage percentiles. Outputs include coverage rate, shortfall (patients), total cost, and risk summaries, keeping the original Assignment 1 logic intact while adding uncertainty-aware decision support.


---

## Installation
Prerequisites
- Node.js >= 18 (LTS recommended)
- npm >= 9
- Python 3 with pandas, numpy, scikit-learn, scipy, pulp

Clone & install

-git clone https://sc-gitlab.ufv.ca/202509cis480on1/gu26/FinalProject.git

-cd FinalProject

-npm install

-pip install pandas numpy scikit-learn scipy pulp

-python analysis/run_all.py   # runs forecast with PIs -> scenarios -> optimization -> Monte Carlo -> manager brief

After running the pipeline, open the app and use **Manager Brief** or **Planning Overview** to upload `data/manager_brief.csv` or `data/scenario_staffingsummary.csv` for a manager-friendly view.  

PLEASE NOTE THAT IT IS VERY IMPORTANT TO RUN NPM INSTALL AND PIP INSTALL QUERIES TO INSTALL ALL THE REQUIRED DEPENDENCIES.

---

## How to run the application

Development server

npm run dev
Open the printed local URL in your browser (e.g., http://localhost:5173).

---

## Dependencies & requirements

Core stack
- React + React Router (single-page app)
- Vite (fast dev server/bundler)
- Tailwind CSS (utility styles)
- PostCSS + Autoprefixer (Tailwind pipeline)

---

## Folder STRUCTURE

**New files/folders introduced:**  
- `config/config.json` -- hours per shift, capacity/hour by role, finance rates, and an `uncertainty` block for PI level, Monte Carlo draws, and scenario quantiles  
- `analysis/predict_demand_with_pi.py` -- forecast script with R^2, RMSE, and 80% prediction intervals in `analysis/model_metrics.json`  
- `analysis/build_scenarios_from_pi.py` -- generates 5 scenarios from PI quantiles into `data/scenario_demand.csv`  
- `analysis/optimize_scenarios.py` -- optimizer that writes `data/scenario_staffing_plan.csv`, `data/scenario_staffing_summary.csv`, and `analysis/scenario_compare.json`  
- `analysis/monte_carlo_optimize.py` -- samples demand within PI bounds and writes `data/mc_summary.csv`, `analysis/mc_aggregate.json`  
- `analysis/export_manager_brief.py` -- rolls up scenario and Monte Carlo KPIs into `data/manager_brief.csv`, `analysis/manager_brief.json`  
- `analysis/run_all.py` -- end-to-end runner for the full uncertainty pipeline  
- `src/pages/StaffingResults.jsx` -- tiny UI to read the optimizer's summary CSV and show KPIs
```


src/
  models/        # simple, plain-English math/logic
    inventory.js # days-of-cover policy & cost estimate
    flow.js      # small M/M/s (Erlang C) + server picker
    staffing.js  # greedy cost-first assignment
    roi.js       # payback, NPV, cash flows
  pages/         # UI pages (plain-English labels and tables)
    Home.jsx
    Inventory.jsx
    Flow.jsx
    Staffing.jsx
    ROI.jsx
    StaffingResults.jsx
  utils/
    csv.js       # CSV loading
    validation.js# schema checks for required columns/types
public/
  samples/       # sample CSV files (for quick testing)
docs/
  design.md      # design document (why/what/how)
  user_guide.md  # screenshots and step-by-step usage
  integration_architecture.md # how pieces connect (pipeline + UI)
  reproducibility.md          # how to re-run and govern configs
  uncertainty_analysis.md     # how PIs, scenarios, and Monte Carlo work
analysis/
  predict_demand_with_pi.py    # forecast script with R^2, RMSE, and PI bounds
  build_scenarios_from_pi.py   # create 5 scenarios from PI quantiles
  optimize_scenarios.py        # optimizer for each scenario
  monte_carlo_optimize.py      # Monte Carlo coverage risk from PI bounds
  export_manager_brief.py      # small rollup for managers (cost, coverage, shortfall probability)
  run_all.py                   # runs the full sequence above
config/
  config.json  # hours per shift, capacity/hour by role, scenario multipliers, finance rates
data/
  predicted_demand_hourly_pi.csv  # hourly forecast with PI bounds
  predicted_demand_shift_pi.csv   # shift-level forecast with PI bounds
  scenario_demand.csv             # five demand scenarios (worst/low/median/high/best)
  scenario_staffing_summary.csv   # scenario KPIs (cost, coverage, shortfall)
  mc_summary.csv                  # Monte Carlo draws within PI bounds
  manager_brief.csv               # compact cost/coverage/shortfall-probability rollup
requirements.txt                  # pinned Python dependencies
.python-version                   # interpreter version for reproducibility
```

---

## Data files (CSV)

Keep headers lowercase and spelled exactly as shown.

| File | Required columns | Purpose |
|---|---|---|
| `inventory.csv` | `item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days` | Inventory policy (we use the columns for the simple days-of-cover approach). |
| `patient_arrivals.csv` | `date, hour, arrivals` | Average arrivals/hour for patient flow capacity sizing. |
| `patient_arrivals_history.csv` | `date, hour, arrivals, is_weekend` | Historical arrivals used to fit the forecast with prediction intervals. |
| `staff_roster.csv` | `staff_id, name, role, wage_per_hour` | Who can work, role, and hourly wage. |
| `shift_requirements.csv` | `date, shift, role, required` | How many staff you need per shift and role. |
| `predicted_demand_shift_pi.csv` | `date, shift, predicted_patients, pi_lower, pi_upper` | Shift forecast with PI bounds (input to scenarios and Monte Carlo). |
| `scenario_demand.csv` | `date, shift, scenario, predicted_patients` | Five scenario rows derived from the PI bounds. |
| `scenario_staffing_summary.csv` | `date, shift, scenario, predicted_patients, total_capacity, shortfall, total_cost, coverage_rate, status` | Scenario KPIs for use in the UI. |
| `mc_summary.csv` | `draw, date, shift, demand_sample, total_cost, coverage_rate, shortfall` | Monte Carlo draws to see probability of shortfall and coverage percentiles. |
| `manager_brief.csv` | `scenario, total_cost, avg_coverage, rows_with_shortfall, avg_shortfall_probability` | Compact rollup for managers. |

Sample files live in `/public/samples/`.

---

## AI Contribution

I asked CHATGPT to pair-program a CSV parser file that loads and cleans up the data, and a validation file that makes sure the data is correct (for example, numbers aren't negative and dates are in the right format) and validate datasets against predefined schemas for staff rosters, shift requirements, inventory, patient arrivals, and service rates.
Please see below for screen shots of both chat transcripts

![Alt text](./ScreenShots/chat1.png)
![Alt text](./ScreenShots/chat2.png)

---

## Notes & disclaimers

- See `docs/design.md` for architecture & design choices, and `docs/user_guide.md` for screenshots and troubleshooting.

---

## Notes

**Final Project notes:**  
- No hardcoded constants: all key assumptions (including uncertainty settings) are in `config/config.json`.  
- CSV-in / CSV-out by design for transparency and easy grading; no database required.  
- If **shortfall** appears in any scenario/date/shift, either add staff to the roster or increase capacity per hour by role in config (trade-off: higher coverage -> higher cost).  
- Forecast quality depends on historical data volume/features. If RMSE is high, add more days or features (e.g., day-of-week, holidays).  
- Solver: uses **PuLP** (CBC). Install with `pip install pulp`. No paid solver needed.  
- Monte Carlo draws use the PI bounds. Increase `uncertainty.monteCarloDraws` for smoother percentiles (at the cost of runtime).

---

## Results

**Final Project key findings (summary):**  
- **Prediction intervals:** 80% PI bounds for hourly arrivals roll to shifts, exposing likely high/low demand.  
- **Scenarios:** worst/low/median/high/best are generated from PI quantiles (not just simple multipliers).  
- **Coverage vs cost:** coverage rises with demand quantiles; worst-case scenarios add cost to avoid shortfall, while median/best keep costs lean.  
- **Risk view:** Monte Carlo shows probability of shortfall per shift and coverage percentiles, and `manager_brief.csv` condenses this for quick decisions.  
- **ROI link:** staffing outputs still feed management ROI to estimate payback/NPV with explicit cash-flow assumptions.
=======
