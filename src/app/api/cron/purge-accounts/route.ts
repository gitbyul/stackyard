import { purgeAccounts } from "@/lib/accounts/purge";
import { DEMO_USER } from "@/lib/auth/demo";
import { cronGuard } from "@/lib/cron/guard";
import { db } from "@/lib/db";

export const maxDuration = 300;

/**
 * Account purge every three days (feature F-15), called by a Vercel Schedule
 * (see vercel.json). Deletes every account but the shared demo one, with all
 * of its data. Logs counts only, never emails.
 */
export async function GET(request: Request) {
  const denied = cronGuard(request);
  if (denied) return denied;

  const started = Date.now();
  try {
    const summary = await purgeAccounts(db, DEMO_USER.email);
    const ms = Date.now() - started;
    console.log(`account purge: ${JSON.stringify(summary)} in ${ms} ms`);
    return Response.json({ ok: true, ms, ...summary });
  } catch (err) {
    console.error("account purge failed:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, error: "purge failed; nothing was deleted" }, { status: 500 });
  }
}
