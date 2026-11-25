import { timingSafeEqual } from "node:crypto";

/**
 * Gate for scheduled endpoints. Vercel Schedules send
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused, and the
 * endpoints stay off until CRON_SECRET is set. Returns the response to send
 * when the request may not run, or null when it may.
 */
export function cronGuard(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
