/**
 * Minimal RFC 4180 CSV reader/writer: quoted fields, escaped quotes ("")
 * and line breaks inside quotes, CRLF or LF, and a leading UTF-8 BOM
 * (Excel adds one). Blank lines are skipped. No dependency, so the same
 * code parses a file in the browser for the preview and again on the server.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
    row = [];
    field = "";
  };

  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") endRow();
    else if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

function escapeField(v: string | number) {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Rows to CSV text with CRLF line ends, as spreadsheet apps expect. */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(escapeField).join(",")).join("\r\n") + "\r\n";
}
