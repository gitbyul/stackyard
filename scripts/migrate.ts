import "dotenv/config";

import { createDb, usesRemoteDb } from "../src/lib/db/client";

async function main() {
  // On Vercel without a connected database there is nothing to migrate.
  if (process.env.VERCEL && !usesRemoteDb()) {
    console.log("• DATABASE_URL not set on Vercel; skipping migrations");
    return;
  }
  const db = createDb();
  if (usesRemoteDb()) {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    await migrate(db, { migrationsFolder: "drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // createDb() types both drivers as one; the PGlite migrator wants its own.
    await migrate(db as never, { migrationsFolder: "drizzle" });
  }
  console.log(`✓ migrations applied (${usesRemoteDb() ? "remote" : "local PGlite"})`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
