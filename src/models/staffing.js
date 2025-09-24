//
// Simple staffing scheduler 
// Rule: For each required (date, shift, role), pick the lowest-cost staff with that role who hasn't already worked another shift that day. If we run out of people, record a shortfall.

// Inputs:
// - staffRows: [{ staff_id, name, role, wage_per_hour, ... }]
// - requirementRows: [{ date, shift, role, required }]
// - hoursPerShift: number (e.g., 8)

// Output:
// {
//   assignments: [{ date, shift, role, staff_id, staff_name, wage_per_hour, hours_assigned, cost }],
//   shortfalls:  [{ date, shift, role, required, filled, missing }],
//   kpis: {
//     totalRequiredPositions, totalFilledPositions, coverageRatePercent,
//     totalLaborHours, totalLaborCost, shiftsFullyCovered, shiftsWithShortfall
//   }
// }

function toIsoDate(value) {
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return String(value || "");
}

function compareByDateThenShift(a, b) {
  const da = toIsoDate(a.date);
  const db = toIsoDate(b.date);
  if (da < db) return -1;
  if (da > db) return 1;
  const sa = String(a.shift || "");
  const sb = String(b.shift || "");
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  const ra = String(a.role || "");
  const rb = String(b.role || "");
  return ra.localeCompare(rb);
}

export function createSchedule(staffRows, requirementRows, hoursPerShift = 8) {
  const hours = Number(hoursPerShift) > 0 ? Number(hoursPerShift) : 8;
  const staffByRole = new Map(); // role -> [{...}]
  for (const s of staffRows || []) {
    const role = String(s.role || "").trim();
    if (!role) continue;
    if (!staffByRole.has(role)) staffByRole.set(role, []);
    staffByRole.get(role).push({
      staff_id: s.staff_id,
      name: s.name,
      role,
      wage_per_hour: Number(s.wage_per_hour) || 0,
    });
  }
  for (const list of staffByRole.values()) {
    list.sort((a, b) => (a.wage_per_hour || 0) - (b.wage_per_hour || 0));
  }

  const assignedOnDate = new Map();

  const assignments = [];
  const shortfalls = [];

  const needs = [...(requirementRows || [])].sort(compareByDateThenShift);

  let totalRequiredPositions = 0;
  let totalFilledPositions = 0;

  for (const need of needs) {
    const dateIso = toIsoDate(need.date);
    const shift = String(need.shift || "").trim();
    const role = String(need.role || "").trim();
    const requiredCount = Math.max(0, Math.floor(Number(need.required) || 0));

    totalRequiredPositions += requiredCount;
    if (requiredCount === 0) continue;

    
    const candidates = staffByRole.get(role) || [];

    
    if (!assignedOnDate.has(dateIso)) assignedOnDate.set(dateIso, new Set());
    const alreadyAssigned = assignedOnDate.get(dateIso);

    let filled = 0;
    for (const cand of candidates) {
      if (filled >= requiredCount) break;
  
      if (alreadyAssigned.has(cand.staff_id)) continue;

      alreadyAssigned.add(cand.staff_id);
      filled += 1;
      totalFilledPositions += 1;

      const cost = cand.wage_per_hour * hours;
      assignments.push({
        date: dateIso,
        shift,
        role,
        staff_id: cand.staff_id,
        staff_name: cand.name,
        wage_per_hour: cand.wage_per_hour,
        hours_assigned: hours,
        cost: +cost.toFixed(2),
      });
    }

    const missing = requiredCount - filled;
    if (missing > 0) {
      shortfalls.push({
        date: dateIso,
        shift,
        role,
        required: requiredCount,
        filled,
        missing,
      });
    }
  }

  const shiftsWithShortfall = shortfalls.length;
 
  const totalShiftsWithNeeds = needs.filter(n => Number(n.required) > 0).length;
  const shiftsFullyCovered = totalShiftsWithNeeds - shiftsWithShortfall;

  const totalLaborCost = assignments.reduce((acc, a) => acc + Number(a.cost || 0), 0);
  const totalLaborHours = assignments.reduce((acc, a) => acc + Number(a.hours_assigned || 0), 0);
  const coverageRatePercent = totalRequiredPositions > 0
    ? +(100 * totalFilledPositions / totalRequiredPositions).toFixed(1)
    : 100;

  return {
    assignments,
    shortfalls,
    kpis: {
      totalRequiredPositions,
      totalFilledPositions,
      coverageRatePercent,
      totalLaborHours,
      totalLaborCost: +totalLaborCost.toFixed(2),
      shiftsFullyCovered,
      shiftsWithShortfall,
    },
  };
}
