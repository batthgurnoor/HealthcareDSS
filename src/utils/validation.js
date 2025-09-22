// validation.js (ESM only)
// Tiny validation & coercion helpers for tabular data.

//
// Basic helpers
//
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return NaN;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

//
// Exported API
//

/**
 * Ensure we have at least one row.
 * @param {Array<Record<string, any>>} rows
 * @param {string} name - dataset name for error messages
 */
export function ensureRows(rows, name = "dataset") {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${name}: no rows found (empty file?)`);
  }
  return rows;
}

/**
 * Require the presence of specific columns across the dataset.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} columns
 */
export function requireColumns(rows, columns) {
  ensureRows(rows, "requireColumns");
  const present = new Set(Object.keys(rows[0] ?? {}));
  const missing = columns.filter((c) => !present.has(c));
  if (missing.length) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}`);
  }
  return rows;
}

/**
 * Coerce listed fields to Number. Throws if NaN.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} fields
 */
export function coerceNumberFields(rows, fields) {
  if (!fields?.length) return rows;
  rows.forEach((row, i) => {
    fields.forEach((f) => {
      if (!(f in row)) return; // allow absent optional fields
      const n = toNumber(row[f]);
      if (!Number.isFinite(n)) {
        throw new Error(`Row ${i + 1}: "${f}" must be a number, got "${row[f]}"`);
      }
      row[f] = n;
    });
  });
  return rows;
}

/**
 * Guard for nonnegative numbers. Returns the number if valid, otherwise throws.
 * @param {number} n
 * @param {string} name
 */
export function nonnegative(n, name = "value") {
  if (!Number.isFinite(n)) throw new Error(`${name}: not a finite number`);
  if (n < 0) throw new Error(`${name}: must be ≥ 0`);
  return n;
}

/**
 * Coerce listed columns to Date (expecting strict YYYY-MM-DD).
 * Throws if bad format or invalid date.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} fields
 */
export function coerceDateColumns(rows, fields) {
  if (!fields?.length) return rows;
  rows.forEach((row, i) => {
    fields.forEach((f) => {
      if (!(f in row)) return; // allow absent optional fields
      const raw = row[f];
      if (raw == null || raw === "") {
        throw new Error(`Row ${i + 1}: "${f}" must be YYYY-MM-DD (got empty)`);
      }
      const s = String(raw).trim();
      if (!ISO_DATE_RE.test(s)) {
        throw new Error(`Row ${i + 1}: "${f}" must be YYYY-MM-DD (got "${raw}")`);
      }
      const d = new Date(s); // "YYYY-MM-DD" is parsed as UTC by JS
      if (Number.isNaN(d.getTime())) {
        throw new Error(`Row ${i + 1}: "${f}" is not a valid date (got "${raw}")`);
      }
      row[f] = d;
    });
  });
  return rows;
}

/**
 * Apply numeric/string bounds & enums per field.
 * boundsMap shape:
 * {
 *   fieldName: {
 *     min?: number,
 *     max?: number,
 *     integer?: boolean,
 *     gt?: number,
 *     lt?: number,
 *     in?: any[]    // allowed values (strict equality)
 *   },
 *   ...
 * }
 * @param {Array<Record<string, any>>} rows
 * @param {Record<string, {min?:number, max?:number, gt?:number, lt?:number, integer?:boolean, in?:any[]}>} boundsMap
 */
export function applyBounds(rows, boundsMap = {}) {
  if (!isPlainObject(boundsMap) || !Object.keys(boundsMap).length) return rows;
  rows.forEach((row, i) => {
    for (const [field, rules] of Object.entries(boundsMap)) {
      if (!(field in row)) continue; // absent optional fields are okay
      const v = row[field];

      if (rules.in) {
        const ok = rules.in.some((allowed) => allowed === v);
        if (!ok) {
          throw new Error(`Row ${i + 1}: "${field}" must be one of [${rules.in.join(", ")}] (got "${v}")`);
        }
      }

      if (typeof v === "number") {
        if (rules.integer && !Number.isInteger(v)) {
          throw new Error(`Row ${i + 1}: "${field}" must be an integer (got ${v})`);
        }
        if (rules.min != null && v < rules.min) {
          throw new Error(`Row ${i + 1}: "${field}" must be ≥ ${rules.min} (got ${v})`);
        }
        if (rules.max != null && v > rules.max) {
          throw new Error(`Row ${i + 1}: "${field}" must be ≤ ${rules.max} (got ${v})`);
        }
        if (rules.gt != null && !(v > rules.gt)) {
          throw new Error(`Row ${i + 1}: "${field}" must be > ${rules.gt} (got ${v})`);
        }
        if (rules.lt != null && !(v < rules.lt)) {
          throw new Error(`Row ${i + 1}: "${field}" must be < ${rules.lt} (got ${v})`);
        }
      }
    }
  });
  return rows;
}

/**
 * Validate & coerce a dataset by a schema definition.
 * Schema shape:
 * {
 *   name: string,                    // for messages
 *   required: string[],              // required columns
 *   numbers?: string[],              // fields to coerce to number
 *   integers?: string[],             // subset of numbers that must be integers
 *   dates?: string[],                // fields to coerce to Date (YYYY-MM-DD)
 *   enums?: Record<string, any[]>,   // allowed values
 *   bounds?: Record<string, {...}>,  // numeric bounds (min/max/gt/lt/in/integer)
 * }
 * @param {Array<Record<string, any>>} rows
 * @param {ReturnType<typeof defineSchema>} schema
 */
export function validateBySchema(rows, schema) {
  assert(isPlainObject(schema), "validateBySchema: schema must be an object");
  ensureRows(rows, schema.name || "dataset");
  if (schema.required?.length) requireColumns(rows, schema.required);

  if (schema.numbers?.length) coerceNumberFields(rows, schema.numbers);
  if (schema.integers?.length) {
    rows.forEach((row, i) => {
      for (const f of schema.integers) {
        if (!(f in row)) continue;
        if (!Number.isInteger(row[f])) {
          throw new Error(`Row ${i + 1}: "${f}" must be an integer (got ${row[f]})`);
        }
      }
    });
  }
  if (schema.dates?.length) coerceDateColumns(rows, schema.dates);

  // enums -> convert to bounds.in for reuse
  const bounds = { ...(schema.bounds || {}) };
  if (schema.enums) {
    for (const [field, values] of Object.entries(schema.enums)) {
      bounds[field] = { ...(bounds[field] || {}), in: values };
    }
  }

  applyBounds(rows, bounds);
  return rows;
}

//
// Schema builder & predefined SCHEMA
//
function defineSchema(s) {
  return s;
}

/**
 * Domain schemas with "usual fields and bounds".
 * - serviceRates.service_level ∈ [0.5, 0.999]
 */
export const SCHEMA = {
  staffRoster: defineSchema({
    name: "staffRoster",
    required: ["staff_id", "name", "role", "start_date", "hourly_rate"],
    numbers: ["hourly_rate"],
    dates: ["start_date", "end_date"],
    bounds: {
      hourly_rate: { min: 0 },
    },
  }),

  shiftRequirements: defineSchema({
    name: "shiftRequirements",
    required: ["date", "shift", "role", "required_count"],
    numbers: ["required_count"],
    integers: ["required_count"],
    dates: ["date"],
    bounds: {
      required_count: { min: 0, integer: true },
      // optional: restrict shift names if your app uses a fixed set
      // shift: { in: ["day", "evening", "night"] },
    },
  }),

  inventory: defineSchema({
    name: "inventory",
    required: ["item_id", "item_name", "quantity", "unit_cost"],
    numbers: ["quantity", "unit_cost", "reorder_level"],
    integers: ["quantity", "reorder_level"],
    bounds: {
      quantity: { min: 0, integer: true },
      reorder_level: { min: 0, integer: true },
      unit_cost: { min: 0 },
    },
  }),

  patientArrivals: defineSchema({
    name: "patientArrivals",
    required: ["date", "hour", "arrivals"],
    numbers: ["hour", "arrivals"],
    integers: ["hour", "arrivals"],
    dates: ["date"],
    bounds: {
      hour: { min: 0, max: 23, integer: true },
      arrivals: { min: 0, integer: true },
    },
  }),

  serviceRates: defineSchema({
    name: "serviceRates",
    required: ["service", "rate", "service_level"],
    numbers: ["rate", "service_level", "capacity_per_hour"],
    bounds: {
      rate: { gt: 0 }, // strictly positive
      service_level: { min: 0.5, max: 0.999 },
      capacity_per_hour: { min: 0 }, // optional field
    },
  }),
};

export default {
  ensureRows,
  requireColumns,
  coerceNumberFields,
  nonnegative,
  coerceDateColumns,
  applyBounds,
  validateBySchema,
  SCHEMA,
};
