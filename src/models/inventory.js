// Inventory rules (simple, structured, no statistics)
// Policy: "Days of cover" (s, S)
// - safetyBufferDays: extra days of demand to carry as a buffer
// - reviewPeriodDays: how often you typically place orders
//
// Inputs per row (from inventory.csv):
//   item, annual_demand, unit_cost, setup_cost, holding_cost_rate, lead_time_days
//
// Outputs per row:
//   s  : Reorder point (units) — reorder when on-hand reaches this level
//   S  : Order-up-to level (units) — target stock right after receiving an order
//   Q_policy : Typical order size (units) — what you'd order each review period
//   SafetyStockUnits : Buffer units (from safety buffer days)
//   AnnualCost_Policy : Estimated yearly cost with this policy
//   AnnualCost_BaselineMonthly : Estimated yearly cost if you ordered monthly
//   Annual_Savings_vs_Baseline : Baseline minus Policy (positive = saving)

const DAYS_PER_YEAR = 365;

function positiveOrTiny(n) {
  return Math.max(Number(n) || 0, 1e-9);
}

/** Compute (s, S) for a single item using the Days-of-Cover policy.
 * @param {object} row - one row from inventory.csv
 * @param {number} safetyBufferDays - extra days of demand to hold as buffer (e.g., 3–7)
 * @param {number} reviewPeriodDays - how often you usually reorder (e.g., 14)
 * @returns {object} result row with keys used by the UI
 */
export function computeRowDaysCover(row, safetyBufferDays = 5, reviewPeriodDays = 14) {

  const itemName = row.item;

  const annualDemandUnitsPerYear = Number(row.annual_demand);       
  const unitCost = Number(row.unit_cost);                             
  const orderSetupCostPerOrder = Number(row.setup_cost);              
  const holdingCostRatePerYear = Number(row.holding_cost_rate);      
  const leadTimeDays = Number(row.lead_time_days);                     

  // --- Basic derived quantities ---
  const averageDailyDemandUnits = (annualDemandUnitsPerYear || 0) / DAYS_PER_YEAR; 
  const holdingCostPerUnitPerYear = holdingCostRatePerYear * unitCost;             

  // --- Policy levels (units) ---
  const reorderPointUnits =
    averageDailyDemandUnits * (leadTimeDays + Number(safetyBufferDays)); 
  const orderUpToLevelUnits =
    averageDailyDemandUnits * (leadTimeDays + Number(safetyBufferDays) + Number(reviewPeriodDays)); 
  const typicalOrderQuantityUnits =
    averageDailyDemandUnits * Number(reviewPeriodDays); 

  // --- Costs (simple estimate) ---
  const ordersPerYear = annualDemandUnitsPerYear / positiveOrTiny(typicalOrderQuantityUnits);
  const orderingCostAnnual = orderSetupCostPerOrder * ordersPerYear;

  // Average on-hand 
  const safetyBufferUnits = averageDailyDemandUnits * Number(safetyBufferDays);
  const averageOnHandUnits = safetyBufferUnits + typicalOrderQuantityUnits / 2;
  const holdingCostAnnual = holdingCostPerUnitPerYear * averageOnHandUnits;

  const annualCostPolicy = orderingCostAnnual + holdingCostAnnual;

  // --- Baseline comparison: monthly ordering (12 orders/year) ---
  const baselineOrderQtyUnits = annualDemandUnitsPerYear / 12;
  const baselineOrdersPerYear = annualDemandUnitsPerYear / positiveOrTiny(baselineOrderQtyUnits); 
  const baselineOrderingCost = orderSetupCostPerOrder * baselineOrdersPerYear;
  const baselineAvgOnHand = safetyBufferUnits + baselineOrderQtyUnits / 2; 
  const baselineHoldingCost = holdingCostPerUnitPerYear * baselineAvgOnHand;
  const annualCostBaseline = baselineOrderingCost + baselineHoldingCost;

  return {
    item: itemName,
    s: +reorderPointUnits.toFixed(2),                       
    S: +orderUpToLevelUnits.toFixed(2),                    
    Q_policy: +typicalOrderQuantityUnits.toFixed(2),        
    SafetyStockUnits: +safetyBufferUnits.toFixed(2),       
    AnnualCost_Policy: +annualCostPolicy.toFixed(2),       
    AnnualCost_BaselineMonthly: +annualCostBaseline.toFixed(2), 
    Annual_Savings_vs_Baseline: +(annualCostBaseline - annualCostPolicy).toFixed(2),
  };
}


export function computeTableDaysCover(rows, safetyBufferDays = 5, reviewPeriodDays = 14) {
  const sDays = Number(safetyBufferDays);
  const rDays = Number(reviewPeriodDays);
  return rows.map((r) => computeRowDaysCover(r, sDays, rDays));
}



/** EOQ = Economic Order Quantity*/
export function eoq(annualDemandUnitsPerYear, orderSetupCostPerOrder, holdingCostPerUnitPerYear) {
  const H = positiveOrTiny(holdingCostPerUnitPerYear);
  const q = Math.sqrt((2 * (Number(annualDemandUnitsPerYear) || 0) * Number(orderSetupCostPerOrder || 0)) / H);
  return isFinite(q) ? q : 0;
}

export function annualCost(annualDemandUnitsPerYear, orderQuantityUnits, orderSetupCostPerOrder, holdingCostPerUnitPerYear) {
  const Q = positiveOrTiny(orderQuantityUnits);
  const D = Number(annualDemandUnitsPerYear) || 0;
  return (D / Q) * Number(orderSetupCostPerOrder || 0) + (Q / 2) * Number(holdingCostPerUnitPerYear || 0);
}
