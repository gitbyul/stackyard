/**
 * Replace {name} placeholders in a dictionary string:
 * fill("{n} of {total} SKUs", { n: 20, total: 140 }) -> "20 of 140 SKUs".
 * Unknown placeholders are left as they are so a missing value is visible.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
