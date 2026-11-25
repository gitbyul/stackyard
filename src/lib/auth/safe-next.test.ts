import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths on this site and adds the locale when missing", () => {
    expect(safeNext("ko", "/ko/projects/prj_1")).toBe("/ko/projects/prj_1");
    expect(safeNext("ko", "/analysis?site=s1&period=30")).toBe("/ko/analysis?site=s1&period=30");
    expect(safeNext("en", "/en/data#top")).toBe("/en/data#top");
  });

  it("falls back to the dashboard when there is nothing to follow", () => {
    expect(safeNext("en", undefined)).toBe("/en/dashboard");
    expect(safeNext("en", "")).toBe("/en/dashboard");
    expect(safeNext("ko", "dashboard")).toBe("/ko/dashboard");
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "https://evil.example/ko/dashboard",
    "javascript:alert(1)",
    "/%5Cevil.example",
  ])("never leaves the site: %j", (next) => {
    const out = safeNext("en", next);
    expect(out.startsWith("/")).toBe(true);
    expect(out.startsWith("//")).toBe(false);
    expect(new URL(out, "https://stackyard.invalid").origin).toBe("https://stackyard.invalid");
  });
});
