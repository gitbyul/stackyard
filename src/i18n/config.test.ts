import { describe, expect, it } from "vitest";

import { localeFromPath, localePath, negotiateLocale, switchLocalePath } from "./config";

describe("negotiateLocale", () => {
  it("picks the highest-weighted supported language", () => {
    expect(negotiateLocale("ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("ko");
    expect(negotiateLocale("en-GB,en;q=0.9,ko;q=0.5")).toBe("en");
    expect(negotiateLocale("fr-FR,fr;q=0.9,ko;q=0.8,en;q=0.7")).toBe("ko");
  });

  it("falls back to English for unsupported or missing headers", () => {
    expect(negotiateLocale("fr-FR,de;q=0.8")).toBe("en");
    expect(negotiateLocale("")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });

  it("ignores languages refused with q=0", () => {
    expect(negotiateLocale("ko;q=0,en;q=0.5")).toBe("en");
  });
});

describe("locale paths", () => {
  it("prefixes and swaps the locale segment", () => {
    expect(localePath("ko", "/dashboard")).toBe("/ko/dashboard");
    expect(localePath("en", "/")).toBe("/en");
    expect(switchLocalePath("/en/studio/abc", "ko")).toBe("/ko/studio/abc");
    expect(switchLocalePath("/ko", "en")).toBe("/en");
    expect(switchLocalePath("/projects", "ko")).toBe("/ko/projects");
  });

  it("reads the locale from a pathname", () => {
    expect(localeFromPath("/ko/analysis")).toBe("ko");
    expect(localeFromPath("/fr/analysis")).toBeNull();
    expect(localeFromPath("/")).toBeNull();
  });
});
