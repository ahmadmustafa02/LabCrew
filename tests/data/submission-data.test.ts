import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DataValueType } from "@prisma/client";
import {
  FLAG_DUPLICATE_ROW,
  FLAG_IQR_OUTLIER,
  findDuplicateRowIndexes,
  fingerprintRowSet,
  iqrOutlierIndexes,
  parseCsvToRows,
  rowsToDataPoints,
  validateCsvHeadersAgainstSchema,
} from "../../src/server/data/submission-data";

describe("schema validation (director-defined only)", () => {
  it("rejects missing schema columns in CSV headers", () => {
    const err = validateCsvHeadersAgainstSchema(["sample_id"], {
      columns: [
        { name: "sample_id", type: "text" },
        { name: "od600", type: "number" },
      ],
    });
    assert.match(err ?? "", /od600/);
  });

  it("rejects non-numeric values when schema says number", () => {
    const built = rowsToDataPoints(
      [{ sample_id: "A1", od600: "not-a-number" }],
      {
        columns: [
          { name: "sample_id", type: "text" },
          { name: "od600", type: "number" },
        ],
      },
    );
    assert.ok(built.error);
    assert.match(built.error!, /od600/);
    assert.match(built.error!, /expected number/);
  });

  it("stores NUMBER valueType for valid schema numbers", () => {
    const built = rowsToDataPoints(
      [{ sample_id: "A1", od600: "0.42" }],
      {
        columns: [
          { name: "sample_id", type: "text" },
          { name: "od600", type: "number" },
        ],
      },
    );
    assert.equal(built.error, undefined);
    const od = built.cells.find((c) => c.columnName === "od600");
    assert.equal(od?.valueType, DataValueType.NUMBER);
    assert.equal(od?.value, "0.42");
  });
});

describe("no-schema freeform", () => {
  it("accepts any columns and infers types per cell", () => {
    const built = rowsToDataPoints(
      [
        { label: "A", n: "12", flag: "true" },
        { label: "B", n: "x", flag: "nope" },
      ],
      null,
    );
    assert.equal(built.error, undefined);
    const types = Object.fromEntries(
      built.cells.map((c) => [`${c.rowIndex}:${c.columnName}`, c.valueType]),
    );
    assert.equal(types["0:n"], DataValueType.NUMBER);
    assert.equal(types["0:flag"], DataValueType.BOOLEAN);
    assert.equal(types["1:n"], DataValueType.TEXT);
    assert.equal(types["1:flag"], DataValueType.TEXT);
  });

  it("does not invent a schema from the first row", () => {
    const parsed = parseCsvToRows("a,b\n1,2\nhello,world");
    assert.equal(parsed.error, undefined);
    const built = rowsToDataPoints(parsed.rows, null);
    assert.equal(built.error, undefined);
    // row0 a is number, row1 a is text — both allowed
    assert.equal(
      built.cells.find((c) => c.rowIndex === 0 && c.columnName === "a")?.valueType,
      DataValueType.NUMBER,
    );
    assert.equal(
      built.cells.find((c) => c.rowIndex === 1 && c.columnName === "a")?.valueType,
      DataValueType.TEXT,
    );
  });
});

describe("duplicates", () => {
  it("flags duplicate rows within a payload", () => {
    const rows = [
      { id: "1", v: "10" },
      { id: "2", v: "20" },
      { id: "1", v: "10" },
    ];
    const dups = findDuplicateRowIndexes(rows, ["id", "v"]);
    assert.ok(dups.has(0) && dups.has(2));
    const built = rowsToDataPoints(rows, null, { duplicateRowIndexes: dups });
    assert.ok(built.cells.some((c) => c.flagReason?.includes(FLAG_DUPLICATE_ROW)));
  });

  it("fingerprint matches identical row sets regardless of cell order", () => {
    const a = fingerprintRowSet([
      { rowIndex: 0, columnName: "b", value: "2" },
      { rowIndex: 0, columnName: "a", value: "1" },
    ]);
    const b = fingerprintRowSet([
      { rowIndex: 0, columnName: "a", value: "1" },
      { rowIndex: 0, columnName: "b", value: "2" },
    ]);
    assert.equal(a, b);
  });
});

describe("IQR outliers", () => {
  it("flags extreme values with Tukey fences (≥4 samples)", () => {
    // Mostly clustered 10..13, one extreme 100
    const values = [10, 11, 12, 13, 100];
    const idx = iqrOutlierIndexes(values);
    assert.ok(idx.has(4));
    assert.ok(!idx.has(0));
  });

  it("skips flagging when fewer than 4 values", () => {
    assert.equal(iqrOutlierIndexes([1, 2, 100]).size, 0);
  });

  it("exports FLAG_IQR_OUTLIER constant for persistence", () => {
    assert.equal(FLAG_IQR_OUTLIER, "iqr_outlier");
  });
});
