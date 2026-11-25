import { localeFromPath, localePath, type Locale } from "@/i18n/config";

/** Any origin works here: only whether the path stays on it matters. */
const BASE = "https://stackyard.invalid";

/**
 * Where to go after signing in. Only a path on this site is accepted, and it
 * always gets a locale; anything else falls back to the dashboard.
 *
 * Browsers read `\` as `/` and drop tabs and newlines inside URLs, so
 * `/\evil.example` or `/\t/evil.example` would leave the site even though
 * they start with a single `/`. Resolving the value as a URL against a fixed
 * origin and checking the origin catches every such form.
 */
export function safeNext(locale: Locale, next: string | null | undefined): string {
  const fallback = localePath(locale, "/dashboard");
  if (!next || !next.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;

  const path = `${url.pathname}${url.search}${url.hash}`;
  return localeFromPath(url.pathname) ? path : localePath(locale, path);
}
