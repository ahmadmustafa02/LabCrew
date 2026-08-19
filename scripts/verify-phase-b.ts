/**
 * Phase B acceptance verification — prints concrete inputs/outputs.
 * Run: npx tsx scripts/verify-phase-b.ts
 */
import { DataValueType } from "@prisma/client";
import {
  FLAG_IQR_OUTLIER,
  groupCellsToTable,
  iqrOutlierIndexes,
  parseCsvToRows,
  rowsToDataPoints,
  validateCsvHeadersAgainstSchema,
} from "../src/server/data/submission-data";

const schema = {
  columns: [
    { name: "sample_id", type: "text" as const },
    { name: "od600", type: "number" as const },
  ],
};

console.log("=== Phase B acceptance verification ===\n");

// Case 1: malformed CSV rejected with clear error
console.log("--- Case 1: malformed CSV (bad number) → reject ---");
const badCsv = "sample_id,od600\nA1,not-a-number\nA2,0.51";
const parsedBad = parseCsvToRows(badCsv);
const headerErr = validateCsvHeadersAgainstSchema(parsedBad.headers, schema);
const builtBad = rowsToDataPoints(parsedBad.rows, schema);
const case1 = {
  request: { dataCsv: badCsv, dataSchema: schema },
  response: {
    ok: false,
    status: 400,
    error: headerErr ?? builtBad.error,
  },
};
console.log(JSON.stringify(case1, null, 2));
if (!case1.response.error || !/expected number/i.test(case1.response.error)) {
  console.error("FAIL Case 1: expected clear type error");
  process.exit(1);
}
console.log("PASS Case 1: rejected with clear error\n");

// Case 1b: missing column
console.log("--- Case 1b: missing required column → reject ---");
const missing = validateCsvHeadersAgainstSchema(["sample_id"], schema);
console.log(
  JSON.stringify(
    {
      request: { headers: ["sample_id"], dataSchema: schema },
      response: { ok: false, status: 400, error: missing },
    },
    null,
    2,
  ),
);
if (!missing?.includes("od600")) {
  console.error("FAIL Case 1b");
  process.exit(1);
}
console.log("PASS Case 1b\n");

// Case 2: extreme value flagged, not rejected
console.log("--- Case 2: extreme value → accepted + IQR flagged ---");
const cohort = [0.4, 0.42, 0.45, 0.48, 9.99]; // 9.99 is extreme
const outlierIdx = iqrOutlierIndexes(cohort);
const cells = cohort.map((v, i) => ({
  rowIndex: i,
  columnName: "od600",
  value: String(v),
  valueType: DataValueType.NUMBER,
  flagged: outlierIdx.has(i),
  flagReason: outlierIdx.has(i) ? FLAG_IQR_OUTLIER : null,
}));
const table = groupCellsToTable(cells);
const case2 = {
  request: {
    note: "simulate persist after valid submit; then cohort IQR recompute",
    od600Values: cohort,
  },
  response: {
    ok: true,
    status: 200,
    rejected: false,
    outlierIndexes: Array.from(outlierIdx),
    dataTable: table,
    extremeCell: table.rows.find((r) => r.values.od600 === "9.99"),
  },
};
console.log(JSON.stringify(case2, null, 2));
if (outlierIdx.size === 0 || !outlierIdx.has(4)) {
  console.error("FAIL Case 2: extreme 9.99 should be flagged");
  process.exit(1);
}
if (case2.response.extremeCell?.flags?.od600?.flagged !== true) {
  console.error("FAIL Case 2: flagged badge missing on extreme cell");
  process.exit(1);
}
console.log("PASS Case 2: extreme accepted and flagged (not rejected)\n");

// Sub-threshold behavior (documented)
console.log("--- Sub-threshold IQR (n<4) ---");
const small = iqrOutlierIndexes([0.4, 0.42, 9.99]);
console.log(
  JSON.stringify(
    {
      values: [0.4, 0.42, 9.99],
      outlierIndexes: Array.from(small),
      behavior: "n<4 → no IQR flags; Phase C exposes outlierCheck.status=insufficient_sample in UI (distinct from checked_clean)",
    },
    null,
    2,
  ),
);
if (small.size !== 0) {
  console.error("FAIL: n<4 should not flag");
  process.exit(1);
}
console.log("PASS: n<4 skips outlier detection (no flags)\n");

console.log("=== All Phase B acceptance checks passed ===");
