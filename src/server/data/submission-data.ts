import { DataValueType } from "@prisma/client";

export type DataColumnType = "text" | "number" | "boolean";

export type DataColumnDef = {
  name: string;
  type: DataColumnType;
};

export type DataSchema = {
  columns: DataColumnDef[];
};

export type DataRowInput = Record<string, string | number | boolean | null | undefined>;

export type ParsedDataCell = {
  rowIndex: number;
  columnName: string;
  value: string;
  valueType: DataValueType;
  flagged?: boolean;
  flagReason?: string | null;
};

export const FLAG_DUPLICATE_ROW = "duplicate_row";
export const FLAG_DUPLICATE_RESUBMIT = "duplicate_resubmission";
export const FLAG_IQR_OUTLIER = "iqr_outlier";

export function parseDataSchema(raw: unknown): DataSchema | null {
  if (!raw || typeof raw !== "object") return null;
  const columns = (raw as { columns?: unknown }).columns;
  if (!Array.isArray(columns) || columns.length === 0) return null;
  const parsed: DataColumnDef[] = [];
  for (const col of columns) {
    if (!col || typeof col !== "object") continue;
    const name = String((col as { name?: unknown }).name ?? "").trim();
    const typeRaw = String((col as { type?: unknown }).type ?? "text").toLowerCase();
    if (!name) continue;
    const type: DataColumnType =
      typeRaw === "number" || typeRaw === "boolean" ? typeRaw : "text";
    parsed.push({ name, type });
  }
  return parsed.length ? { columns: parsed } : null;
}

function toValueType(t: DataColumnType | undefined): DataValueType {
  if (t === "number") return DataValueType.NUMBER;
  if (t === "boolean") return DataValueType.BOOLEAN;
  return DataValueType.TEXT;
}

function inferType(value: string): DataValueType {
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "false") return DataValueType.BOOLEAN;
  if (v !== "" && !Number.isNaN(Number(v))) return DataValueType.NUMBER;
  return DataValueType.TEXT;
}

function isValidBooleanText(text: string): boolean {
  const v = text.trim().toLowerCase();
  return v === "true" || v === "false" || v === "1" || v === "0" || v === "yes" || v === "no";
}

function normalizeBooleanText(text: string): string {
  const v = text.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return "true";
  return "false";
}

function isValidNumberText(text: string): boolean {
  const v = text.trim();
  if (!v) return false;
  return Number.isFinite(Number(v));
}

/**
 * Normalize a cell. When `expected` is set (director schema), reject type mismatches
 * via thrown-style result in validate path — here returns error string.
 */
function normalizeCell(
  raw: string | number | boolean | null | undefined,
  expected?: DataColumnType,
  strict = false,
): { value: string; valueType: DataValueType } | { error: string } | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") {
    if (strict && expected && expected !== "boolean") {
      return { error: `expected ${expected}, got boolean` };
    }
    return { value: raw ? "true" : "false", valueType: DataValueType.BOOLEAN };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    if (strict && expected && expected !== "number") {
      return { error: `expected ${expected}, got number` };
    }
    return { value: String(raw), valueType: DataValueType.NUMBER };
  }
  const text = String(raw).trim();
  if (!text) return null;

  if (expected && strict) {
    if (expected === "number") {
      if (!isValidNumberText(text)) {
        return { error: `expected number, got "${text}"` };
      }
      return { value: String(Number(text)), valueType: DataValueType.NUMBER };
    }
    if (expected === "boolean") {
      if (!isValidBooleanText(text)) {
        return { error: `expected boolean, got "${text}"` };
      }
      return {
        value: normalizeBooleanText(text),
        valueType: DataValueType.BOOLEAN,
      };
    }
    return { value: text, valueType: DataValueType.TEXT };
  }

  if (expected) {
    // Legacy soft label (unused when Phase B strict path is on)
    return { value: text, valueType: toValueType(expected) };
  }

  return { value: text, valueType: inferType(text) };
}

/** Minimal CSV parser: commas, optional quotes, first row = headers. */
export function parseCsvToRows(csv: string): {
  headers: string[];
  rows: DataRowInput[];
  error?: string;
} {
  const text = csv.replace(/^\uFEFF/, "").trim();
  if (!text) return { headers: [], rows: [], error: "CSV is empty" };

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      headers: [],
      rows: [],
      error: "CSV needs a header row and at least one data row",
    };
  }

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = splitLine(lines[0]).map((h) => h.trim()).filter(Boolean);
  if (headers.length === 0) {
    return { headers: [], rows: [], error: "CSV header row is empty" };
  }

  const rows: DataRowInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: DataRowInput = {};
    let any = false;
    headers.forEach((h, idx) => {
      const v = cells[idx] ?? "";
      if (v !== "") any = true;
      row[h] = v;
    });
    if (any) rows.push(row);
  }

  if (rows.length === 0) {
    return { headers, rows: [], error: "CSV has no data rows" };
  }

  return { headers, rows };
}

/**
 * When a director schema is set: require every schema column in headers (if provided)
 * and validate non-empty values against declared types. Extra CSV columns are ignored.
 * When no schema: accept any columns; types inferred per cell (not from first row).
 */
export function validateCsvHeadersAgainstSchema(
  headers: string[],
  schema: DataSchema | null,
): string | null {
  if (!schema) return null;
  const present = new Set(headers.map((h) => h.trim()).filter(Boolean));
  const missing = schema.columns
    .map((c) => c.name)
    .filter((name) => !present.has(name));
  if (missing.length) {
    return `CSV missing required columns: ${missing.join(", ")}`;
  }
  return null;
}

function rowFingerprint(
  row: DataRowInput,
  columns: string[],
): string {
  return columns
    .map((c) => {
      const v = row[c];
      if (v === null || v === undefined) return `${c}=`;
      return `${c}=${String(v).trim().toLowerCase()}`;
    })
    .join("|");
}

/** Exact duplicate rows within a payload (same column values). */
export function findDuplicateRowIndexes(
  rows: DataRowInput[],
  columns: string[],
): Set<number> {
  const seen = new Map<string, number>();
  const dups = new Set<number>();
  rows.forEach((row, idx) => {
    const fp = rowFingerprint(row, columns);
    if (!fp || columns.every((c) => !String(row[c] ?? "").trim())) return;
    const prev = seen.get(fp);
    if (prev !== undefined) {
      dups.add(prev);
      dups.add(idx);
    } else {
      seen.set(fp, idx);
    }
  });
  return dups;
}

export function fingerprintRowSet(
  cells: Array<{ rowIndex: number; columnName: string; value: string }>,
): string {
  const byRow = new Map<number, Array<{ columnName: string; value: string }>>();
  for (const c of cells) {
    const list = byRow.get(c.rowIndex) ?? [];
    list.push({ columnName: c.columnName, value: c.value });
    byRow.set(c.rowIndex, list);
  }
  const rowParts = Array.from(byRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([, cols]) =>
      cols
        .slice()
        .sort((a, b) => a.columnName.localeCompare(b.columnName))
        .map((c) => `${c.columnName}=${c.value.trim().toLowerCase()}`)
        .join("&"),
    )
    .sort();
  return rowParts.join("||");
}

export function mergeFlagReasons(
  ...parts: Array<string | null | undefined>
): string | null {
  const set = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    for (const bit of p.split(",")) {
      const t = bit.trim();
      if (t) set.add(t);
    }
  }
  if (set.size === 0) return null;
  return Array.from(set).sort().join(",");
}

/**
 * Flatten object rows into SubmissionDataPoint cells.
 * Director schema → strict type validation + schema columns only.
 * No schema → all keys; valueType inferred per cell.
 */
export function rowsToDataPoints(
  rows: DataRowInput[],
  schema: DataSchema | null,
  options?: { duplicateRowIndexes?: Set<number>; resubmitDuplicate?: boolean },
): { cells: ParsedDataCell[]; error?: string } {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { cells: [], error: "At least one data row is required" };
  }
  if (rows.length > 500) {
    return { cells: [], error: "Too many rows (max 500 per submission)" };
  }

  const schemaMap = new Map(
    (schema?.columns ?? []).map((c) => [c.name, c.type] as const),
  );
  const columns = schema
    ? schema.columns.map((c) => c.name)
    : Array.from(
        rows.reduce((set, row) => {
          Object.keys(row).forEach((k) => set.add(k));
          return set;
        }, new Set<string>()),
      );

  const dupRows =
    options?.duplicateRowIndexes ?? findDuplicateRowIndexes(rows, columns);
  const cells: ParsedDataCell[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const keys = schema ? schema.columns.map((c) => c.name) : Object.keys(row);

    for (const columnName of keys) {
      const expected = schemaMap.get(columnName);
      const normalized = normalizeCell(
        row[columnName],
        expected,
        Boolean(schema),
      );
      if (!normalized) continue;
      if ("error" in normalized) {
        return {
          cells: [],
          error: `Row ${rowIndex + 1}, column "${columnName}": ${normalized.error}`,
        };
      }

      let flagged = false;
      let flagReason: string | null = null;
      if (dupRows.has(rowIndex)) {
        flagged = true;
        flagReason = mergeFlagReasons(flagReason, FLAG_DUPLICATE_ROW);
      }
      if (options?.resubmitDuplicate) {
        flagged = true;
        flagReason = mergeFlagReasons(flagReason, FLAG_DUPLICATE_RESUBMIT);
      }

      cells.push({
        rowIndex,
        columnName,
        value: normalized.value,
        valueType: normalized.valueType,
        flagged,
        flagReason,
      });
    }
  }

  if (cells.length === 0) {
    return { cells: [], error: "No non-empty cells found in data rows" };
  }

  return { cells };
}

/** Tukey fences: Q1 − 1.5×IQR … Q3 + 1.5×IQR. Needs ≥4 finite values. */
export function iqrOutlierIndexes(values: number[]): Set<number> {
  const outliers = new Set<number>();
  if (values.length < 4) return outliers;

  const indexed = values
    .map((value, index) => ({ value, index }))
    .filter((x) => Number.isFinite(x.value))
    .sort((a, b) => a.value - b.value);

  if (indexed.length < 4) return outliers;

  const sorted = indexed.map((x) => x.value);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (!Number.isFinite(iqr)) return outliers;

  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;

  for (const { value, index } of indexed) {
    if (value < low || value > high) outliers.add(index);
  }
  return outliers;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function groupCellsToTable(
  cells: Array<{
    rowIndex: number;
    columnName: string;
    value: string;
    valueType: string;
    flagged?: boolean;
    flagReason?: string | null;
  }>,
) {
  const columns = Array.from(new Set(cells.map((c) => c.columnName)));
  const byRow = new Map<
    number,
    {
      values: Record<string, string>;
      flags: Record<string, { flagged: boolean; flagReason: string | null }>;
      rowFlagged: boolean;
    }
  >();

  for (const c of cells) {
    const row = byRow.get(c.rowIndex) ?? {
      values: {},
      flags: {},
      rowFlagged: false,
    };
    row.values[c.columnName] = c.value;
    const flagged = Boolean(c.flagged);
    row.flags[c.columnName] = {
      flagged,
      flagReason: c.flagReason ?? null,
    };
    if (flagged) row.rowFlagged = true;
    byRow.set(c.rowIndex, row);
  }

  const rows = Array.from(byRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowIndex, data]) => ({
      rowIndex,
      values: data.values,
      flags: data.flags,
      rowFlagged: data.rowFlagged,
    }));

  const flaggedCellCount = cells.filter((c) => c.flagged).length;

  return {
    columns,
    rows,
    cellCount: cells.length,
    flaggedCellCount,
  };
}
