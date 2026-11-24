/**
 * Supported UI languages. URLs carry the locale as their first segment
 * (/en/…, /ko/…); bare URLs are redirected by the proxy.
 */
export const LOCALES = ["en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that remembers an explicit language choice from the switcher. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABEL: Record<Locale, string> = { en: "English", ko: "한국어" };

/** BCP 47 tags for Intl number/date formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", ko: "ko-KR" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Prefix an app path ("/dashboard") with a locale ("/ko/dashboard"). */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** The locale in a pathname's first segment, if any. */
export function localeFromPath(pathname: string): Locale | null {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : null;
}

/** Swap (or add) the locale segment of a pathname. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const current = localeFromPath(pathname);
  const rest = current ? pathname.slice(current.length + 1) : pathname;
  return localePath(to, rest || "/");
}

/**
 * Pick the best supported locale from an Accept-Language header, honouring
 * q-weights ("ko-KR,ko;q=0.9,en;q=0.8" -> "ko").
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((x) => x.base && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return ranked.map((x) => x.base).find(isLocale) ?? DEFAULT_LOCALE;
}
