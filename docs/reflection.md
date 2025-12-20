# Reflection 

## How the DSS Evolved

When I started Assignment 1, my goal was very modest: take some inputs, apply one simple rule, and produce one answer. It was a **deterministic pipeline**. I cleaned the inputs, checked a few basic constraints, and pushed everything through a single decision rule. This proved I could wire the data, implement some validation, and get a consistent output. It also showed me what I was missing: there was no sense of **uncertainty**, no way to compare **alternatives**, and no separation between **data**, **model**, and **presentation**. In other words, I had a working script, not a decision **system**.

In Assignment 2, I reorganized the project so it looked and behaved like a real DSS. I split the code into three **layers**: (1) a **data layer** that reads CSVs and validates them, (2) a **model layer** that can run different algorithms, and (3) an **output/UI layer** that presents results in a format a manager can read without touching code. I also introduced **scenarios** so I could compare two or more options side-by-side. That step was bigger than it sounds, because it forced me to separate the “what-if knobs” from the code. I moved the scenario definitions into **config files** so I could change assumptions without editing the program. This was my first taste of design for **repeatable analysis** instead of one-off scripts.

For the **final project**, I took the next step and made **uncertainty** a first-class feature. The architecture now has four parts:

1. **Data with validation.** The system loads only what it can trust, and it tells me what failed and why.
2. **Models with point estimates and distributions.** I kept the forecast simple on purpose (hour-of-day and weekend), but I also built **prediction intervals** around the point forecasts so I can speak about reasonable lows and highs.
3. A **scenario engine** that can run batches with parameter **ranges** (quantiles) and write out consistent, comparable results.
4. A **UI** that shows **comparisons with intervals** and (when available) **risk badges** from Monte Carlo runs.

A few architectural choices shaped how the project feels and how easy it is to extend:
- Keep each step **composable** (small scripts with clear inputs/outputs).
- Drive scenarios from **config files** and **ranges** instead of hard-coded branches.
- Carry **uncertainty through** the entire pipeline; don’t bolt it on at the end.
- Store **run metadata** so I can explain what configurations produced which results.
- Offer **“quick” vs “thorough”** modes to balance speed and confidence. (Quick runs fewer simulations; thorough runs more.) 
- Make **validation stricter** for scenario ranges so nonsense inputs get blocked early.


---

## How Uncertainty Changed My Decisions

When I added uncertainty, decisions immediately changed. Instead of one best score, I saw a **band**—a range where reality might land. I started to look for staffing plans that stayed good across many draws (I called those **robust**) and avoided plans that looked great at the median but failed badly at the edges (those are **fragile**).

Concretely, the UI now shows:
- **Intervals** instead of single numbers where it matters (demand bands).
- **Scenario tables** that summarize cost, coverage, and shortfall counts over a horizon.
- **Risk badges** (via Monte Carlo) that estimate the **chance of shortfall** for each date × shift, and an average shortfall risk per scenario.

This did a few useful things for me and for a hypothetical manager:
- It **surfaced tail risk**. Deterministic outputs can hide bad-but-rare cases. Scenarios and Monte Carlo bring them back into the conversation.
- It forced **clearer assumptions**. I had to choose a PI level (80%), decide how I sample (uniform within the range), and declare capacity per hour by role. These choices are visible in the config and the docs.
- It highlighted the **value of information**. When risk is high for a few specific shifts, I know that better data (or process changes) there would pay off more than anywhere else.
- It improved the **conversation quality**. Instead of debating one number, I could talk about the **trade-off**: “This scenario costs $X more but reduces average shortfall risk by Y%.”


---

## Limits and Trade-offs I Accepted

I made deliberate simplifications:

- **Simple forecast.** I used hour-of-day and a weekend flag. That leaves out day-of-week effects, holidays, seasonality, and acuity. I did this to keep the system explainable and runnable on any laptop.
- **Fixed capacity per hour.** Real capacity varies with breaks, skill mix, and patient acuity. I kept it fixed because it makes the optimizer clearer and the messaging easier.
- **Uniform sampling inside the prediction interval.** This is not statistically perfect, but it’s easy to explain. In a next version, I could sample from a normal distribution or use bootstrapping.
- **Monte Carlo draws are capped** for speed. I used a moderate number of draws (default 200) so it runs quickly in class environments.
- **Scenarios cover what I imagine.** If I don’t think to include a “holiday surge” scenario, the tool won’t warn me. This is why configs and documentation matter.
- **Users can misread intervals.** A wide interval is not “bad,” it’s just honest about uncertainty. I added notes in the UI and docs to reduce misinterpretations.

Trade-offs I faced and how I handled them:
- **Complexity vs. usability.** I hid advanced knobs and made the common flow mostly one click (the orchestrator script runs all steps).
- **Accuracy vs. speed.** I added “quick” vs. “thorough” modes to control run time.
- **Explainability vs. power.** I kept models interpretable; I’d rather explain a simple model than justify a black box for a course project.
- **Breadth vs. depth of scenarios.** I chose a small set of well-tested, named scenarios instead of a big untested set.
- **Randomness vs. reproducibility.** I seed the RNG and save outputs so someone else can reproduce my exact run.

---

## When It Helps vs. When It Misleads

**It helps when:**
- Inputs are inside **known ranges** and the task needs **risk awareness** (capacity, staffing, budgeting).
- Scenario levers **match real controls**: roster size, hours per shift, capacity per hour.
- The time horizon matches the model scope (e.g., weekly planning rather than multi-year strategy).
- The team is willing to **iterate on assumptions** and re-run.

**It misleads when:**
- We operate far **outside the modeled domain** (holiday peaks if I didn’t model them).
- The data is **stale or biased**, even if validated.
- People treat outputs as **precise** when **intervals are wide**.
- We ignore **tail risk** or we ask for **causal claims** from correlational models.

The key lesson for me is that tools like this are most useful as **conversation starters** and **risk radar**, not as oracles. The UI and docs try to set that expectation.

---

## What I Learned and What I’d Change

### Biggest takeaway: structured scenario planning
Defining a few clear, high-impact scenarios and running them the same way every time transformed how I thought about decisions. It forced me to write down assumptions, made uncertainty visible, and made it easier to discuss trade-offs.

### If I started over, I would:
1. **Build uncertainty in from day one.** It’s easier than retrofitting later.
2. **Strengthen data contracts early.** Clear schemas and validation save time.
3. **Create a reusable scenario library.** Standard cases (worst/median/best, surge weekends, staffing constraints) that I can pick and run.
4. **Profile performance sooner.** Decide early how many simulation draws are feasible and where to cache results.
5. **Add a short user walkthrough.** A simple “How to read intervals and risk” guide right in the UI.
6. **Model holidays/day-of-week** effects and measure calibration of the PI against held-out data.
7. **Introduce capacity variability** (or at least a min–max) to see how sensitive results are to operational factors, not just demand.
8. **Add cost realism.** Differentiate overtime, agency, and penalties for shortfalls so the optimizer reflects real budgets better.

---

## Management Focus: Value, ROI, and Adoption

I designed the system so a manager can quickly answer: **“What do I get for the money?”** The **Manager Brief** and the **Planning Overview** page show four simple metrics: **total cost**, **average coverage**, **rows with shortfall**, and (if available) **average chance of shortfall**. These are levers and outcomes managers already care about.

**Business value.** The DSS reduces planning time, makes risks visible, and supports proactive staffing. Fewer surprise shortfalls should translate to better patient experience and fewer escalations.

**ROI framing.** To make benefits concrete, I’d track:
- **Cost delta vs. baseline** (wages, overtime, agency).
- **Service level** changes (coverage %, shortfall rows).
- **Avoided incidents** (cancellations, penalties, rework).

Even small reductions in high-impact shortfalls can justify a modest increase in staffing on peak shifts. The goal is not zero risk at any cost; it’s a sensible **trade-off**.

**Adoption strategy.**
1. **Pilot** on one unit for 4–6 weeks with five scenarios and risk badges.
2. **Weekly review** of predicted vs. actuals; adjust capacity-per-hour or PI level if needed.
3. **Rollout** with a standard config template and a short training for schedulers.
4. **Governance**: keep inputs and outputs in a shared repo and require notes on any manual overrides.

**Change management.** People adopt tools they understand. That’s why I used plain English labels, visible config files, and simple CSV uploads. The more transparent the system, the higher the trust.

---


## Version Control and Authorship

I tried to commit in **small, descriptive steps**. The messages explain what changed and why (“Add Manager Brief page…”, “Planning Overview with tabs…”, “One-click pipeline…”). This helps me communicate ownership and keep a clean history that another student—or a future me—can read and understand.

I also kept **scripts modular** so that my contribution shows through the structure, not just the final outputs. The separation between data, models, scenarios, and UI is intentional and visible in the folder layout.

---


## Concrete Roadmap (What I’d Do Next)

1. **Forecast features**: add day-of-week, month, and holiday flags; evaluate PI calibration on holdout data.
2. **Capacity uncertainty**: model min/likely/max capacity per hour and propagate through Monte Carlo.
3. **Cost realism**: add overtime and agency tiers; include a penalty for shortfalls (e.g., rework cost).
4. **Shift-coupling constraints**: link headcount across adjacent shifts, enforce rest rules.
5. **Auto-reporting**: export a weekly PDF with top 10 risk rows and a recommendation based on budget and service targets.
6. **Data collection plan**: identify high-value data (e.g., acuity tags, no-show rates) and estimate the value of better information before investing.
7. **Interactive sliders in UI**: let a manager try “what-if” capacity improvements and see immediate changes in cost and risk.

---


