import { PGlite } from "@electric-sql/pglite";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Db } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { buildSampleData } from "@/lib/demo/sample-data";
import { replaceDemoData } from "@/lib/demo/reset";
import { countUsage } from "@/lib/usage/count";
import { LIMITS } from "@/lib/usage/limits";
import { deleteOwnedProject } from "./delete";

/*
 * Runs against a throwaway in-memory Postgres (PGlite) with the real
 * migrations, so the FK cascades and the demo reset are checked end to end.
 */

const OWNER = "user_owner";
const OTHER = "user_other";

let pg: PGlite;
let db: Db;

async function countFor(siteIds: string[]) {
  if (siteIds.length === 0) return { sites: 0, skus: 0, orderLines: 0, laborLogs: 0, layouts: 0, maps: 0 };
  const n = (table: typeof s.sku | typeof s.orderLine | typeof s.laborLog | typeof s.layout | typeof s.processMap) =>
    db.$count(table, inArray(table.siteId, siteIds));
  return {
    sites: await db.$count(s.site, inArray(s.site.id, siteIds)),
    skus: await n(s.sku),
    orderLines: await n(s.orderLine),
    laborLogs: await n(s.laborLog),
    layouts: await n(s.layout),
    maps: await n(s.processMap),
  };
}

async function sitesOf(projectId: string) {
  return (await db.select({ id: s.site.id }).from(s.site).where(eq(s.site.projectId, projectId))).map((r) => r.id);
}

beforeAll(async () => {
  // Never let this test reach a real database: runAtomic picks its driver from DATABASE_URL.
  delete process.env.DATABASE_URL;
  pg = new PGlite();
  const local = drizzle(pg, { schema: s });
  await migrate(local, { migrationsFolder: "drizzle" });
  db = local as unknown as Db;
  await db.insert(s.user).values([
    { id: OWNER, name: "Owner", email: "owner@example.test" },
    { id: OTHER, name: "Other", email: "other@example.test" },
  ]);
}, 60_000);

afterAll(async () => {
  await pg?.close();
});

describe("demo reset on a real schema", () => {
  it("fills an empty workspace and leaves no staging rows", async () => {
    const summary = await replaceDemoData(db, OWNER);
    const expected = buildSampleData(OWNER);
    expect(summary).toMatchObject({
      projects: expected.projects.length,
      skus: expected.skus.length,
      orderLines: expected.orderLines.length,
      laborLogs: expected.laborLogs.length,
      removedProjects: 0,
    });
    expect(await db.$count(s.project, eq(s.project.ownerId, OWNER))).toBe(expected.projects.length);
    expect(await db.$count(s.project, like(s.project.code, "%~staging"))).toBe(0);
  }, 60_000);

  it("counts the account's usage, and the demo sample fits the limits", async () => {
    const expected = buildSampleData(OWNER);
    const usage = await countUsage(db, OWNER);
    expect(usage).toEqual({
      projects: expected.projects.length,
      sites: expected.sites.length,
      rows: expected.skus.length + expected.orderLines.length + expected.laborLogs.length,
    });
    expect(usage.projects).toBeLessThan(LIMITS.projects);
    expect(usage.sites).toBeLessThan(LIMITS.sites);
    expect(usage.rows).toBeLessThan(LIMITS.rows);
    expect(await countUsage(db, OTHER)).toEqual({ projects: 0, sites: 0, rows: 0 });
  });

  it("replaces the owner's projects on a second run and keeps other users' data", async () => {
    await db.insert(s.project).values({
      id: "prj_other",
      code: "PRJ-OTHER",
      name: "Someone else's",
      client: "Other client",
      industry: "General",
      startedOn: "2026-01-01",
      ownerId: OTHER,
    });
    const before = await db.select({ id: s.project.id }).from(s.project).where(eq(s.project.ownerId, OWNER));

    const summary = await replaceDemoData(db, OWNER);

    expect(summary.removedProjects).toBe(before.length);
    const after = await db.select({ id: s.project.id }).from(s.project).where(eq(s.project.ownerId, OWNER));
    expect(after).toHaveLength(before.length);
    expect(after.map((r) => r.id)).not.toEqual(before.map((r) => r.id));
    expect(await db.$count(s.project, eq(s.project.id, "prj_other"))).toBe(1);
    expect(await db.$count(s.project, like(s.project.code, "%~staging"))).toBe(0);
  }, 60_000);
});

describe("deleteOwnedProject", () => {
  it("refuses a project the user doesn't own", async () => {
    const [mine] = await db.select({ id: s.project.id }).from(s.project).where(eq(s.project.ownerId, OWNER)).limit(1);
    expect(await deleteOwnedProject(db, mine.id, OTHER)).toBe(false);
    expect(await deleteOwnedProject(db, "prj_missing", OWNER)).toBe(false);
    expect(await db.$count(s.project, eq(s.project.id, mine.id))).toBe(1);
  });

  it("removes the project with every site and dataset under it, and nothing else", async () => {
    const projects = await db
      .select({ id: s.project.id })
      .from(s.project)
      .where(eq(s.project.ownerId, OWNER))
      .orderBy(s.project.code);
    const [target, ...rest] = projects;
    const targetSites = await sitesOf(target.id);
    const restSites = (await Promise.all(rest.map((p) => sitesOf(p.id)))).flat();

    const targetBefore = await countFor(targetSites);
    const restBefore = await countFor(restSites);
    expect(targetBefore.sites).toBeGreaterThan(0);
    expect(targetBefore.orderLines).toBeGreaterThan(0);
    const versionsBefore = await db.$count(s.processMapVersion);

    expect(await deleteOwnedProject(db, target.id, OWNER)).toBe(true);

    expect(await db.$count(s.project, eq(s.project.id, target.id))).toBe(0);
    expect(await countFor(targetSites)).toEqual({ sites: 0, skus: 0, orderLines: 0, laborLogs: 0, layouts: 0, maps: 0 });
    expect(await countFor(restSites)).toEqual(restBefore);
    expect(await db.$count(s.processMapVersion)).toBe(versionsBefore - targetBefore.maps);
    expect(await db.$count(s.project, eq(s.project.id, "prj_other"))).toBe(1);
  });
});

describe("deleting an account", () => {
  it("removes its projects and everything under them, its sessions, and nothing of other users", async () => {
    const now = new Date();
    await db.insert(s.session).values({
      id: "ses_owner",
      userId: OWNER,
      token: "tok_owner",
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    });
    const owned = await db.select({ id: s.project.id }).from(s.project).where(eq(s.project.ownerId, OWNER));
    const ownedSites = (await Promise.all(owned.map((p) => sitesOf(p.id)))).flat();
    expect(owned.length).toBeGreaterThan(0);
    expect((await countFor(ownedSites)).orderLines).toBeGreaterThan(0);
    const othersBefore = await db.$count(s.project, eq(s.project.ownerId, OTHER));

    await db.delete(s.user).where(eq(s.user.id, OWNER));

    expect(await db.$count(s.project, eq(s.project.ownerId, OWNER))).toBe(0);
    expect(await db.$count(s.project, inArray(s.project.id, owned.map((p) => p.id)))).toBe(0);
    expect(await countFor(ownedSites)).toEqual({ sites: 0, skus: 0, orderLines: 0, laborLogs: 0, layouts: 0, maps: 0 });
    expect(await db.$count(s.session, eq(s.session.userId, OWNER))).toBe(0);
    expect(await db.$count(s.project, eq(s.project.ownerId, OTHER))).toBe(othersBefore);
    expect(await db.$count(s.user, eq(s.user.id, OTHER))).toBe(1);
  });
});
