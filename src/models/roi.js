
//
// Simple Management ROI math in plain English.
// Inputs are yearly savings and costs, a one-time setup cost, a discount rate (%), and a time horizon (years).
// Outputs include annual totals, payback months, NPV, and a simple cash flow list.

function toNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}


export function annualSavingsTotal(staffingPerYear, inventoryPerYear, flowPerYear) {
  return (
    toNumber(staffingPerYear) +
    toNumber(inventoryPerYear) +
    toNumber(flowPerYear)
  );
}

export function annualNetBenefit(annualSavings, annualOperatingCost) {
  return toNumber(annualSavings) - toNumber(annualOperatingCost);
}


export function buildCashflows(oneTimeImplementationCost, annualNet, years) {
  const n = Math.max(1, Math.floor(toNumber(years, 1)));
  const flows = [{ year: 0, amount: -toNumber(oneTimeImplementationCost) }];
  for (let t = 1; t <= n; t++) flows.push({ year: t, amount: toNumber(annualNet) });
  return flows;
}


export function npv(cashflows, discountRatePercent) {
  const r = toNumber(discountRatePercent) / 100;
  let total = 0;
  for (const cf of cashflows) {
    const disc = Math.pow(1 + r, cf.year);
    total += cf.amount / disc;
  }
  return total;
}


export function paybackMonths(oneTimeImplementationCost, annualNet) {
  const monthlyNet = toNumber(annualNet) / 12;
  if (monthlyNet > 0 && toNumber(oneTimeImplementationCost) > 0) {
    return toNumber(oneTimeImplementationCost) / monthlyNet;
  }
  return Infinity;
}


export function computeRoiSummary({
  staffingSavingsPerYear = 0,
  inventorySavingsPerYear = 0,
  flowSavingsPerYear = 0,
  oneTimeImplementationCost = 0,
  annualOperatingCost = 0,
  discountRatePercent = 8,
  years = 3,
}) {
  const annualSavings = annualSavingsTotal(
    staffingSavingsPerYear,
    inventorySavingsPerYear,
    flowSavingsPerYear
  );
  const annualNet = annualNetBenefit(annualSavings, annualOperatingCost);
  const cashflows = buildCashflows(oneTimeImplementationCost, annualNet, years);
  const npvValue = npv(cashflows, discountRatePercent);
  const payback = paybackMonths(oneTimeImplementationCost, annualNet);

  return {
    annualSavings,
    annualNet,
    cashflows,
    npv: npvValue,
    paybackMonths: payback,
  };
}
