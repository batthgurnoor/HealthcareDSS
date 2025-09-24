
import { useState } from "react";
import { loadCsvFile } from "../utils/csv";
import { validateBySchema, SCHEMA } from "../utils/validation";
import { createSchedule } from "../models/staffing";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export default function Staffing() {
  const [roster, setRoster] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [hoursPerShift, setHoursPerShift] = useState(8);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function onUploadRoster(e) {
    setError(""); setResult(null);
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const rows = await loadCsvFile(file);
      validateBySchema(rows, SCHEMA.staffRoster, "staff_roster");
      setRoster(rows);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function onUploadRequirements(e) {
    setError(""); setResult(null);
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const rows = await loadCsvFile(file);
      validateBySchema(rows, SCHEMA.shiftRequirements, "shift_requirements");
      setRequirements(rows);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function run() {
    try {
      if (!roster) throw new Error("Upload staff_roster.csv first.");
      if (!requirements) throw new Error("Upload shift_requirements.csv next.");
      const out = createSchedule(roster, requirements, Number(hoursPerShift));
      setResult(out);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Staffing — Simple, Cost-First Schedule</h2>
        <p className="small mt-1">
          This tool assigns staff to shifts with a simple rule:
          <b> choose the lowest-cost person with the right role, one shift per person per day.</b>
        </p>

        <div className="row mt-3">
          <div className="card">
            <label className="small">Upload <code className="font-mono">staff_roster.csv</code></label>
            <input aria-label="Upload staff roster CSV" type="file" accept=".csv" onChange={onUploadRoster} />
            <div className="small mt-2">
              Expected columns: <code className="font-mono">staff_id, name, role, wage_per_hour, skills</code>
            </div>
          </div>

          <div className="card">
            <label className="small">Upload <code className="font-mono">shift_requirements.csv</code></label>
            <input aria-label="Upload shift requirements CSV" type="file" accept=".csv" onChange={onUploadRequirements} />
            <div className="small mt-2">
              Expected columns: <code className="font-mono">date, shift, role, required</code>
            </div>
          </div>

          <div className="card">
            <label className="small">Hours per shift</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="1"
              step="1"
              value={hoursPerShift}
              aria-label="Hours per shift"
              onChange={(e) => setHoursPerShift(e.target.value)}
            />
            <p className="small mt-2">
              One person can work at most one shift per day. Adjust hours if your shifts are not 8 hours.
            </p>
            <button className="btn mt-3" onClick={run}>Create schedule</button>
          </div>
        </div>

        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      {result && (
        <>
          {/* KPIs */}
          <div className="row">
            <div className="metric" title="Total number of positions requested across all shifts">
              <span>Total positions requested</span>
              <b>{result.kpis.totalRequiredPositions}</b>
            </div>
            <div className="metric" title="Number of positions the tool was able to fill">
              <span>Positions filled</span>
              <b>{result.kpis.totalFilledPositions}</b>
            </div>
            <div className="metric" title="Filled ÷ requested">
              <span>Coverage rate</span>
              <b>{num.format(result.kpis.coverageRatePercent)}%</b>
            </div>
            <div className="metric" title="Total hours assigned (staff × hours per shift)">
              <span>Total labor hours</span>
              <b>{num.format(result.kpis.totalLaborHours)}</b>
            </div>
            <div className="metric" title="Sum of (wage_per_hour × hours) for all assignments">
              <span>Estimated labor cost</span>
              <b>{money.format(result.kpis.totalLaborCost)}</b>
            </div>
          </div>

          
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Unfilled needs (if any)</h3>
            {result.shortfalls.length === 0 ? (
              <p className="small">All shift requirements were covered.</p>
            ) : (
              <>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Role</th>
                      <th title="Positions requested for this shift">Requested</th>
                      <th title="Positions we were able to fill">Filled</th>
                      <th title="Positions still missing">Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.shortfalls.map((s, i) => (
                      <tr key={i}>
                        <td>{s.date}</td>
                        <td>{s.shift}</td>
                        <td>{s.role}</td>
                        <td>{s.required}</td>
                        <td>{s.filled}</td>
                        <td>{s.missing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="small mt-2">
                  Tip: Add more qualified staff to the roster for those roles/dates, or reduce the requested count.
                </p>
              </>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Schedule (who works where)</h3>
            {result.assignments.length === 0 ? (
              <p className="small">No assignments were made.</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Role</th>
                    <th>Staff ID</th>
                    <th>Staff name</th>
                    <th>Wage ($/hr)</th>
                    <th>Hours assigned</th>
                    <th>Cost ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.assignments.map((a, i) => (
                    <tr key={i}>
                      <td>{a.date}</td>
                      <td>{a.shift}</td>
                      <td>{a.role}</td>
                      <td>{a.staff_id}</td>
                      <td>{a.staff_name}</td>
                      <td>{num.format(a.wage_per_hour)}</td>
                      <td>{a.hours_assigned}</td>
                      <td>{num.format(a.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="small mt-2">
              Rule used: pick the lowest-cost qualified person for each required slot, and don’t assign anyone to more than one
              shift on the same day.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
