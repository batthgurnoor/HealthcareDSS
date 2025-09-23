// src/pages/Flow.jsx
import { useState } from "react";
import { loadCsvFile } from "../utils/csv";
import { validateBySchema, SCHEMA } from "../utils/validation";
import {
  averageArrivalRate,
  computeQueueMetrics,
  pickServerCount,
} from "../models/flow";

export default function Flow() {
  const [arrivalRatePerHour, setArrivalRatePerHour] = useState(null);
  const [averageServiceTimeMinutes, setAverageServiceTimeMinutes] = useState(12);
  const [utilizationCap, setUtilizationCap] = useState(0.85);
  const [queueWaitTargetMinutes, setQueueWaitTargetMinutes] = useState(10);

  const [result, setResult] = useState(null);
  const [nearbyOptions, setNearbyOptions] = useState(null);
  const [error, setError] = useState("");

  async function onUpload(e) {
    setError("");
    setResult(null);
    setNearbyOptions(null);
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const data = await loadCsvFile(file);
      validateBySchema(data, SCHEMA.patientArrivals, "patient_arrivals");
      const avg = averageArrivalRate(data);
      setArrivalRatePerHour(+avg.toFixed(3));
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function run() {
    try {
      setError("");
      setResult(null);
      setNearbyOptions(null);

      const lam = Number(arrivalRatePerHour);
      const svcMin = Number(averageServiceTimeMinutes);
      const rhoCap = Number(utilizationCap);
      const wqCap = Number(queueWaitTargetMinutes);

      if (!(lam >= 0)) throw new Error("Set the arrival rate or upload patient_arrivals.csv.");
      if (!(svcMin > 0)) throw new Error("Average service time must be > 0 minutes.");
      if (!(rhoCap > 0 && rhoCap < 1)) throw new Error("Utilization cap must be between 0 and 1.");
      if (!(wqCap >= 0)) throw new Error("Queue wait target must be ≥ 0 minutes.");

      const choice = pickServerCount(lam, svcMin, rhoCap, wqCap);
      setResult(choice);

      // Show a small comparison table around the chosen server count
      const serviceRatePerHour = 60 / svcMin;
      const start = Math.max(1, choice.serverCount - 2);
      const end = choice.serverCount + 2;
      const rows = [];
      for (let s = start; s <= end; s++) {
        rows.push(computeQueueMetrics(lam, serviceRatePerHour, s));
      }
      setNearbyOptions(rows);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Patient Flow — Capacity Selection (M/M/s)</h2>
        <p className="small mt-1 text-black">
          Choose the smallest number of servers that meets your utilization cap and queue-wait target.
        </p>

        <div className="row mt-3">
          <div className="card">
            <label className="small">Upload patient_arrivals.csv (date, hour, arrivals)</label>
            <input aria-label="Upload patient arrivals CSV" type="file" accept=".csv" onChange={onUpload} />
            <div className="small mt-2">
              The average arrivals/hour from this file becomes the arrival rate.
            </div>
          </div>

          <div className="card">
            <label className="small">Arrival rate (arrivals per hour)</label>
            <input
              className="mt-1 text-black"
              type="number"
              step="0.1"
              aria-label="Arrival rate per hour"
              placeholder={
                arrivalRatePerHour == null ? "set or upload CSV" : String(arrivalRatePerHour)
              }
              onChange={(e) =>
                setArrivalRatePerHour(e.target.value === "" ? null : Number(e.target.value))
              }
            />
            <label className="small mt-2">Average service time (minutes per patient)</label>
            <input
              className="mt-1 text-black"
              type="number"
              value={averageServiceTimeMinutes}
              min="1"
              step="0.5"
              aria-label="Average service time in minutes"
              onChange={(e) => setAverageServiceTimeMinutes(e.target.value)}
            />
          </div>

          <div className="card">
            <label className="small">Utilization cap (fraction busy, e.g., 0.85)</label>
            <input
              className="mt-1 text-black"
              type="number"
              value={utilizationCap}
              min="0.1"
              max="0.99"
              step="0.01"
              aria-label="Utilization cap"
              onChange={(e) => setUtilizationCap(e.target.value)}
            />
            <label className="small mt-2">Max queue wait target (minutes)</label>
            <input
              className="mt-1 text-black"
              type="number"
              value={queueWaitTargetMinutes}
              min="0"
              step="1"
              aria-label="Queue wait target minutes"
              onChange={(e) => setQueueWaitTargetMinutes(e.target.value)}
            />
            <button className="btn mt-3" onClick={run}>
              Recommend server count
            </button>
            <p className="small mt-2">
              Rule: start from utilization cap, then increase servers until the queue-wait target is met.
            </p>
          </div>
        </div>

        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="row">
            <div className="metric">
              <span>Recommended servers on duty</span>
              <b>{result.serverCount}</b>
            </div>
            <div className="metric">
              <span>Average utilization (fraction of time busy)</span>
              <b>{result.metrics.utilization}</b>
            </div>
            <div className="metric">
              <span>Probability a patient waits</span>
              <b>{result.metrics.waitProbability}</b>
            </div>
            <div className="metric">
              <span>Expected queue wait (minutes)</span>
              <b>{result.metrics.queueWaitMinutes}</b>
            </div>
          </div>

          {nearbyOptions && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">Compare nearby staffing options</h3>
              <table className="tbl">
                <thead>
                  <tr>
                    <th title="Number of parallel servers/clinicians working this area">Servers on duty</th>
                    <th title="Average fraction of time servers are busy">Average utilization</th>
                    <th title="Chance a patient has to wait (not served immediately)">Probability of waiting</th>
                    <th title="Expected time a patient spends waiting in the queue">Expected queue wait (min)</th>
                    <th title="Queue wait + service time">Average total time in system (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {nearbyOptions.map((r, i) => (
                    <tr key={i}>
                      <td>{r.s}</td>
                      <td>{r.utilization}</td>
                      <td>{r.waitProbability}</td>
                      <td>{r.queueWaitMinutes}</td>
                      <td>{r.totalTimeMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small mt-2">
                * “Total time in system” includes the time waiting plus the time receiving service.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
