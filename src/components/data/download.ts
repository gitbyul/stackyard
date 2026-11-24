/** Saves CSV text as a file. The BOM makes Excel read it as UTF-8 (Hangul etc.). */
export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}

/** A filename-safe slug: "North Hub (Busan)" → "north-hub-busan". */
export function slug(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "site"
  );
}
