import { eq } from "drizzle-orm";

import { DEMO_USER } from "@/lib/auth/demo";
import { cronGuard } from "@/lib/cron/guard";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { replaceDemoData } from "@/lib/demo/reset";

// Staging ~80k rows takes a while over HTTP; allow well beyond the default.
export const maxDuration = 300;

/** Daily demo reset, called by a Vercel Schedule (see vercel.json and cronGuard). */
export async function GET(request: Request) {
  const denied = cronGuard(request);
  if (denied) return denied;

  const [demo] = await db.select({ id: user.id }).from(user).where(eq(user.email, DEMO_USER.email));
  if (!demo) return Response.json({ ok: false, error: "demo user not found; run the seed first" }, { status: 404 });

  const started = Date.now();
  const summary = await replaceDemoData(db, demo.id);
  const ms = Date.now() - started;
  console.log(`demo reset: ${JSON.stringify(summary)} in ${ms} ms`);
  return Response.json({ ok: true, ms, ...summary });
}
