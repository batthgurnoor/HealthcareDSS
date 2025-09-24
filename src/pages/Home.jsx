// src/pages/Home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="mt-4 space-y-5">
      {/* Hero */}
      <div className="card">
        <h1 className="text-2xl font-bold">Healthcare Decision Support — Simple Demo</h1>
        <p className="mt-2">
          This tool helps managers make routine decisions using easy, explainable rules.
          Upload a few CSV files, adjust a couple of settings, and get clear tables you can use
          in meetings.
        </p>
        <p className="small opacity-80 mt-2">
          Focus areas: <b>Inventory</b> (when to order, how much), <b>Patient Flow</b> (how many
          staff to keep waits down), and <b>Staffing</b> (who works which shift at lowest cost). Then
          check the <b>Management ROI</b> page to see payback and NPV.
        </p>
      </div>

      {/* Quick actions (no Data Check, no Sensitivity) */}
      <div className="card">
        <h2 className="text-xl font-semibold">Start here</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <Link to="/inventory" className="card hover:shadow-md transition">
            <h3 className="font-semibold">1) Inventory</h3>
            <p className="small mt-1">
              Pick a safety buffer (days) and a review period. See reorder points, order sizes, and
              yearly cost vs. monthly ordering.
            </p>
          </Link>

          <Link to="/flow" className="card hover:shadow-md transition">
            <h3 className="font-semibold">2) Patient Flow</h3>
            <p className="small mt-1">
              Set service time and a wait target. Get the smallest number of servers that meets it.
            </p>
          </Link>

          <Link to="/staffing" className="card hover:shadow-md transition">
            <h3 className="font-semibold">3) Staffing</h3>
            <p className="small mt-1">
              Assign the lowest-cost qualified staff, one shift per person per day. See coverage and cost.
            </p>
          </Link>

          <Link to="/roi" className="card hover:shadow-md transition">
            <h3 className="font-semibold">4) Management ROI</h3>
            <p className="small mt-1">
              Enter ballpark savings and costs to see payback, NPV, and a simple cash-flow table.
            </p>
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="text-xl font-semibold">How it works (plain English)</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1 small">
          <li>
            <b>Data</b> — We read simple CSV files and do basic checks for missing or bad values.
          </li>
          <li>
            <b>Models</b> — Inventory uses a “days of cover” rule; Patient Flow uses a basic M/M/s
            formula; Staffing picks the lowest-cost qualified person.
          </li>
          <li>
            <b>Interface</b> — Buttons and tables. Change a parameter and re-run to see the impact.
          </li>
        </ul>
      </div>

      {/* Files we expect */}
      <div className="card">
        <h2 className="text-xl font-semibold">Files we expect</h2>
        <table className="tbl mt-2">
          <thead>
            <tr>
              <th>File name</th>
              <th>Required columns (lowercase)</th>
              <th>What it’s for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code className="font-mono">inventory.csv</code></td>
              <td>
                <code className="font-mono">
                  item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days
                </code>
              </td>
              <td>Suggest reorder levels and order sizes; estimate yearly costs.</td>
            </tr>
            <tr>
              <td><code className="font-mono">patient_arrivals.csv</code></td>
              <td><code className="font-mono">date, hour, arrivals</code></td>
              <td>Average arrivals/hour to size the team and keep waits down.</td>
            </tr>
            <tr>
              <td><code className="font-mono">staff_roster.csv</code></td>
              <td><code className="font-mono">staff_id, name, role, wage_per_hour</code></td>
              <td>Who can work, their role, and hourly wage.</td>
            </tr>
            <tr>
              <td><code className="font-mono">shift_requirements.csv</code></td>
              <td><code className="font-mono">date, shift, role, required</code></td>
              <td>How many people you need per shift and role.</td>
            </tr>
          </tbody>
        </table>
        <p className="small mt-2">
          Tip: sample files live in <code className="font-mono">/public/samples/</code>.
          Keep headers lowercase and spelled exactly as shown.
        </p>
      </div>

      {/* Notes */}
      <div className="card">
        <h2 className="text-xl font-semibold">Notes & assumptions</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1 small">
          <li>Numbers are estimates to guide decisions; double-check before you buy or schedule.</li>
          <li>Inventory costs use a simple ordering + holding estimate; no advanced statistics.</li>
          <li>Patient Flow picks the smallest server count meeting your utilization cap and wait target.</li>
          <li>Staffing prevents more than one shift per person per day.</li>
        </ul>
      </div>
    </div>
  );
}
