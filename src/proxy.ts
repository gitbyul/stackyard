import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { isLocale, LOCALE_COOKIE, localeFromPath, negotiateLocale } from "@/i18n/config";
import { canOpenDetail, isDetailSection, sessionTokenFromCookie } from "@/lib/access/detail";
import { db } from "@/lib/db/shared";

/** App sections that need a signed-in user (after the /{lang} prefix). */
const PROTECTED = ["dashboard", "projects", "analysis", "studio", "slotting", "productivity", "process", "data"];

/**
 * 1. Paths without a locale are redirected to one: the remembered choice from
 *    the language switcher, else the browser's Accept-Language.
 * 2. Protected sections bounce visitors without a session cookie to the
 *    login page of the same language. Pages still verify the session on the
 *    server (see requireUser); this is only an optimistic gate.
 * 3. Detail pages (a project, layout or process map) check that the id is
 *    the user's before anything streams. With Cache Components the shell is
 *    sent first with a 200, so a notFound() inside the page can't change the
 *    status; rewriting here to the catch-all 404 route returns a real 404.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locale = localeFromPath(pathname);

  if (!locale) {
    const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
    const target = isLocale(remembered) ? remembered : negotiateLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${target}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.redirect(url);
  }

  const [, , section, id, extra] = pathname.split("/");
  const sessionCookie = getSessionCookie(request);
  if (PROTECTED.includes(section) && !sessionCookie) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Server actions (POST) on these pages run their own ownership checks. Next
  // strips its router headers before Proxy, so link prefetches can't be told
  // apart and run this check too; it is one primary-key lookup.
  if (isDetailSection(section) && id && extra === undefined && (request.method === "GET" || request.method === "HEAD")) {
    const token = sessionTokenFromCookie(sessionCookie);
    if (token && !(await canOpenDetail(db, section, decodeURIComponent(id), token))) {
      return NextResponse.rewrite(new URL(`/${locale}/not-found`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and files with an extension
  // (favicon, images); generated OG images live under /{lang}/ already.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
