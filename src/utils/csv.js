// /csv.js
// ESM-only utility for reading & parsing CSV files with Papa Parse.
import Papa from "papaparse";

/**
 * Read a File/Blob as UTF-8 text.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => {
      // Strip UTF-8 BOM if present
      const text = typeof reader.result === "string" ? reader.result.replace(/^\uFEFF/, "") : "";
      resolve(text);
    };
    reader.readAsText(file);
  });
}

/**
 * Parse CSV text to array of plain objects using Papa Parse.
 * - header: true
 * - skipEmptyLines: true
 * - trims header keys and string values
 * - throws friendly error if Papa reports any
 * @param {string} text
 * @returns {Array<Record<string, any>>}
 */
export function parseCsv(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors && result.errors.length > 0) {
    const details = result.errors
      .map(e => {
        const rowInfo = Number.isInteger(e.row) && e.row >= 0 ? `row ${e.row}` : "unknown row";
        return `${rowInfo}: ${e.message}`;
      })
      .join("; ");
    throw new Error("CSV parse error: " + details);
  }

  // Trim header keys and string values
  const rows = (result.data || []).map((row) => {
    const trimmed = {};
    for (const [rawKey, value] of Object.entries(row)) {
      const key = String(rawKey).trim();
      trimmed[key] = (typeof value === "string") ? value.trim() : value;
    }
    return trimmed;
  });

  return rows;
}

/**
 * Convenience: read a CSV file then parse it.
 * @param {File|Blob} file
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function loadCsvFile(file) {
  const text = await readFileAsText(file);
  return parseCsv(text);
}
