# Design Document

Project: Healthcare DSS -- Inventory, Patient Flow, Staffing, ROI  
Focus: Tactical structured decisions, management value, and easy adoption (with uncertainty, scenarios, and Monte Carlo risk views)

---

## 1) Overview & scope

This Decision Support System (DSS) helps a clinic/hospital manager make routine, structured decisions with uncertainty-aware outputs:

1. Inventory -- When to reorder and how much to order (days-of-cover policy).  
2. Patient Flow (capacity) -- How many servers/clinicians are needed to keep waits reasonable (simple M/M/s).  
3. Staffing (assignment) -- Who works each shift at lowest cost (greedy rule, one shift/person/day).  

A fourth page, Management ROI, converts improvements into money (payback, NPV) to support adoption.

Final Project additions: forecast prediction intervals, scenario generation from those intervals, scenario optimization, Monte Carlo coverage risk, and a manager brief rollup.

---

## 2) Problem description & why it’s structured 

- Inventory: Given demand, costs, and lead time, compute reorder point (s), target stock (S), and order size (Q).  
  Structured because the formulas and inputs are clearly defined and the output is deterministic.

- Patient flow: Given arrival rate and service time, recommend the smallest server count that meets a utilization cap and a queue-wait target.  
  Structured because the queueing model provides a fixed rule for choosing the server count.

- Staffing: Given a roster with roles and wages, and shift requirements, choose people to fill slots, cheapest first, max one shift/day.  
  Structured because the assignment follows a simple, deterministic rule.

- Uncertainty extension: Prediction intervals provide bounds, scenarios sample within those bounds, and Monte Carlo samples propagate uncertainty through the staffing recommendation. Structured because each step follows fixed, transparent rules (linear regression PIs, quantile mapping, repeated optimization).

---

## 3) Stakeholders & decisions

- Operations Manager / Nurse Manager -- chooses safety days, review cadence, utilization cap, and hours/shift.  
- Supply/Materials Manager -- reviews reorder points (s), order-up-to levels (S), yearly costs.  
- Unit Leads / Scheduling Team -- view coverage, unfilled needs, and who is scheduled.  
- Finance/Leadership -- review ROI (payback, NPV) to fund rollout and see risk bands.  
- Manager/Analyst -- reviews scenario comparisons, probability of shortfall, and coverage percentiles from Monte Carlo.

---

## 4) Data sources & purpose

All inputs are CSV files with lowercase headers:

| File | Columns (required) | Used by | Purpose |
|---|---|---|---|
| `inventory.csv` | `item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days` | Inventory | Compute s, S, Q and simple yearly cost. |
| `patient_arrivals.csv` | `date, hour, arrivals` | Patient Flow | Average arrivals/hour for capacity sizing. |
| `patient_arrivals_history.csv` | `date, hour, arrivals, is_weekend` | Forecast/UQ | Fit forecast with prediction intervals. |
| `predicted_demand_shift_pi.csv` | `date, shift, predicted_patients, pi_lower, pi_upper` | Scenarios/Monte Carlo | Shift forecast with PI bounds. |
| `scenario_demand.csv` | `date, shift, scenario, predicted_patients` | Scenario optimization | Five scenarios from PI quantiles. |
| `scenario_staffing_summary.csv` | `date, shift, scenario, predicted_patients, total_capacity, shortfall, total_cost, coverage_rate, status` | Scenario optimization | Scenario KPIs for UI upload. |
| `mc_summary.csv` | `draw, date, shift, demand_sample, total_cost, coverage_rate, shortfall` | Monte Carlo | Coverage/shortfall risk draws. |
| `manager_brief.csv` | `scenario, total_cost, avg_coverage, rows_with_shortfall, avg_shortfall_probability` | Manager brief | Compact rollup for decisions. |
| `staff_roster.csv` | `staff_id, name, role, wage_per_hour` | Staffing | Who can work, their role, and wage. |
| `shift_requirements.csv` | `date, shift, role, required` | Staffing | How many staff needed per shift/role. |

Validation rules: missing columns, non-numeric where numbers are expected, date/hour ranges, and non-negative checks. Errors are shown in the UI.

---

## 5) Models & algorithms (plain English)

### 5.1 Inventory -- Days-of-cover policy (simple, explainable)
- Average daily demand: `d = annual_demand / 365`  
- Safety buffer (days): user chooses (e.g., 3-7)  
- Review period (days): user chooses (e.g., 14)  
- Lead time (days): from CSV

Formulas
```
s (reorder point, units) = d * (lead_time_days + safetyDays)
S (order-up-to level)    = d * (lead_time_days + safetyDays + reviewDays)
Q (typical order, units) = d * reviewDays
orders/year              = annual_demand / max(Q, tiny)
annual cost (policy)     = ordering_cost + holding_cost
  where ordering_cost = setup_cost * orders/year
        holding_cost  = (holding_cost_rate * unit_cost) * (safety_stock + Q/2)
        safety_stock  = d * safetyDays
```

---

### 5.2 Patient Flow -- Small M/M/s with Erlang C
Inputs: average arrival rate (per hour), avg service time (minutes) -> service rate (per hour), utilization cap, queue-wait target (minutes).

Rule:
1. Start with `servers = ceil(arrivalRate / (serviceRate * utilizationCap))`  
2. If the expected queue wait is still above target, increment servers until it’s met.

Outputs: recommended server count, average utilization, probability of waiting, expected queue wait, total time in system.

---

### 5.3 Staffing -- Greedy cost-first assignment
For each `(date, shift, role)` requirement:
1. Sort staff with that role by hourly wage (cheapest first).  
2. Assign people who are not yet scheduled for another shift on the same date.  
3. Record shortfalls if we run out of people.

Outputs: schedule table, unfilled needs, totals (coverage %, total hours, estimated labor cost).

---

### 5.4 Management ROI -- Simple finance
- Annual savings = staffing + inventory + flow savings (user inputs)  
- Annual net = annual savings - annual operating cost  
- Cash flows: Year 0 = -implementation cost; Years 1..N = annual net  
- NPV = sum of discounted cash flows at user discount rate  
- Payback (months) = implementation cost / (annual net / 12)

---

### 5.5 Uncertainty & scenarios
- Forecast with PI: linear regression on hour + weekend flag; compute standard error and 80% prediction intervals; write hourly and shift PIs.  
- Scenario generation: map PI quantiles to five scenarios (worst, low, median, high, best) per shift/date.  
- Scenario optimization: solve staffing for each scenario, writing per-role plans and per-shift KPIs.  
- Monte Carlo: sample demand within PI bounds, solve repeatedly, and aggregate coverage percentiles and probability of shortfall.  
- Manager brief: roll scenario KPIs and Monte Carlo risk into a compact CSV/JSON for non-technical stakeholders.

---

## 6) System architecture

```
[UI Pages]  Home, Inventory, Flow, Staffing, ROI, StaffingResults
    |
    |-- Models
    |     inventory.js  (days-of-cover & cost)
    |     flow.js       (M/M/s metrics & server picker)
    |     staffing.js   (greedy assignment)
    |     roi.js        (NPV, payback, cashflows)
    |
    |-- Data/Validation
    |     csv.js        (load CSV)
    |     validation.js (schema checks)
    |
    |-- Analysis (Python)
          predict_demand_with_pi.py  -> shift PIs
          build_scenarios_from_pi.py -> scenario_demand.csv
          optimize_scenarios.py      -> scenario_staffing_summary.csv
          monte_carlo_optimize.py    -> mc_summary.csv, mc_aggregate.json
          export_manager_brief.py    -> manager_brief.csv/json
          run_all.py                 -> orchestrates the above
```

- Platform: Web (React + Vite) for UI; Python scripts for analysis pipeline.  
- Storage: In-memory (no DB) -- users upload CSVs each session; analysis scripts read/write CSV/JSON.  
- Error handling: schema validation with friendly messages; pipeline scripts fail fast with clear missing-column errors.

---

## 7) Implementation strategy

1. Scaffold & styles (Vite + React + Tailwind)  
2. Validation & CSV utils  
3. Inventory page (policy + table)  
4. Patient Flow page (M/M/s + server picker)  
5. Staffing page (assignments + shortfalls + KPIs)  
6. Forecast with PI (predict_demand_with_pi.py) and roll to shifts  
7. Scenario generation from PI quantiles (build_scenarios_from_pi.py)  
8. Scenario optimization + StaffingResults UI for CSV upload  
9. Monte Carlo coverage risk + manager brief rollup  
10. ROI page (payback, NPV, cash flows) with updated inputs  
11. Docs (README, design.md, user_guide.md with screenshots)  
12. Polish & test with sample CSVs and pipeline (`analysis/run_all.py`)
