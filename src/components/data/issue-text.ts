import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/fill";
import { COLUMNS, MAX_IMPORT_ROWS, type DatasetKind, type Issue } from "@/lib/import/datasets";

type IssueDict = Dictionary["data"]["issue"];

/** Where an issue is: "Row 12", or "File" for whole-file problems. */
export function issueWhere(t: IssueDict, issue: Issue) {
  return issue.row === 0 ? t.file : fill(t.row, { row: issue.row });
}

/** One issue in the reader's language, with the column's own limits filled in. */
export function issueText(t: IssueDict, kind: DatasetKind, issue: Issue) {
  const col = COLUMNS[kind].find((c) => c.name === issue.column);
  const values: Record<string, string | number> = {
    column: issue.column ?? "",
    value: issue.value ?? "",
    max: issue.code === "tooManyRows" ? MAX_IMPORT_ROWS : "",
  };
  if (col && "max" in col) values.max = col.max;
  if (col && "min" in col) {
    values.min = col.min;
    values.op = "exclusiveMin" in col && col.exclusiveMin ? t.above : t.atLeast;
  }
  if (col && "values" in col) values.values = col.values.join(", ");
  return fill(t.codes[issue.code], values);
}
