import { timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { DEMO_USER } from "@/lib/auth/demo";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { replaceDemoData } from "@/lib/demo/reset";

// Staging ~80k rows takes a while over HTTP; allow well beyond the default.
export const maxDuration = 300;

function authorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily demo reset, called by a Vercel Schedule (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused, and the
 * endpoint stays off until CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [demo] = await db.select({ id: user.id }).from(user).where(eq(user.email, DEMO_USER.email));
  if (!demo) return Response.json({ ok: false, error: "demo user not found; run the seed first" }, { status: 404 });

  const started = Date.now();
  const summary = await replaceDemoData(db, demo.id);
  const ms = Date.now() - started;
  console.log(`demo reset: ${JSON.stringify(summary)} in ${ms} ms`);
  return Response.json({ ok: true, ms, ...summary });
}
