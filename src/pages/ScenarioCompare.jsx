import { useState } from "react";

/**
 * Simple page to load data/scenario_staffing_summary.csv and show a scenario comparison table.
 * Expected headers: date,shift,scenario,predicted_patients,total_capacity,shortfall,total_cost,coverage_rate,status
 */
export default function ScenarioCompare() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], data: [] };
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const data = lines.slice(1).map(line => {
      const cells = line.split(",").map(c => c.trim());
      const obj = {};
      headers.forEach((h, i) => (obj[h] = cells[i]));
      return obj;
    });
    return { headers, data };
  }

  async function onUpload(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    const text = await file.text();
    const { headers, data } = parseCsv(text);

    const required = ["date","shift","scenario","predicted_patients","total_capacity","shortfall","total_cost","coverage_rate","status"];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) {
      setError(`Missing required column(s): ${missing.join(", ")}`);
      setRows([]);
      return;
    }

    const numeric = ["predicted_patients","total_capacity","shortfall","total_cost","coverage_rate"];
    const cleaned = data.map(r => {
      const out = { ...r };
      numeric.forEach(k => (out[k] = r[k] === "" ? null : Number(r[k])));
      return out;
    });
    setRows(cleaned);
  }

  // Rollup by scenario
  const totals = rows.reduce((acc, r) => {
    const s = r.scenario || "unknown";
    if (!acc[s]) acc[s] = { scenario: s, totalCost: 0, avgCoverageSum: 0, count: 0, shortfallRows: 0 };
    acc[s].totalCost += r.total_cost || 0;
    acc[s].avgCoverageSum += r.coverage_rate || 0;
    acc[s].count += 1;
    if ((r.shortfall || 0) > 0) acc[s].shortfallRows += 1;
    return acc;
  }, {});
  const summary = Object.values(totals).map(v => ({
    scenario: v.scenario,
    totalCost: v.totalCost,
    avgCoverage: v.count ? v.avgCoverageSum / v.count : 0,
    shortfallRows: v.shortfallRows
  })).sort((a,b) => a.scenario.localeCompare(b.scenario));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Scenario Comparison</h1>
      <p className="text-sm text-gray-600">
        Upload <span className="font-medium">scenario_staffing_summary.csv</span> from <code>analysis/optimize_scenarios.py</code>.
      </p>

      <div className="p-4 rounded-2xl bg-gray-50 border">
        <label className="block text-sm font-medium mb-2 text-gray-700">Upload scenario_staffing_summary.csv</label>
        <input
          type="file"
          accept=".csv"
          onChange={onUpload}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700 text-gray-700"
        />
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</p>}
      </div>

      {summary.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Scenario</th>
                <th className="p-3 text-right">Total Cost (period)</th>
                <th className="p-3 text-right">Average Coverage</th>
                <th className="p-3 text-right">Rows with Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.scenario} className="odd:bg-white even:bg-gray-50">
                  <td className="p-3 capitalize text-gray-700">{r.scenario}</td>
                  <td className="p-3 text-right text-gray-700">${r.totalCost.toLocaleString()}</td>
                  <td className="p-3 text-right text-gray-700">{(r.avgCoverage*100).toFixed(1)}%</td>
                  <td className="p-3 text-right text-gray-700">{r.shortfallRows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <div className="font-medium mb-1">Notes</div>
        <ul className="list-disc ml-5 space-y-1">
          <li><span className="font-medium">Total Cost</span> sums all rows in that scenario.</li>
          <li><span className="font-medium">Average Coverage</span> is the mean of row coverage rates (closer to 100% is better).</li>
          <li><span className="font-medium">Rows with Shortfall</span> indicates where capacity didn’t meet predicted patients.</li>
        </ul>
      </div>
    </div>
  );
}
