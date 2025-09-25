## Author

- Name: Gurnoor Singh Batth
- Student ID: 300167726  
- Course: Decision Support Systems  
- Institution: University of the Fraser Valley
- Term: Fall 2025   
- Email: gurnoor.batth@student.ufv.ca_  


# Healthcare DSS — Inventory, Patient Flow, Staffing, ROI

A small Decision Support System (DSS) for hospital/clinic operations.  
It helps managers answer three everyday questions with simple, explainable rules:

1) Inventory – When should we reorder? How much should we order?  
2) Patient Flow – How many staff do we need to keep waits down?  
3) Staffing – Who should work each shift at the lowest cost (one shift per person per day)?  

A fourth page, Management ROI, estimates payback and NPV from using the tool.

---

## Problem domain & decisions supported

Domain: Healthcare operations (tactical, structured decisions).  

Decisions:
- Inventory management: Set reorder points, target stock levels, and typical order sizes using a simple “days-of-cover” policy. Compare estimated yearly cost vs. a monthly-ordering baseline.

- Patient flow (capacity): Recommend the smallest number of servers (e.g., clinicians) meeting a utilization cap and a queue-wait target using a basic M/M/s model (Erlang C).

- Staffing (assignment): Build a shift schedule by choosing the lowest-cost qualified person for each slot, with a “max one shift per day” rule.

- Management ROI: Summarize expected savings vs. costs (payback months, NPV, and cash-flow list).


---

## Installation
```
Prerequisites
- Node.js ≥ 18 (LTS recommended)
- npm ≥ 9

Clone & install

git clone https://sc-gitlab.ufv.ca/202509cis480on1/gu26/healthcaredss.git
cd healthcaredss
npm install

PLEASE NOTE THAT IT IS VERY IMPORTANT TO RUN NPM INSTALL TO INSTALL ALL THE REQUIRED DEPENDENCIES.

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
  utils/
    csv.js       # CSV loading
    validation.js# schema checks for required columns/types
public/
  samples/       # sample CSV files (for quick testing)
docs/
  design.md      # design document (why/what/how)
  user_guide.md  # screenshots and step-by-step usage
```

---

## Data files (CSV)

Keep headers lowercase and spelled exactly as shown.

| File | Required columns | Purpose |
|---|---|---|
| `inventory.csv` | `item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days` | Inventory policy (we use the columns for the simple days-of-cover approach). |
| `patient_arrivals.csv` | `date, hour, arrivals` | Average arrivals/hour for patient flow capacity sizing. |
| `staff_roster.csv` | `staff_id, name, role, wage_per_hour` | Who can work, role, and hourly wage . |
| `shift_requirements.csv` | `date, shift, role, required` | How many staff you need per shift and role. |

Sample files live in `/public/samples/`.


---



## AI Contribution

I asked CHATGPT to pair-program a CSV parser file that loads and cleans up the data, and a validation file that makes sure the data is correct (for example, numbers aren’t negative and dates are in the right format) and validate datasets against predefined schemas for staff rosters, shift requirements, inventory, patient arrivals, and service rates.
Please see below for screen shots of both chat transcripts

![Alt text](./ScreenShots/chat1.png)
![Alt text](./ScreenShots/chat2.png)



---

## Notes & disclaimers

- See `docs/design.md` for architecture & design choices, and `docs/user_guide.md` for screenshots and troubleshooting.
