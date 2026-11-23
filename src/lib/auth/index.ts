import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { createAuth } from "./config";

export const auth = createAuth(db);

/**
 * Current session, or null. Deduped per request. Reads request headers, so
 * call it inside <Suspense>.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Current user; redirects to /login when signed out. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
