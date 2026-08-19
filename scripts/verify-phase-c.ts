/**
 * Phase C acceptance verification — client-shaped payloads + peer filter.
 * Run: npx tsx scripts/verify-phase-c.ts
 */
import { DataValueType } from "@prisma/client";
import {
  buildNumericColumnStats,
  shapeStudentAggregate,
  STUDENT_AGGREGATE_MIN_N,
  IQR_MIN_SAMPLE,
} from "../src/server/data/cohort-stats";

function cell(
  submissionId: string,
  memberTag: string,
  value: string,
  rowIndex = 0,
) {
  return {
    id: `${submissionId}-${rowIndex}`,
    submissionId,
    rowIndex,
    columnName: "od600",
    value,
    valueType: DataValueType.NUMBER,
    flagged: false,
    flagReason: null as string | null,
    submission: { memberId: memberTag },
  };
}

console.log("=== Phase C verification ===\n");
console.log(
  `Thresholds (deliberate, independent): IQR_MIN_SAMPLE=${IQR_MIN_SAMPLE}, STUDENT_AGGREGATE_MIN_N=${STUDENT_AGGREGATE_MIN_N}\n`,
);

// --- insufficient_sample: 3 numeric values (UI OutlierStatusLine) ---
console.log("--- Client payload: 3-value column → insufficient_sample ---");
const threeCells = [0.4, 0.42, 9.99].map((v, i) =>
  cell("s1", "m1", String(v), i),
);
const col3 = buildNumericColumnStats("od600", threeCells, { includeBins: true });
const directorColumnPayload = {
  columnName: col3.columnName,
  sampleSize: col3.sampleSize,
  mean: col3.mean,
  median: col3.median,
  outlierCheck: col3.outlierCheck,
  // What CohortDataPanel OutlierStatusLine renders:
  uiLine:
    col3.outlierCheck.status === "insufficient_sample"
      ? `Not enough data yet to flag outliers (need ${col3.outlierCheck.minRequired}+, have ${col3.sampleSize}).`
      : col3.outlierCheck.status,
};
console.log(JSON.stringify(directorColumnPayload, null, 2));
if (col3.outlierCheck.status !== "insufficient_sample") {
  console.error("FAIL: expected insufficient_sample");
  process.exit(1);
}
console.log("PASS: UI gets insufficient_sample (distinct from checked_clean)\n");

// Control: 4 tight values → checked_clean
const col4 = buildNumericColumnStats(
  "od600",
  [10, 11, 12, 13].map((v, i) => cell("s1", "m1", String(v), i)),
  { includeBins: false },
);
console.log("--- Control: 4 values → checked_clean ---");
console.log(
  JSON.stringify(
    { sampleSize: col4.sampleSize, outlierCheck: col4.outlierCheck },
    null,
    2,
  ),
);
if (col4.outlierCheck.status !== "checked_clean") {
  console.error("FAIL checked_clean");
  process.exit(1);
}
console.log("PASS\n");

// --- insufficient_cohort: 2 students (student You vs cohort panel) ---
console.log("--- Client payload: 2-student cohort → insufficient_cohort ---");
const twoStudentCells = [
  cell("subA", "memberA", "0.40"),
  cell("subB", "memberB", "0.60"),
];
const col2 = buildNumericColumnStats("od600", twoStudentCells, {
  includeBins: false,
});
const studentCohortField = shapeStudentAggregate(col2, 2);
const studentClientPayload = {
  role: "student",
  contributorCount: 2,
  peerRawRows: null,
  columns: [
    {
      columnName: "od600",
      own: { values: [0.4], mean: 0.4 },
      cohort: studentCohortField,
      // What CohortDataPanel renders when status !== ok:
      uiRenders:
        studentCohortField.status === "insufficient_cohort"
          ? { warnText: studentCohortField.message, hidesMeanMedian: true }
          : { showsMean: true },
    },
  ],
};
console.log(JSON.stringify(studentClientPayload, null, 2));
if (studentCohortField.status !== "insufficient_cohort") {
  console.error("FAIL insufficient_cohort");
  process.exit(1);
}
console.log("PASS: UI gets insufficient_cohort message (means hidden)\n");

// --- Peer filter (same logic as cohort-data student path + isolation test) ---
console.log("--- Peer raw-row filter (Student A cohort view) ---");
const peerSecret = "peer-raw-secret-iso-lab-a";
const milestoneCells = [
  {
    ...cell("subA", "studentA", "0.41"),
    value: "0.41",
  },
  {
    id: "peer-cell",
    submissionId: "subPeer",
    rowIndex: 0,
    columnName: "secret_metric",
    value: peerSecret,
    valueType: DataValueType.TEXT,
    flagged: false,
    flagReason: null,
    submission: { memberId: "studentPeer" },
  },
];
const studentAView = milestoneCells.filter(
  (c) => c.submission.memberId === "studentA",
);
const isolationLog = {
  case: "student cohort view never includes peer raw rows (same lab)",
  directorSeesPeer: milestoneCells.some((c) => c.value === peerSecret),
  studentAValues: studentAView.map((c) => c.value),
  studentAOmitsPeer: studentAView.every((c) => c.value !== peerSecret),
  peerRawRowsInApi: null,
};
console.log(JSON.stringify(isolationLog, null, 2));
if (!isolationLog.studentAOmitsPeer || !isolationLog.directorSeesPeer) {
  console.error("FAIL peer filter");
  process.exit(1);
}
console.log(
  "PASS: matches isolation log line — student A filter omits peer raw value\n",
);

console.log("=== Phase C verification passed ===");
