import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "./csv";
import { parseDataset, templateTable } from "./datasets";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded line breaks, CRLF and a BOM", () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""","line\nbreak"\r\n\r\n1,,3';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "line\nbreak"],
      ["1", "", "3"],
    ]);
  });

  it("round-trips through toCsv", () => {
    const rows = [["code", "name"], ["A-1", 'Mug, "large"'], ["A-2", "two\nlines"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe("parseDataset", () => {
  it("accepts the template for every dataset", () => {
    for (const kind of ["skus", "orderLines", "laborLogs"] as const) {
      const res = parseDataset(kind, toCsv(templateTable(kind)));
      expect(res.issueCount, kind).toBe(0);
      expect(res.rows).toHaveLength(2);
      expect(res.rowNumbers).toEqual([2, 3]);
    }
  });

  it("matches headers case-insensitively in any order and reports extras", () => {
    const res = parseDataset("orderLines", "Quantity,SKU_CODE,shipped_on,order_no,note\n3,A,2026-01-05,SO-1,hello\n");
    expect(res.issueCount).toBe(0);
    expect(res.rows[0]).toEqual({ orderNo: "SO-1", shippedOn: "2026-01-05", skuCode: "A", quantity: 3 });
    expect(res.extraColumns).toEqual(["note"]);
  });

  it("reports missing columns before reading rows", () => {
    const res = parseDataset("laborLogs", "work_date,shift,process,hours\n2026-01-01,day,picking,8\n");
    expect(res.issues).toEqual([{ row: 1, column: "volume", code: "missingColumn" }]);
    expect(res.rows).toHaveLength(0);
  });

  it("flags bad cells with their row and column", () => {
    const csv = [
      "work_date,shift,process,hours,volume",
      "2026-02-30,day,picking,8,100",
      "2026-03-01,evening,picking,8,100",
      "2026-03-01,day,picking,0,100",
      "2026-03-01,DAY,Packing,7.5,1.5",
      "2026-03-01,night,shipping,6,",
      "2026-03-02,night,shipping,6,40",
    ].join("\n");
    const res = parseDataset("laborLogs", csv);
    expect(res.issues.map((i) => [i.row, i.column, i.code])).toEqual([
      [2, "work_date", "date"],
      [3, "shift", "enum"],
      [4, "hours", "min"],
      [5, "volume", "integer"],
      [6, "volume", "required"],
    ]);
    expect(res.rows).toEqual([{ workDate: "2026-03-02", shift: "night", process: "shipping", hours: 6, volume: 40 }]);
    expect(res.rowNumbers).toEqual([7]);
  });

  it("rejects duplicate SKU codes and over-long text", () => {
    const head = "code,name,category,length_mm,width_mm,height_mm,weight_kg,units_per_case";
    const res = parseDataset("skus", `${head}\nA,Mug,K,1,1,1,0.1,1\nA,Mug 2,K,1,1,1,0.1,1\nB,${"x".repeat(121)},K,1,1,1,0.1,1\n`);
    expect(res.issues.map((i) => [i.row, i.code])).toEqual([
      [3, "duplicate"],
      [4, "tooLong"],
    ]);
  });

  it("reports an empty file and a header-only file", () => {
    expect(parseDataset("skus", "").issues[0].code).toBe("empty");
    expect(parseDataset("orderLines", "order_no,shipped_on,sku_code,quantity\n").issues[0].code).toBe("empty");
  });
});
