# User Guide

**Project:** Healthcare DSS — Inventory, Patient Flow, Staffing, ROI  
**Audience:** Non‑technical managers and classmates  
**What you’ll do:** Upload a few CSVs, choose simple settings, and read clear tables.

> **Pages included:** Inventory • Patient Flow • Staffing • Management ROI  


---

## 1) Before you start

- Prepare your CSV files (lowercase headers, spelled exactly as shown below).  
  You can also use the sample CSVs in **`/public/samples/`**.

| File | Required columns (lowercase) | Purpose |
|---|---|---|
| `inventory.csv` | `item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days, sd_demand_daily, service_level` | Inventory policy (this app uses the first **6** columns). |
| `patient_arrivals.csv` | `date, hour, arrivals` | Average arrivals/hour for Patient Flow. |
| `staff_roster.csv` | `staff_id, name, role, wage_per_hour` | Who can work, their role, wage. |
| `shift_requirements.csv` | `date, shift, role, required` | How many people needed per shift/role. |


---

## 2) Inventory — “days of cover” policy

**Goal:** Decide *when to reorder* and *how much to order* for each item.

### Steps
1. Open the **Inventory** page.
2. Click **Upload** and select `inventory.csv`.
3. Enter **Safety buffer (days)** (e.g., 3–7) and **Review period (days)** (e.g., 14).
4. Click **Calculate reorder points and order sizes**.

### What you’ll see
- **Totals (tiles):** Estimated annual cost (policy), monthly‑baseline cost, and savings.
- **Table (per item):**
  - **Reorder point (s, units):** When on‑hand hits this level, place an order.  
  - **Order‑up‑to level (S, units):** Target stock right after an order arrives.  
  - **Typical order size (Q, units):** Usual quantity each review period.  
  - **Annual cost — policy:** Simple estimate (ordering + holding).  
  - **Annual cost — monthly baseline:** If you ordered monthly.  
  - **Annual savings vs baseline:** Baseline − Policy (positive = saving).

### Screenshot placeholder

![Inventory page](ScreenShots/inventory.png)

---

## 3) Patient Flow — recommend servers to keep waits down

**Goal:** Pick the **smallest** number of servers (e.g., clinicians) that meets your targets.

### Steps
1. Open the **Patient Flow** page.
2. Click **Upload** and select `patient_arrivals.csv`. The app calculates the **average arrivals/hour**.  
   *(Or type your own arrival rate.)*
3. Enter **Average service time (minutes)** (e.g., 12).
4. Set **Utilization cap** (e.g., 0.85) and **Max queue‑wait target (minutes)** (e.g., 10).
5. Click **Recommend server count**.

### What you’ll see
- **Recommended servers on duty** (the smallest number that meets both targets).
- **Average utilization** (fraction of time busy, e.g., 0.78).  
- **Probability of waiting** (chance a patient waits at all).  
- **Expected queue wait (minutes)** and **Total time in system (minutes)**.

> If the system is too busy, you may see **Infinity** for wait time—add servers, shorten service time, or relax the target.

### Screenshot placeholder

![Patient Flow page](ScreenShots/flow.png)

---

## 4) Staffing — build a low‑cost schedule

**Goal:** Assign staff to requested shifts cheaply and fairly (one shift per person per day).

### Steps
1. Open the **Staffing** page.
2. Upload **`staff_roster.csv`** (who can work, their role, wage).
3. Upload **`shift_requirements.csv`** (how many people needed by date/shift/role).
4. Set **Hours per shift** (e.g., 8).
5. Click **Create schedule**.

### What you’ll see
- **KPIs (tiles):** Total positions requested, positions filled, **coverage rate (%)**, total hours, estimated labor cost.
- **Unfilled needs** (if any): date, shift, role, requested, filled, missing.
- **Schedule table:** one row per assignment (date, shift, role, staff ID/name, wage, hours, cost).

**Rule used:** pick the **lowest‑cost** qualified person for each slot; no one works more than **one shift per day**.

### Screenshot placeholder

![Staffing page](ScreenShots/staffing.png)

---

## 5) Management ROI — show value in money terms

**Goal:** Estimate payback and NPV to support rollout.

### Steps
1. Open the **Management ROI** page.
2. Type **estimated yearly savings** for Staffing, Inventory, and Patient Flow.
3. Enter **One‑time implementation cost (Year 0)** and **Annual operating cost**.
4. Adjust **Discount rate (%/year)** and **Time horizon (years)** as needed.

*(The page updates automatically—no “Run” button needed.)*

### What you’ll see
- **Total estimated savings (per year)** and **Net benefit (per year)** (after operating cost).
- **Payback period (months):** time to earn back the one‑time cost.
- **NPV over the horizon:** value of all cash flows discounted at your rate.
- **Cash flow table:** Year 0 setup cost, then yearly net benefits.

### Screenshot placeholder

![ROI page](ScreenShots/roi.png)

---

## 6) Interpreting outputs

| Term | What it means | Why it matters |
|---|---|---|
| **Reorder point (s)** | Stock level where you place an order. | Avoids stockouts during lead time. |
| **Order‑up‑to level (S)** | Target stock right after receiving an order. | Keeps enough stock until the next review. |
| **Typical order size (Q)** | Rough order quantity each review period. | Helps plan order sizes and deliveries. |
| **Utilization** | Fraction of time staff are busy. | Too high → long waits; too low → idle time. |
| **Expected queue wait** | Average time a patient waits before service. | A key service target for clinics/units. |
| **Coverage rate** | Filled positions ÷ requested positions. | 100% means all shifts are covered. |
| **Estimated labor cost** | Sum of (hourly wage × hours) over assignments. | Budget impact of the schedule. |
| **Payback (months)** | Time to recoup the setup cost. | Faster payback → easier approval. |
| **NPV** | Discounted value of all cash flows. | Positive NPV → financially worthwhile. |

---

## 7) Troubleshooting

**“Missing required column(s): …”**  
- Headers must be lowercase and **exact**.  
- Fix the CSV headers (e.g., `item` not `Item`; `wage_per_hour` not `wage`).

**“Invalid number in column …” or strange totals**  
- Remove `$`, `%`, and commas from numbers. Use plain numerals: `12345.67`.  
- Make sure date columns look like `YYYY-MM-DD` and hours are `0–23`.

**Patient Flow shows “Infinity” wait time**  
- The system is overloaded (too few servers or too long service time).  
- Try adding servers, shortening **Average service time**, or relaxing the **Queue‑wait target** or **Utilization cap**.

**Coverage rate below 100%**  
- Not enough eligible staff for that role or day.  
- Add more people to `staff_roster.csv`, adjust wages/roles, or reduce the `required` count.

**Upload does nothing / wrong file**  
- Make sure the file type is `.csv`.  
- Double‑check you uploaded the right file for the right page.

**The page looks unstyled**  
- If you’re running locally, restart the dev server (`Ctrl+C` then `npm run dev`) and refresh the browser.

---


---

## 8) Sample walkthrough (quick demo)

If you don’t have real data yet:
1. Go to `public/samples/` and use the provided CSVs.
2. Inventory: set **Safety buffer = 5 days**, **Review period = 14 days** → run.  
3. Flow: upload `patient_arrivals.csv`, set **Service time = 12 min**, **Util cap = 0.85**, **Wait target = 10 min** → recommend.  
4. Staffing: upload both roster and requirements, set **Hours per shift = 8** → create schedule.  
5. ROI: enter rough savings (e.g., staffing 50k, inventory 20k, flow 15k), costs (setup 15k, annual 5k), **rate = 8%**, **years = 3**.

You now have complete screenshots and numbers for your report.

---

## 9) Contact

If something still doesn’t work, include: the page, the CSV you used, what you clicked, and the error message.  
This helps reproduce the problem quickly.
