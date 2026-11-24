import "server-only";

import { headers } from "next/headers";
import { lang } from "next/root-params";

import { DEFAULT_LOCALE, isLocale, localeFromPath, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

/**
 * The current UI locale. Server Components read it from the [lang] root
 * param. Server Actions can't use root params, so there we fall back to the
 * locale in the Referer path (the page that submitted the action).
 */
export async function getLocale(): Promise<Locale> {
  try {
    const value = await lang();
    if (isLocale(value)) return value;
  } catch {
    // Not in a Server Component render (e.g. a Server Action).
  }
  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      const fromPath = localeFromPath(new URL(referer).pathname);
      if (fromPath) return fromPath;
    } catch {
      // Malformed Referer; use the default.
    }
  }
  return DEFAULT_LOCALE;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return dictionaries[locale ?? (await getLocale())];
}
