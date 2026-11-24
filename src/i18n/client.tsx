"use client";

import { createContext, use, useMemo } from "react";

import { formatFor, type Formatter } from "@/lib/format";
import { localePath, type Locale } from "./config";
import type { Dictionary } from "./dictionaries";

type I18n = {
  locale: Locale;
  t: Dictionary;
  fmt: Formatter;
  /** Prefix an app path with the current locale. */
  href: (path: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18n>(
    () => ({ locale, t: dictionary, fmt: formatFor(locale), href: (p) => localePath(locale, p) }),
    [locale, dictionary],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

/** Locale, dictionary and formatters for Client Components. */
export function useI18n(): I18n {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Replace {name} placeholders in a dictionary string. */
export { fill } from "./fill";
