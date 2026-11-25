/**
 * Fills the database with fictional sample data plus the public demo user.
 * Every company, site and product here is made up. Safe to re-run: it wipes
 * the domain tables and the demo user first. The data itself comes from
 * src/lib/demo/sample-data.ts, which the daily demo reset uses too.
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { createAuth } from "../src/lib/auth/config";
import { DEMO_USER } from "../src/lib/auth/demo";
import { createDb, usesRemoteDb } from "../src/lib/db/client";
import * as s from "../src/lib/db/schema";
import { replaceDemoData } from "../src/lib/demo/reset";

const db = createDb();
// Public sign-up is off; the seed is the one place that creates an account.
const auth = createAuth(db, { allowSignUp: true });

async function main() {
  // `--if-empty` (used by the Vercel build) only seeds a fresh database, so
  // redeploys never wipe data that visitors or the owner have changed.
  if (process.argv.includes("--if-empty")) {
    if (process.env.VERCEL && !usesRemoteDb()) {
      console.log("• DATABASE_URL not set on Vercel; skipping seed");
      return;
    }
    const existing = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.email, DEMO_USER.email)).limit(1);
    if (existing.length > 0) {
      console.log("• demo data already present; skipping seed");
      return;
    }
  }

  console.log("• clearing previous sample data");
  await db.delete(s.project);
  await db.delete(s.user).where(eq(s.user.email, DEMO_USER.email));

  console.log("• creating demo user");
  const { user } = await auth.api.signUpEmail({ body: { ...DEMO_USER } });

  const sum = await replaceDemoData(db, user.id);
  console.log(
    `✓ seeded ${sum.projects} projects, ${sum.sites} sites, ${sum.skus} SKUs, ${sum.orderLines} order lines, ${sum.laborLogs} labour records`,
  );
  console.log(`  demo login: ${DEMO_USER.email}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
