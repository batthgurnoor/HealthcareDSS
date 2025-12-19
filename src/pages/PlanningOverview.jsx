import { useState, useMemo } from "react";

/* ---------- tiny CSV parser ---------- */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], data: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const data = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
  return { headers, data };
}

/* ---------- component ---------- */
export default function PlanningOverview() {
  const [tab, setTab] = useState("executive"); // executive | drill
  const [execRows, setExecRows] = useState([]); // manager_brief.csv rows
  const [drillRows, setDrillRows] = useState([]); // scenario_staffing_summary.csv rows
  const [riskRows, setRiskRows] = useState([]); // mc_summary.csv rows (optional)
  const [error, setError] = useState("");

  /* ----- uploads ----- */
  async function onUploadExec(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, data } = parseCsv(text);

    const required = [
      "scenario",
      "total_cost",
      "avg_coverage",
      "rows_with_shortfall",
      "avg_shortfall_probability",
    ];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length) {
      setError(`manager_brief.csv missing column(s): ${missing.join(", ")}`);
      setExecRows([]);
      return;
    }

    const cleaned = data.map((r) => ({
      scenario: String(r.scenario || "").trim(),
      total_cost: r.total_cost ? Number(r.total_cost) : null,
      avg_coverage: r.avg_coverage ? Number(r.avg_coverage) : null, // already %
      rows_with_shortfall: r.rows_with_shortfall ? Number(r.rows_with_shortfall) : 0,
      avg_shortfall_probability: r.avg_shortfall_probability
        ? Number(r.avg_shortfall_probability)
        : null, // already %
    }));
    setExecRows(cleaned);
  }

  async function onUploadDrill(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, data } = parseCsv(text);

    const required = [
      "date",
      "shift",
      "scenario",
      "predicted_patients",
      "total_capacity",
      "shortfall",
      "total_cost",
      "coverage_rate",
      "status",
    ];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length) {
      setError(
        `scenario_staffing_summary.csv missing column(s): ${missing.join(", ")}`
      );
      setDrillRows([]);
      return;
    }

    const cleaned = data.map((r) => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      shift: String(r.shift || "").toLowerCase().trim(),
      scenario: String(r.scenario || "").toLowerCase().trim(),
      predicted_patients: r.predicted_patients ? Number(r.predicted_patients) : 0,
      total_capacity: r.total_capacity ? Number(r.total_capacity) : 0,
      shortfall: r.shortfall ? Number(r.shortfall) : 0,
      total_cost: r.total_cost ? Number(r.total_cost) : 0,
      coverage_rate: r.coverage_rate ? Number(r.coverage_rate) : 0,
      status: r.status || "",
    }));
    setDrillRows(cleaned);
  }

  async function onUploadMc(e) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, data } = parseCsv(text);
    const must = ["date", "shift", "shortfall"];
    const missing = must.filter((r) => !headers.includes(r));
    if (missing.length) {
      setError(`mc_summary.csv missing column(s): ${missing.join(", ")}`);
      setRiskRows([]);
      return;
    }
    const cleaned = data.map((r) => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      shift: String(r.shift || "").toLowerCase().trim(),
      shortfall: r.shortfall ? Number(r.shortfall) : 0,
    }));
    setRiskRows(cleaned);
  }

  /* ----- risk map per (date,shift) from Monte Carlo ----- */
  const riskByKey = useMemo(() => {
    if (!riskRows.length) return {};
    const map = new Map();
    for (const r of riskRows) {
      const key = `${r.date}|${r.shift}`;
      const arr = map.get(key) || [];
      arr.push(r.shortfall > 0 ? 1 : 0);
      map.set(key, arr);
    }
    const out = {};
    for (const [k, arr] of map) out[k] = arr.reduce((a, b) => a + b, 0) / arr.length;
    return out; // prob 0..1
  }, [riskRows]);

  /* ----- drill-down rollup (per scenario) while showing MC risk if present ----- */
  const drillSummary = useMemo(() => {
    if (!drillRows.length) return [];
    const by = {};
    for (const r of drillRows) {
      const s = r.scenario || "unknown";
      by[s] = by[s] || {
        scenario: s,
        totalCost: 0,
        avgCoverageSum: 0,
        count: 0,
        shortfallRows: 0,
        avgShortfallProb: 0,
        riskCount: 0,
      };
      by[s].totalCost += r.total_cost || 0;
      by[s].avgCoverageSum += r.coverage_rate || 0;
      by[s].count += 1;
      if ((r.shortfall || 0) > 0) by[s].shortfallRows += 1;
      const key = `${r.date}|${r.shift}`;
      if (riskByKey[key] != null) {
        by[s].avgShortfallProb += riskByKey[key];
        by[s].riskCount += 1;
      }
    }
    return Object.values(by)
      .map((v) => ({
        scenario: v.scenario,
        totalCost: v.totalCost,
        avgCoverage: v.count ? (v.avgCoverageSum / v.count) * 100 : 0,
        shortfallRows: v.shortfallRows,
        shortfallProb: v.riskCount ? v.avgShortfallProb / v.riskCount : null, // 0..1
      }))
      .sort((a, b) => a.scenario.localeCompare(b.scenario));
  }, [drillRows, riskByKey]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Planning Overview</h1>
      <p className="text-sm text-gray-600">
        One page for both: <span className="font-medium">Executive Overview</span> (manager_brief.csv) and{" "}
        <span className="font-medium">Drill-down</span> (scenario_staffing_summary.csv). Optionally add{" "}
        <code>mc_summary.csv</code> to show “Chance of Shortfall”.
      </p>

      {/* tabs */}
      <div className="inline-flex rounded-xl border overflow-hidden">
        {["executive", "drill"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? "bg-gray-800 text-white" : "bg-white hover:bg-gray-50  text-gray-600"}`}
          >
            {t === "executive" ? "Executive Overview" : "Drill-down"}
          </button>
        ))}
      </div>

      {/* uploaders */}
      {tab === "executive" ? (
        <div className="grid md:grid-cols-1 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50 border">
            <label className="block text-sm font-medium mb-2 text-gray-600">Upload manager_brief.csv</label>
            <input
              type="file"
              accept=".csv"
              onChange={onUploadExec}
              className="file:mr-4  text-gray-600 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700"
            />
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50 border">
            <label className="block text-sm font-medium mb-2 text-gray-600">Upload scenario_staffing_summary.csv</label>
            <input
              type="file"
              accept=".csv"
              onChange={onUploadDrill}
              className="file:mr-4  text-gray-600 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700"
            />
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border">
            <label className="block text-sm font-medium mb-2 text-gray-600">
              Upload mc_summary.csv (optional, shows “Chance of Shortfall”)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={onUploadMc}
              className="file:mr-4  text-gray-600 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-800 file:text-white hover:file:bg-gray-700"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</p>
      )}

      {/* executive table */}
      {tab === "executive" && execRows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Scenario</th>
                <th className="p-3 text-right">Total Cost (period)</th>
                <th className="p-3 text-right">Average Coverage</th>
                <th className="p-3 text-right">Rows with Shortfall</th>
                <th className="p-3 text-right">Avg Chance of Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {execRows.map((r) => {
                const risk = r.avg_shortfall_probability;
                const risky = risk != null && risk >= 10; // percent
                return (
                  <tr key={r.scenario} className="odd:bg-white even:bg-gray-50">
                    <td className="p-3 capitalize">{r.scenario}</td>
                    <td className="p-3 text-right">
                      {r.total_cost == null ? "—" : `$${r.total_cost.toLocaleString()}`}
                    </td>
                    <td className="p-3 text-right">
                      {r.avg_coverage == null ? "—" : `${r.avg_coverage.toFixed(1)}%`}
                    </td>
                    <td className="p-3 text-right">{r.rows_with_shortfall}</td>
                    <td className="p-3 text-right">
                      {risk == null ? (
                        "—"
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-xl text-xs ${
                            risky
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-green-100 text-green-700 border border-green-200"
                          }`}
                        >
                          {risk.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* drill table + mini summary */}
      {tab === "drill" && (
        <>
          {drillRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Shift</th>
                    <th className="p-3 text-left">Scenario</th>
                    <th className="p-3 text-right">Predicted Patients</th>
                    <th className="p-3 text-right">Capacity</th>
                    <th className="p-3 text-right">Shortfall</th>
                    <th className="p-3 text-right">Coverage</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Chance of Shortfall</th>
                  </tr>
                </thead>
                <tbody>
                  {drillRows.map((r, i) => {
                    const key = `${r.date}|${r.shift}`;
                    const risk = riskByKey[key];
                    const risky = risk != null && risk >= 0.1;
                    return (
                      <tr key={i} className="odd:bg-white even:bg-gray-50">
                        <td className="p-3">{r.date}</td>
                        <td className="p-3 capitalize">{r.shift}</td>
                        <td className="p-3 capitalize">{r.scenario}</td>
                        <td className="p-3 text-right">{r.predicted_patients}</td>
                        <td className="p-3 text-right">{r.total_capacity}</td>
                        <td className="p-3 text-right">{r.shortfall}</td>
                        <td className="p-3 text-right">{(r.coverage_rate * 100).toFixed(1)}%</td>
                        <td className="p-3 text-right">${r.total_cost.toLocaleString()}</td>
                        <td className="p-3">{r.status}</td>
                        <td className="p-3 text-right">
                          {risk == null ? (
                            "—"
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-xl text-xs ${
                                risky
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-green-100 text-green-700 border border-green-200"
                              }`}
                            >
                              {(risk * 100).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {drillSummary.length > 0 && (
            <div className="rounded-2xl border p-4">
              <div className="font-semibold mb-2">Scenario roll-up (from drill data)</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3 text-left">Scenario</th>
                      <th className="p-3 text-right">Total Cost</th>
                      <th className="p-3 text-right">Avg Coverage</th>
                      <th className="p-3 text-right">Rows with Shortfall</th>
                      <th className="p-3 text-right">Avg Chance of Shortfall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillSummary.map((s) => {
                      const risky = s.shortfallProb != null && s.shortfallProb >= 0.1;
                      return (
                        <tr key={s.scenario} className="odd:bg-white even:bg-gray-50">
                          <td className="p-3 capitalize">{s.scenario}</td>
                          <td className="p-3 text-right">${s.totalCost.toLocaleString()}</td>
                          <td className="p-3 text-right">{s.avgCoverage.toFixed(1)}%</td>
                          <td className="p-3 text-right">{s.shortfallRows}</td>
                          <td className="p-3 text-right">
                            {s.shortfallProb == null ? "—" : (
                              <span className={`px-2 py-1 rounded-xl text-xs ${
                                risky ? "bg-red-100 text-red-700 border border-red-200" :
                                        "bg-green-100 text-green-700 border border-green-200"}`}>
                                {(s.shortfallProb * 100).toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
