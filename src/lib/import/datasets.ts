/**
 * CSV import definitions for the three site datasets. Each dataset lists its
 * columns once; that list drives the header check, per-cell validation, the
 * downloadable template and the export. Problems come back as codes plus a
 * row and column so the UI can word them in the reader's language.
 */
import { PROCESSES } from "@/lib/productivity/benchmarks";
import { parseCsv } from "./csv";

export const DATASETS = ["skus", "orderLines", "laborLogs"] as const;
export type DatasetKind = (typeof DATASETS)[number];

/** How an import combines with the rows already stored for the site. */
export const IMPORT_MODES: Record<DatasetKind, readonly ["upsert" | "append", "replace"]> = {
  skus: ["upsert", "replace"],
  orderLines: ["append", "replace"],
  laborLogs: ["append", "replace"],
};
export type ImportMode = "upsert" | "append" | "replace";

export const MAX_IMPORT_ROWS = 50_000;
/** Keep the request under the Server Action body limit (4 MB) with room for overhead. */
export const MAX_IMPORT_BYTES = 3.5 * 1024 * 1024;
const MAX_ISSUES = 100;

type Column =
  | { name: string; kind: "text"; max: number }
  | { name: string; kind: "int" | "number"; min: number; max: number; exclusiveMin?: boolean }
  | { name: string; kind: "date" }
  | { name: string; kind: "enum"; values: readonly string[] };

export const COLUMNS = {
  skus: [
    { name: "code", kind: "text", max: 40 },
    { name: "name", kind: "text", max: 120 },
    { name: "category", kind: "text", max: 60 },
    { name: "length_mm", kind: "int", min: 1, max: 100_000 },
    { name: "width_mm", kind: "int", min: 1, max: 100_000 },
    { name: "height_mm", kind: "int", min: 1, max: 100_000 },
    { name: "weight_kg", kind: "number", min: 0, max: 100_000, exclusiveMin: true },
    { name: "units_per_case", kind: "int", min: 1, max: 100_000 },
  ],
  orderLines: [
    { name: "order_no", kind: "text", max: 40 },
    { name: "shipped_on", kind: "date" },
    { name: "sku_code", kind: "text", max: 40 },
    { name: "quantity", kind: "int", min: 1, max: 1_000_000 },
  ],
  laborLogs: [
    { name: "work_date", kind: "date" },
    { name: "shift", kind: "enum", values: ["day", "night"] },
    { name: "process", kind: "enum", values: PROCESSES },
    { name: "hours", kind: "number", min: 0, max: 10_000, exclusiveMin: true },
    { name: "volume", kind: "int", min: 0, max: 100_000_000 },
  ],
} as const satisfies Record<DatasetKind, readonly Column[]>;

/** Two example rows per dataset for the downloadable template. */
export const TEMPLATE_ROWS: Record<DatasetKind, (string | number)[][]> = {
  skus: [
    ["SKU-0001", "Ceramic mug 350 ml", "Kitchen", 120, 90, 100, 0.35, 24],
    ["SKU-0002", "Steel water bottle", "Outdoor", 75, 75, 260, 0.42, 12],
  ],
  orderLines: [
    ["SO-100231", "2026-03-02", "SKU-0001", 6],
    ["SO-100231", "2026-03-02", "SKU-0002", 2],
  ],
  laborLogs: [
    ["2026-03-02", "day", "picking", 64, 5120],
    ["2026-03-02", "night", "packing", 32, 1480],
  ],
};

export type SkuRow = {
  code: string;
  name: string;
  category: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightKg: number;
  unitsPerCase: number;
};
export type OrderLineRow = { orderNo: string; shippedOn: string; skuCode: string; quantity: number };
export type LaborRow = {
  workDate: string;
  shift: "day" | "night";
  process: (typeof PROCESSES)[number];
  hours: number;
  volume: number;
};
export type RowOf<K extends DatasetKind> = K extends "skus" ? SkuRow : K extends "orderLines" ? OrderLineRow : LaborRow;

export type IssueCode =
  | "empty"
  | "tooManyRows"
  | "missingColumn"
  | "duplicateColumn"
  | "required"
  | "integer"
  | "number"
  | "min"
  | "max"
  | "date"
  | "enum"
  | "tooLong"
  | "duplicate"
  | "unknownSku";

export type Issue = {
  /** Spreadsheet row: the header is row 1, the first data row is row 2. 0 = whole file. */
  row: number;
  column?: string;
  code: IssueCode;
  value?: string;
};

export type ParseResult<K extends DatasetKind> = {
  rows: RowOf<K>[];
  /** Spreadsheet row number of each entry in `rows`. */
  rowNumbers: number[];
  /** First issues found (capped); `issueCount` has the full count. */
  issues: Issue[];
  issueCount: number;
  /** Data rows in the file. */
  total: number;
  /** Header cells that are not part of the dataset; ignored. */
  extraColumns: string[];
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isIsoDate(v: string) {
  const m = ISO_DATE.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Validates one cell; returns the typed value or an issue code. */
function readCell(col: Column, raw: string): { value: string | number } | { code: IssueCode } {
  const v = raw.trim();
  if (v === "") return { code: "required" };
  switch (col.kind) {
    case "text":
      return v.length > col.max ? { code: "tooLong" } : { value: v };
    case "date":
      return isIsoDate(v) ? { value: v } : { code: "date" };
    case "enum": {
      const lower = v.toLowerCase();
      return col.values.includes(lower) ? { value: lower } : { code: "enum" };
    }
    case "int":
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n)) return { code: col.kind === "int" ? "integer" : "number" };
      if (col.kind === "int" && !Number.isInteger(n)) return { code: "integer" };
      if (col.exclusiveMin ? n <= col.min : n < col.min) return { code: "min" };
      if (n > col.max) return { code: "max" };
      return { value: n };
    }
  }
}

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
/** CSV column name → row field name (sku_code → skuCode). */
export const fieldOf = camel;

/**
 * Parses and validates a whole file. Rows with any problem are left out of
 * `rows`; callers should only write when `issueCount` is 0.
 */
export function parseDataset<K extends DatasetKind>(kind: K, text: string): ParseResult<K> {
  const columns: readonly Column[] = COLUMNS[kind];
  const result: ParseResult<K> = { rows: [], rowNumbers: [], issues: [], issueCount: 0, total: 0, extraColumns: [] };
  const report = (issue: Issue) => {
    result.issueCount++;
    if (result.issues.length < MAX_ISSUES) result.issues.push(issue);
  };

  const table = parseCsv(text);
  if (table.length === 0) {
    report({ row: 0, code: "empty" });
    return result;
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const index = new Map<string, number>();
  header.forEach((h, i) => {
    if (h === "") return;
    if (index.has(h)) report({ row: 1, column: h, code: "duplicateColumn" });
    else index.set(h, i);
  });
  for (const col of columns) {
    if (!index.has(col.name)) report({ row: 1, column: col.name, code: "missingColumn" });
  }
  const known = new Set(columns.map((c) => c.name));
  result.extraColumns = [...index.keys()].filter((h) => !known.has(h));

  const body = table.slice(1);
  result.total = body.length;
  if (result.issueCount > 0) return result;
  if (body.length === 0) {
    report({ row: 0, code: "empty" });
    return result;
  }
  if (body.length > MAX_IMPORT_ROWS) {
    report({ row: 0, code: "tooManyRows", value: String(body.length) });
    return result;
  }

  const seenCodes = new Map<string, number>();
  body.forEach((cells, i) => {
    const rowNo = i + 2;
    const out: Record<string, string | number> = {};
    let ok = true;
    for (const col of columns) {
      const raw = cells[index.get(col.name)!] ?? "";
      const cell = readCell(col, raw);
      if ("code" in cell) {
        ok = false;
        report({ row: rowNo, column: col.name, code: cell.code, value: raw.trim().slice(0, 60) });
      } else out[camel(col.name)] = cell.value;
    }
    if (ok && kind === "skus") {
      const code = String(out.code);
      const first = seenCodes.get(code);
      if (first !== undefined) {
        ok = false;
        report({ row: rowNo, column: "code", code: "duplicate", value: code });
      } else seenCodes.set(code, rowNo);
    }
    if (ok) {
      result.rows.push(out as RowOf<K>);
      result.rowNumbers.push(rowNo);
    }
  });
  return result;
}

/** Header plus example rows, ready for toCsv(). */
export function templateTable(kind: DatasetKind): (string | number)[][] {
  return [COLUMNS[kind].map((c) => c.name), ...TEMPLATE_ROWS[kind]];
}
