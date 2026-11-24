import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { isLocale, LOCALE_COOKIE, localeFromPath, negotiateLocale } from "@/i18n/config";

/** App sections that need a signed-in user (after the /{lang} prefix). */
const PROTECTED = ["dashboard", "projects", "analysis", "studio", "slotting", "productivity", "process", "data"];

/**
 * 1. Paths without a locale are redirected to one: the remembered choice from
 *    the language switcher, else the browser's Accept-Language.
 * 2. Protected sections bounce visitors without a session cookie to the
 *    login page of the same language. Pages still verify the session on the
 *    server (see requireUser); this is only an optimistic gate.
 */
export function proxy(request: NextRequest) {
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

  const section = pathname.split("/")[2];
  if (PROTECTED.includes(section) && !getSessionCookie(request)) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and files with an extension
  // (favicon, images); generated OG images live under /{lang}/ already.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
