
import { useMemo, useState } from "react";
import { computeRoiSummary } from "../models/roi";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export default function ROI() {
  // Plain-English inputs
  const [staffingSavingsPerYear, setStaffingSavingsPerYear] = useState(50000);
  const [inventorySavingsPerYear, setInventorySavingsPerYear] = useState(20000);
  const [flowSavingsPerYear, setFlowSavingsPerYear] = useState(15000);

  const [oneTimeImplementationCost, setOneTimeImplementationCost] = useState(15000);
  const [annualOperatingCost, setAnnualOperatingCost] = useState(5000);

  const [discountRatePercent, setDiscountRatePercent] = useState(8);
  const [years, setYears] = useState(3);

  const summary = useMemo(
    () =>
      computeRoiSummary({
        staffingSavingsPerYear,
        inventorySavingsPerYear,
        flowSavingsPerYear,
        oneTimeImplementationCost,
        annualOperatingCost,
        discountRatePercent,
        years,
      }),
    [
      staffingSavingsPerYear,
      inventorySavingsPerYear,
      flowSavingsPerYear,
      oneTimeImplementationCost,
      annualOperatingCost,
      discountRatePercent,
      years,
    ]
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Management ROI — Simple Calculator</h2>
        <p className="small mt-1 ">
          Enter rough yearly savings and costs. We’ll show <b>payback</b>, <b>NPV</b>, and a short
          <b> cash flow summary</b> you can share with managers.
        </p>

        <div className="row mt-3">
          {/* Savings */}
          <div className="card">
            <h3 className="font-semibold mb-2">Estimated yearly savings</h3>

            <label className="small">Staffing savings (per year)</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="0"
              step="100"
              value={staffingSavingsPerYear}
              onChange={(e) => setStaffingSavingsPerYear(Number(e.target.value))}
            />
            <p></p>

            <label className="small mt-3">Inventory savings (per year)</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="0"
              step="100"
              value={inventorySavingsPerYear}
              onChange={(e) => setInventorySavingsPerYear(Number(e.target.value))}
            />
            <p></p>

            <label className="small mt-3">Patient flow savings (per year)</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="0"
              step="100"
              value={flowSavingsPerYear}
              onChange={(e) => setFlowSavingsPerYear(Number(e.target.value))}
            />
            <p></p>
          </div>

          {/* Costs */}
          <div className="card">
            <h3 className="font-semibold mb-2">Costs</h3>

            <label className="small">One-time implementation cost (Year 0)</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="0"
              step="100"
              value={oneTimeImplementationCost}
              onChange={(e) => setOneTimeImplementationCost(Number(e.target.value))}
            />
            <p className="small opacity-80 mt-1 ">Setup, data cleaning, change management.</p>

            <label className="small mt-3">Annual operating cost</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="0"
              step="100"
              value={annualOperatingCost}
              onChange={(e) => setAnnualOperatingCost(Number(e.target.value))}
            />
            <p className="small opacity-80 mt-1 ">Training, minor updates, and support.</p>
          </div>

          {/* Finance settings */}
          <div className="card">
            <h3 className="font-semibold mb-2">Finance settings</h3>

            <label className="small">Discount rate (% per year)</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={discountRatePercent}
              onChange={(e) => setDiscountRatePercent(Number(e.target.value))}
            />

            <label className="small mt-3">Time horizon (years)</label>
            <input
              className="mt-1 text-black"
              type="number"
              min="1"
              max="10"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Key figures */}
      <div className="row">
        <div className="metric" title="Total estimated yearly savings before costs">
          <span>Total estimated savings (per year)</span>
          <b>{money.format(summary.annualSavings)}</b>
        </div>
        <div className="metric" title="Savings minus annual operating cost">
          <span>Net benefit (per year, after operating cost)</span>
          <b>{money.format(summary.annualNet)}</b>
        </div>
        <div className="metric" title="How long to earn back the one-time cost using monthly net benefit">
          <span>Payback period</span>
          <b>
            {Number.isFinite(summary.paybackMonths)
              ? `${num.format(summary.paybackMonths)} months`
              : "No payback (net ≤ 0)"}
          </b>
        </div>
        <div className="metric" title="NPV of Year 0 + yearly net benefits">
          <span>NPV over the horizon</span>
          <b>{money.format(summary.npv)}</b>
        </div>
      </div>

      {/* Cash flow table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Cash flow summary</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>Year</th>
              <th>Cash flow</th>
              <th>What this means</th>
            </tr>
          </thead>
          <tbody>
            {summary.cashflows.map((cf, i) => (
              <tr key={i}>
                <td>{cf.year}</td>
                <td>{money.format(cf.amount)}</td>
                <td>
                  {cf.year === 0
                    ? "One-time setup cost (paid at the beginning)."
                    : "Net benefit for the year (savings minus operating cost)."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small mt-2">
          Notes: NPV discounts future years by your chosen rate. Payback divides the one-time cost by the monthly net benefit.
        </p>
      </div>
    </div>
  );
}
