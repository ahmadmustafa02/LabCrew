import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DataValueType } from "@prisma/client";
import {
  buildNumericColumnStats,
  shapeStudentAggregate,
  STUDENT_AGGREGATE_MIN_N,
  IQR_MIN_SAMPLE,
} from "../../src/server/data/cohort-stats";

describe("IQR sub-threshold status", () => {
  it("marks insufficient_sample when n < 4 (not identical to checked_clean)", () => {
    const cells = [0.4, 0.42, 9.99].map((v, i) => ({
      id: `c${i}`,
      submissionId: "s1",
      rowIndex: i,
      columnName: "od600",
      value: String(v),
      valueType: DataValueType.NUMBER,
      flagged: false,
      flagReason: null,
    }));
    const col = buildNumericColumnStats("od600", cells, { includeBins: false });
    assert.equal(col.outlierCheck.status, "insufficient_sample");
    assert.equal(col.outlierCheck.minRequired, IQR_MIN_SAMPLE);
    assert.equal(col.sampleSize, 3);
  });

  it("marks checked_clean when n>=4 and no outliers", () => {
    const cells = [10, 11, 12, 13].map((v, i) => ({
      id: `c${i}`,
      submissionId: "s1",
      rowIndex: i,
      columnName: "od600",
      value: String(v),
      valueType: DataValueType.NUMBER,
      flagged: false,
      flagReason: null,
    }));
    const col = buildNumericColumnStats("od600", cells, { includeBins: true });
    assert.equal(col.outlierCheck.status, "checked_clean");
    assert.ok(col.bins && col.bins.length > 0);
  });
});

describe("small-cohort privacy", () => {
  it(`hides aggregates when contributorCount < ${STUDENT_AGGREGATE_MIN_N}`, () => {
    const col = buildNumericColumnStats(
      "od600",
      [
        {
          id: "1",
          submissionId: "a",
          rowIndex: 0,
          columnName: "od600",
          value: "1",
          valueType: DataValueType.NUMBER,
          flagged: false,
          flagReason: null,
        },
        {
          id: "2",
          submissionId: "b",
          rowIndex: 0,
          columnName: "od600",
          value: "3",
          valueType: DataValueType.NUMBER,
          flagged: false,
          flagReason: null,
        },
      ],
      { includeBins: false },
    );
    const shaped = shapeStudentAggregate(col, 2);
    assert.equal(shaped.status, "insufficient_cohort");
    if (shaped.status === "insufficient_cohort") {
      assert.equal(shaped.minRequired, STUDENT_AGGREGATE_MIN_N);
      assert.ok(shaped.message.includes("reveal"));
    }
  });

  it("shows mean/median at contributorCount >= 3", () => {
    const col = buildNumericColumnStats(
      "od600",
      [1, 2, 3].map((v, i) => ({
        id: String(i),
        submissionId: `s${i}`,
        rowIndex: 0,
        columnName: "od600",
        value: String(v),
        valueType: DataValueType.NUMBER,
        flagged: false,
        flagReason: null,
      })),
      { includeBins: false },
    );
    const shaped = shapeStudentAggregate(col, 3);
    assert.equal(shaped.status, "ok");
    if (shaped.status === "ok") {
      assert.equal(shaped.mean, 2);
      assert.equal(shaped.median, 2);
    }
  });
});
