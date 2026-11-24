import { describe, expect, it } from "vitest";

import { buildSampleData, SAMPLE_PROJECT_CODES } from "./sample-data";

describe("buildSampleData", () => {
  it("is deterministic; idTag only changes the ids", () => {
    const a = buildSampleData("owner");
    const b = buildSampleData("owner", { idTag: "x_" });
    expect(b.orderLines.length).toBe(a.orderLines.length);
    expect(b.skus.map((s) => s.code)).toEqual(a.skus.map((s) => s.code));
    expect(b.laborLogs.map((l) => l.hours)).toEqual(a.laborLogs.map((l) => l.hours));
    expect(b.projects[0].id).toBe(`prj_x_${a.projects[0].id!.slice(4)}`);
  });

  it("keeps every reference inside the generated set", () => {
    const d = buildSampleData("owner", { idTag: "t_" });
    const projects = new Set(d.projects.map((p) => p.id));
    const sites = new Set(d.sites.map((s) => s.id));
    const skus = new Set(d.skus.map((s) => s.id));
    const maps = new Set(d.processMaps.map((m) => m.id));
    expect(d.sites.every((s) => projects.has(s.projectId))).toBe(true);
    expect([...d.skus, ...d.orderLines, ...d.laborLogs, ...d.layouts, ...d.processMaps].every((r) => sites.has(r.siteId))).toBe(true);
    expect(d.orderLines.every((l) => skus.has(l.skuId))).toBe(true);
    expect(d.processMapVersions.every((v) => maps.has(v.mapId))).toBe(true);
    expect(d.projects.every((p) => p.ownerId === "owner")).toBe(true);
    expect(d.projects.map((p) => p.code)).toEqual(SAMPLE_PROJECT_CODES);
  });
});
