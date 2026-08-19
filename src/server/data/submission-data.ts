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
};

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

function normalizeCell(
  raw: string | number | boolean | null | undefined,
  expected?: DataColumnType,
): { value: string; valueType: DataValueType } | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") {
    return { value: raw ? "true" : "false", valueType: DataValueType.BOOLEAN };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return { value: String(raw), valueType: DataValueType.NUMBER };
  }
  const text = String(raw).trim();
  if (!text) return null;
  const valueType = expected ? toValueType(expected) : inferType(text);
  return { value: text, valueType };
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
 * Flatten object rows into SubmissionDataPoint cells.
 * Phase A: if schema is set, only schema columns are stored; extras ignored.
 * If no schema, store all keys present on each row.
 */
export function rowsToDataPoints(
  rows: DataRowInput[],
  schema: DataSchema | null,
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
  const cells: ParsedDataCell[] = [];

  rows.forEach((row, rowIndex) => {
    const keys = schema
      ? schema.columns.map((c) => c.name)
      : Object.keys(row);

    for (const columnName of keys) {
      const expected = schemaMap.get(columnName);
      const normalized = normalizeCell(row[columnName], expected);
      if (!normalized) continue;
      cells.push({
        rowIndex,
        columnName,
        value: normalized.value,
        valueType: normalized.valueType,
      });
    }
  });

  if (cells.length === 0) {
    return { cells: [], error: "No non-empty cells found in data rows" };
  }

  return { cells };
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
  const byRow = new Map<number, Record<string, string>>();
  for (const c of cells) {
    const row = byRow.get(c.rowIndex) ?? {};
    row[c.columnName] = c.value;
    byRow.set(c.rowIndex, row);
  }
  const rows = Array.from(byRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowIndex, values]) => ({ rowIndex, values }));
  return { columns, rows, cellCount: cells.length };
}
