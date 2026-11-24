import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import { localePath } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
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

/** Current user; redirects to the login page (in the current language) when signed out. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect(localePath(await getLocale(), "/login"));
  return session.user;
}
