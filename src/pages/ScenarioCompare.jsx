import { useState, useMemo } from "react";

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

export default function ScenarioCompare() {
  const [rows, setRows] = useState([]);
  const [riskRows, setRiskRows] = useState([]); // from mc_summary.csv or mc_aggregate.json (csv path shown here)
  const [error, setError] = useState("");

  async function onUploadScenarioCsv(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file for scenarios.");
      return;
    }
    const text = await file.text();
    const { headers, data } = parseCsv(text);

    const required = ["date","shift","scenario","predicted_patients","total_capacity","shortfall","total_cost","coverage_rate","status"];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) {
      setError(`Scenario CSV missing column(s): ${missing.join(", ")}`);
      setRows([]);
      return;
    }

    const numeric = ["predicted_patients","total_capacity","shortfall","total_cost","coverage_rate"];
    const cleaned = data.map(r => {
      const out = { ...r };
      numeric.forEach(k => (out[k] = r[k] === "" ? null : Number(r[k])));
      out.date = new Date(r.date).toISOString().slice(0,10);
      out.shift = String(r.shift || "").toLowerCase().trim();
      out.scenario = String(r.scenario || "").toLowerCase().trim();
      return out;
    });
    setRows(cleaned);
  }

  async function onUploadMcCsv(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file for Monte Carlo results.");
      return;
    }
    const text = await file.text();
    const { headers, data } = parseCsv(text);

    // Expect columns: date, shift, shortfall, (draw etc.)
    const must = ["date", "shift", "shortfall"];
    const missing = must.filter(r => !headers.includes(r));
    if (missing.length) {
      setError(`Monte Carlo CSV missing column(s): ${missing.join(", ")}`);
      setRiskRows([]);
      return;
    }

    const cleaned = data.map(r => ({
      date: new Date(r.date).toISOString().slice(0,10),
      shift: String(r.shift || "").toLowerCase().trim(),
      shortfall: r.shortfall === "" ? 0 : Number(r.shortfall)
    }));
    setRiskRows(cleaned);
  }

  // Aggregate MC -> probability of shortfall per (date, shift)
  const riskByKey = useMemo(() => {
    if (!riskRows.length) return {};
    const by = {};
    // group
    const map = new Map();
    for (const r of riskRows) {
      const key = `${r.date}|${r.shift}`;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    for (const [key, arr] of map) {
      const p = arr.length ? arr.filter(x => (x.shortfall || 0) > 0).length / arr.length : 0;
      by[key] = p; // probability of shortfall 0..1
    }
    return by;
  }, [riskRows]);

  // Roll up scenario table
  const scenarioSummary = useMemo(() => {
    if (!rows.length) return [];
    const by = {};
    for (const r of rows) {
      const scen = r.scenario || "unknown";
      by[scen] = by[scen] || { scenario: scen, totalCost: 0, avgCoverageSum: 0, count: 0, shortfallRows: 0, avgShortfallProb: 0, riskCount: 0 };
      by[scen].totalCost += r.total_cost || 0;
      by[scen].avgCoverageSum += r.coverage_rate || 0;
      by[scen].count += 1;
      if ((r.shortfall || 0) > 0) by[scen].shortfallRows += 1;

      // attach MC risk if we have it for this row’s (date,shift)
      const key = `${r.date}|${r.shift}`;
      if (key in riskByKey) {
        by[scen].avgShortfallProb += riskByKey[key];
        by[scen].riskCount += 1;
      }
    }
    return Object.values(by).map(v => ({
      scenario: v.scenario,
      totalCost: v.totalCost,
      avgCoverage: v.count ? v.avgCoverageSum / v.count : 0,
      shortfallRows: v.shortfallRows,
      shortfallProb: v.riskCount ? v.avgShortfallProb / v.riskCount : 0 // average probability across its rows
    })).sort((a,b) => a.scenario.localeCompare(b.scenario));
  }, [rows, riskByKey]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Scenario Comparison</h1>
      <p className="text-sm text-gray-600">
        Upload <span className="font-medium">scenario_staffing_summary.csv</span>. Optionally upload <span className="font-medium">mc_summary.csv</span> to see shortfall risk.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-gray-50 border">
          <label className="block text-sm font-medium mb-2  text-gray-700">Scenario summary (.csv)</label>
          <input type="file" accept=".csv" onChange={onUploadScenarioCsv}
                 className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700  text-gray-700" />
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 border">
          <label className="block text-sm font-medium mb-2  text-gray-700">Monte Carlo results (.csv) — optional</label>
          <input type="file" accept=".csv" onChange={onUploadMcCsv}
                 className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700  text-gray-700" />
          <p className="text-xs text-gray-500 mt-2">We compute the probability of shortfall per (date, shift) = fraction of draws with shortfall &gt; 0.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</p>}

      {scenarioSummary.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left text-gray-700">Scenario</th>
                <th className="p-3 text-right text-gray-700">Total Cost (period)</th>
                <th className="p-3 text-right text-gray-700">Average Coverage</th>
                <th className="p-3 text-right text-gray-700">Rows with Shortfall</th>
                <th className="p-3 text-right text-gray-700">Chance of Shortfall (MC)</th>
              </tr>
            </thead>
            <tbody>
              {scenarioSummary.map((r) => {
                const riskPct = (r.shortfallProb * 100).toFixed(1) + "%";
                const risky = r.shortfallProb >= 0.10; // highlight if >= 10%
                return (
                  <tr key={r.scenario} className="odd:bg-white even:bg-gray-50">
                    <td className="p-3 capitalize text-gray-700">{r.scenario}</td>
                    <td className="p-3 text-right text-gray-700">${r.totalCost.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-700">{(r.avgCoverage*100).toFixed(1)}%</td>
                    <td className="p-3 text-right text-gray-700">{r.shortfallRows}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-1 rounded-xl text-xs ${risky ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
                        {riskPct}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <div className="font-medium mb-1">Notes</div>
        <ul className="list-disc ml-5 space-y-1">
          <li><span className="font-medium">Chance of Shortfall</span> is averaged across all (date, shift) rows in the scenario using Monte Carlo draws.</li>
          <li><span className="font-medium">Red badge ≥ 10%</span> indicates a non-trivial risk of under-coverage.</li>
        </ul>
      </div>
    </div>
  );
}
