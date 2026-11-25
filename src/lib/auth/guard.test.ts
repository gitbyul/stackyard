import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Db } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { createAuth, isDemoBlocked } from "./config";
import { DEMO_USER } from "./demo";

/*
 * Real Better Auth on a throwaway in-memory Postgres with the real
 * migrations: public sign-up is off, and a demo session can't change the
 * shared account or see other visitors' sessions.
 */

const OTHER = { name: "Planner", email: "planner@example.test", password: "planner-password-1" };

let pg: PGlite;
let auth: ReturnType<typeof createAuth>;

/** Signs in and returns request headers carrying the session cookie. */
async function signedIn(email: string, password: string) {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

async function status(call: Promise<unknown>) {
  try {
    await call;
    return "ok";
  } catch (err) {
    return (err as { status?: string }).status ?? "error";
  }
}

beforeAll(async () => {
  delete process.env.DATABASE_URL;
  pg = new PGlite();
  const local = drizzle(pg, { schema: s });
  await migrate(local, { migrationsFolder: "drizzle" });
  const db = local as unknown as Db;

  // Accounts can only be made the way the seed makes them.
  const seeding = createAuth(db, { allowSignUp: true });
  await seeding.api.signUpEmail({ body: { ...DEMO_USER } });
  await seeding.api.signUpEmail({ body: OTHER });

  auth = createAuth(db);
}, 60_000);

afterAll(async () => {
  await pg?.close();
});

describe("sign-up", () => {
  it("is refused by the app's auth instance", async () => {
    const res = await status(
      auth.api.signUpEmail({ body: { name: "Visitor", email: "visitor@example.test", password: "visitor-password-1" } }),
    );
    expect(res).toBe("BAD_REQUEST");
  });
});

describe("demo session", () => {
  it("can read its session and sign out", async () => {
    const headers = await signedIn(DEMO_USER.email, DEMO_USER.password);
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe(DEMO_USER.email);
    expect(await status(auth.api.signOut({ headers }))).toBe("ok");
  });

  it("can't change the password, profile or sessions, or list other visitors' sessions", async () => {
    const headers = await signedIn(DEMO_USER.email, DEMO_USER.password);
    const blocked = [
      auth.api.changePassword({ headers, body: { currentPassword: DEMO_USER.password, newPassword: "taken-over-123" } }),
      auth.api.updateUser({ headers, body: { name: "Taken over" } }),
      auth.api.listSessions({ headers }),
      auth.api.revokeSessions({ headers }),
      auth.api.revokeOtherSessions({ headers }),
    ];
    for (const call of blocked) expect(await status(call)).toBe("FORBIDDEN");

    // The public password still works afterwards.
    const again = await signedIn(DEMO_USER.email, DEMO_USER.password);
    expect((await auth.api.getSession({ headers: again }))?.user.email).toBe(DEMO_USER.email);
  });
});

describe("other accounts", () => {
  it("can still change their own password", async () => {
    const headers = await signedIn(OTHER.email, OTHER.password);
    const res = await status(
      auth.api.changePassword({ headers, body: { currentPassword: OTHER.password, newPassword: "planner-password-2" } }),
    );
    expect(res).toBe("ok");
  });

  it("isDemoBlocked only applies to the demo email and non-allowlisted paths", () => {
    expect(isDemoBlocked("/change-password", DEMO_USER.email)).toBe(true);
    expect(isDemoBlocked("/get-session", DEMO_USER.email)).toBe(false);
    expect(isDemoBlocked("/change-password", OTHER.email)).toBe(false);
    expect(isDemoBlocked("/change-password", null)).toBe(false);
  });
});
