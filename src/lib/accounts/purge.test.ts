import { PGlite } from "@electric-sql/pglite";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { cronGuard } from "@/lib/cron/guard";
import type { Db } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { buildSampleData } from "@/lib/demo/sample-data";
import { purgeAccounts } from "./purge";

/* Real migrations on a throwaway in-memory Postgres (PGlite). */

const DEMO = { id: "user_demo", name: "Demo", email: "demo@example.test" };
const ALICE = { id: "user_alice", name: "Alice", email: "alice@example.test" };
const BOB = { id: "user_bob", name: "Bob", email: "bob@example.test" };

let pg: PGlite;
let db: Db;

async function seedAccount(owner: { id: string }, tag: string) {
  const data = buildSampleData(owner.id, { idTag: tag });
  // One project is enough to reach every table under it.
  const projectId = data.projects[0].id!;
  const sites = data.sites.filter((x) => x.projectId === projectId);
  const siteIds = new Set(sites.map((x) => x.id));
  const maps = data.processMaps.filter((m) => siteIds.has(m.siteId));
  const mapIds = new Set(maps.map((m) => m.id));
  await db.insert(s.project).values({ ...data.projects[0], code: `${data.projects[0].code}-${tag}` });
  await db.insert(s.site).values(sites);
  await db.insert(s.sku).values(data.skus.filter((x) => siteIds.has(x.siteId)));
  await db.insert(s.orderLine).values(data.orderLines.filter((x) => siteIds.has(x.siteId)).slice(0, 500));
  await db.insert(s.laborLog).values(data.laborLogs.filter((x) => siteIds.has(x.siteId)).slice(0, 200));
  await db.insert(s.layout).values(data.layouts.filter((x) => siteIds.has(x.siteId)));
  await db.insert(s.processMap).values(maps);
  await db.insert(s.processMapVersion).values(data.processMapVersions.filter((v) => mapIds.has(v.mapId)));
  return { projectId, siteIds: [...siteIds] };
}

async function rowsUnder(siteIds: string[]) {
  return {
    skus: await db.$count(s.sku, inArray(s.sku.siteId, siteIds)),
    orderLines: await db.$count(s.orderLine, inArray(s.orderLine.siteId, siteIds)),
    laborLogs: await db.$count(s.laborLog, inArray(s.laborLog.siteId, siteIds)),
    layouts: await db.$count(s.layout, inArray(s.layout.siteId, siteIds)),
    maps: await db.$count(s.processMap, inArray(s.processMap.siteId, siteIds)),
  };
}

let demoSites: string[] = [];
let aliceSites: string[] = [];

beforeAll(async () => {
  delete process.env.DATABASE_URL;
  pg = new PGlite();
  const local = drizzle(pg, { schema: s });
  await migrate(local, { migrationsFolder: "drizzle" });
  db = local as unknown as Db;

  await db.insert(s.user).values([DEMO, ALICE, BOB]);
  const now = new Date();
  const later = new Date(now.getTime() + 3600_000);
  await db.insert(s.session).values([
    { id: "ses_demo", userId: DEMO.id, token: "tok_demo", expiresAt: later, createdAt: now, updatedAt: now },
    { id: "ses_alice", userId: ALICE.id, token: "tok_alice", expiresAt: later, createdAt: now, updatedAt: now },
  ]);
  await db.insert(s.account).values({
    id: "acc_alice",
    accountId: ALICE.id,
    providerId: "credential",
    userId: ALICE.id,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(s.verification).values({
    id: "ver_alice",
    identifier: ALICE.email,
    value: "token",
    expiresAt: later,
    createdAt: now,
    updatedAt: now,
  });
  demoSites = (await seedAccount(DEMO, "d")).siteIds;
  aliceSites = (await seedAccount(ALICE, "a")).siteIds;
}, 60_000);

afterAll(async () => {
  await pg?.close();
});

describe("purgeAccounts", () => {
  it("refuses to run, and deletes nothing, when the account to keep is missing", async () => {
    await expect(purgeAccounts(db, "nobody@example.test")).rejects.toThrow();
    expect(await db.$count(s.user)).toBe(3);
  });

  it("deletes every other account with all of its data and keeps the demo account whole", async () => {
    const demoBefore = await rowsUnder(demoSites);
    expect((await rowsUnder(aliceSites)).orderLines).toBeGreaterThan(0);

    expect(await purgeAccounts(db, DEMO.email)).toEqual({ accounts: 2, projects: 1 });

    const users = await db.select({ id: s.user.id }).from(s.user);
    expect(users.map((u) => u.id)).toEqual([DEMO.id]);
    expect(await db.$count(s.project, eq(s.project.ownerId, ALICE.id))).toBe(0);
    expect(await db.$count(s.site, inArray(s.site.id, aliceSites))).toBe(0);
    expect(await rowsUnder(aliceSites)).toEqual({ skus: 0, orderLines: 0, laborLogs: 0, layouts: 0, maps: 0 });
    expect(await db.$count(s.session, eq(s.session.userId, ALICE.id))).toBe(0);
    expect(await db.$count(s.account, eq(s.account.userId, ALICE.id))).toBe(0);
    expect(await db.$count(s.verification, eq(s.verification.identifier, ALICE.email))).toBe(0);

    expect(await db.$count(s.project, eq(s.project.ownerId, DEMO.id))).toBe(1);
    expect(await rowsUnder(demoSites)).toEqual(demoBefore);
    expect(await db.$count(s.session, eq(s.session.userId, DEMO.id))).toBe(1);
  });

  it("is a no-op when only the demo account is left", async () => {
    expect(await purgeAccounts(db, DEMO.email)).toEqual({ accounts: 0, projects: 0 });
  });
});

describe("cronGuard", () => {
  const request = (auth?: string) => new Request("https://x.test/api/cron/purge-accounts", { headers: auth ? { authorization: auth } : {} });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("keeps the endpoint off without CRON_SECRET", () => {
    expect(cronGuard(request("Bearer anything"))?.status).toBe(503);
  });

  it("refuses a missing or wrong bearer token", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(cronGuard(request())?.status).toBe(401);
    expect(cronGuard(request("Bearer wrong"))?.status).toBe(401);
  });

  it("lets the right bearer token through", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(cronGuard(request("Bearer test-secret"))).toBeNull();
  });
});
