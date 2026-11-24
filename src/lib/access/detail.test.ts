import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Db } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { buildSampleData } from "@/lib/demo/sample-data";
import { canOpenDetail, isDetailSection, sessionTokenFromCookie } from "./detail";

/* Real migrations on a throwaway in-memory Postgres, like the deletion tests. */

const OWNER = "user_owner";
const OTHER = "user_other";
const HOUR = 60 * 60 * 1000;

let pg: PGlite;
let db: Db;
const ids = { project: "", layout: "", map: "" };

beforeAll(async () => {
  delete process.env.DATABASE_URL;
  pg = new PGlite();
  const local = drizzle(pg, { schema: s });
  await migrate(local, { migrationsFolder: "drizzle" });
  db = local as unknown as Db;

  await db.insert(s.user).values([
    { id: OWNER, name: "Owner", email: "owner@example.test" },
    { id: OTHER, name: "Other", email: "other@example.test" },
  ]);
  const now = Date.now();
  await db.insert(s.session).values([
    { id: "ses_owner", userId: OWNER, token: "tok_owner", expiresAt: new Date(now + HOUR), createdAt: new Date(now), updatedAt: new Date(now) },
    { id: "ses_other", userId: OTHER, token: "tok_other", expiresAt: new Date(now + HOUR), createdAt: new Date(now), updatedAt: new Date(now) },
    { id: "ses_old", userId: OWNER, token: "tok_expired", expiresAt: new Date(now - HOUR), createdAt: new Date(now - 2 * HOUR), updatedAt: new Date(now - 2 * HOUR) },
  ]);

  // Only the rows the lookups join through; order lines aren't needed here.
  const data = buildSampleData(OWNER);
  await db.insert(s.project).values(data.projects);
  await db.insert(s.site).values(data.sites);
  await db.insert(s.layout).values(data.layouts);
  await db.insert(s.processMap).values(data.processMaps);
  ids.project = data.projects[0].id!;
  ids.layout = data.layouts[0].id!;
  ids.map = data.processMaps[0].id!;
}, 60_000);

afterAll(async () => {
  await pg?.close();
});

describe("canOpenDetail", () => {
  const sections = [
    ["projects", () => ids.project],
    ["studio", () => ids.layout],
    ["process", () => ids.map],
  ] as const;

  it.each(sections)("lets the owner open a %s page", async (section, id) => {
    expect(await canOpenDetail(db, section, id(), "tok_owner")).toBe(true);
  });

  it.each(sections)("hides a %s page from another user", async (section, id) => {
    expect(await canOpenDetail(db, section, id(), "tok_other")).toBe(false);
  });

  it.each(sections)("rejects an expired session on a %s page", async (section, id) => {
    expect(await canOpenDetail(db, section, id(), "tok_expired")).toBe(false);
  });

  it.each(sections)("rejects a missing id or unknown token on a %s page", async (section, id) => {
    expect(await canOpenDetail(db, section, "missing_id", "tok_owner")).toBe(false);
    expect(await canOpenDetail(db, section, id(), "tok_unknown")).toBe(false);
  });
});

describe("helpers", () => {
  it("reads the token from a signed, URL-encoded session cookie", () => {
    expect(sessionTokenFromCookie("abc123.c2lnbmF0dXJl%3D")).toBe("abc123");
    expect(sessionTokenFromCookie("abc123")).toBe("abc123");
    expect(sessionTokenFromCookie("")).toBeNull();
    expect(sessionTokenFromCookie(null)).toBeNull();
  });

  it("knows which sections are detail pages", () => {
    expect(isDetailSection("projects")).toBe(true);
    expect(isDetailSection("data")).toBe(false);
    expect(isDetailSection(undefined)).toBe(false);
  });
});
