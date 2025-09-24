// src/pages/Inventory.jsx
import { useState, useMemo } from "react";
import { loadCsvFile } from "../utils/csv";
import { validateBySchema, SCHEMA } from "../utils/validation";
import { computeTableDaysCover } from "../models/inventory";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export default function Inventory() {
  const [rows, setRows] = useState(null);
  const [safetyDays, setSafetyDays] = useState(5);   // extra days of demand to buffer
  const [reviewDays, setReviewDays] = useState(14);  // how often you typically reorder
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  async function onUpload(e) {
    setError(""); setResults(null); setRows(null);
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const data = await loadCsvFile(file);
      validateBySchema(data, SCHEMA.inventory, "inventory");
      setRows(data);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function run() {
    try {
      if (!rows) throw new Error("Upload inventory.csv first (see /public/samples).");
      const table = computeTableDaysCover(rows, Number(safetyDays), Number(reviewDays));
      setResults(table);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  const totals = useMemo(() => {
    if (!results) return null;
    const sum = (k) => results.reduce((acc, r) => acc + Number(r[k] || 0), 0);
    return {
      policy: sum("AnnualCost_Policy"),
      baseline: sum("AnnualCost_BaselineMonthly"),
      savings: sum("Annual_Savings_vs_Baseline"),
    };
  }, [results]);

  return (
    <div className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Inventory — Days-of-Cover Policy (simple & structured)</h2>
        <p className="small mt-1 text-black">
          This tool helps you decide <b>when to reorder</b> and <b>how much to order</b> using a simple,
          explainable rule based on average daily demand.
        </p>

        <div className="row mt-3">
          <div className="card">
            <label className="small">Upload <code className="font-mono">inventory.csv</code></label>
            <input
              aria-label="Upload inventory CSV"
              type="file"
              accept=".csv"
              onChange={onUpload}
            />
            <div className="small mt-2">
              Expected columns: <code className="font-mono">item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days</code>.<br/>
             
            </div>
            <div className="small mt-2">
              Tip: A sample file lives at <code className="font-mono">/public/samples/inventory.csv</code>.
            </div>
          </div>

          <div className="card">
            <label className="small">Safety buffer (days of demand)</label>
            <input
              className="mt-1 text-black"
              type="number"
              value={safetyDays}
              min="0"
              step="1"
              aria-label="Safety buffer in days"
              onChange={(e) => setSafetyDays(e.target.value)}
            />
            <p className="small mt-1 text-black opacity-80">
              Extra days of demand you want to keep on hand as a buffer (e.g., 3–7).
            </p>

            <label className="small mt-3">Review period (days)</label>
            <input
              className="mt-1 text-black"
              type="number"
              value={reviewDays}
              min="1"
              step="1"
              aria-label="Review period in days"
              onChange={(e) => setReviewDays(e.target.value)}
            />
            <p className="small mt-1 text-black opacity-80">
              How often you typically place orders (e.g., every 14 days).
            </p>

            <button className="btn mt-3" onClick={run}>
              Calculate reorder points and order sizes
            </button>
          </div>

          <div className="card">
            <h3 className="font-semibold">How this rule works</h3>
            <ul className="list-disc pl-6 small mt-2 space-y-1">
              <li>
                <b>Average daily demand</b> = <code>D / 365</code> (from <code>annual_demand</code>)
              </li>
              <li>
                <b>Reorder when stock reaches s</b> (units) = daily demand × (<code>lead_time_days</code> + <b>safetyDays</b>)
              </li>
              <li>
                <b>Order up to S</b> (units) = daily demand × (<code>lead_time_days</code> + <b>safetyDays</b> + <b>reviewDays</b>)
              </li>
              <li>
                <b>Typical order size Q</b> (units) ≈ daily demand × <b>reviewDays</b>
              </li>
              <li>
                <b>Costs (yearly)</b> = ordering cost + holding cost (simple estimate)
              </li>
            </ul>
          </div>
        </div>

        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      {results && (
        <>
          <div className="row">
            <div className="metric" title="Estimated sum of policy costs across all items">
              <span>Estimated annual cost (policy)</span>
              <b>${fmt.format(totals?.policy ?? 0)}</b>
            </div>
            <div className="metric" title="Estimated sum if you ordered monthly for every item">
              <span>Estimated annual cost (monthly baseline)</span>
              <b>${fmt.format(totals?.baseline ?? 0)}</b>
            </div>
            <div className="metric" title="Policy cost minus monthly baseline (positive = saving)">
              <span>Estimated annual savings vs baseline</span>
              <b>${fmt.format(totals?.savings ?? 0)}</b>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Results (per item)</h3>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th title="Reorder when on-hand falls to this level">Reorder point <i>(s, units)</i></th>
                  <th title="Target stock after receiving an order">Order-up-to level <i>(S, units)</i></th>
                  <th title="Typical order size placed each review period">Typical order size <i>(Q, units)</i></th>
                  <th title="Extra units kept as a buffer">Safety buffer <i>(units)</i></th>
                  <th title="Estimated yearly cost with this policy">Annual cost — policy</th>
                  <th title="Estimated yearly cost if ordering monthly">Annual cost — monthly baseline</th>
                  <th title="Policy minus baseline (positive = saving)">Annual savings vs baseline</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.item}</td>
                    <td>{fmt.format(r.s)}</td>
                    <td>{fmt.format(r.S)}</td>
                    <td>{fmt.format(r.Q_policy)}</td>
                    <td>{fmt.format(r.SafetyStockUnits)}</td>
                    <td>${fmt.format(r.AnnualCost_Policy)}</td>
                    <td>${fmt.format(r.AnnualCost_BaselineMonthly)}</td>
                    <td>${fmt.format(r.Annual_Savings_vs_Baseline)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr>
                    <th colSpan={5} className="text-right">Totals:</th>
                    <th>${fmt.format(totals.policy)}</th>
                    <th>${fmt.format(totals.baseline)}</th>
                    <th>${fmt.format(totals.savings)}</th>
                  </tr>
                </tfoot>
              )}
            </table>
            <p className="small mt-2">
              * <b>s</b> = reorder point; <b>S</b> = order-up-to level; <b>Q</b> = typical order size.
              Costs use a simple estimate: ordering cost + holding cost.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
