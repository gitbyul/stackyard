import { INTL_LOCALE, type Locale } from "@/i18n/config";

export type Formatter = ReturnType<typeof createFormatter>;

function createFormatter(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  const nf = new Intl.NumberFormat(tag);
  const compact = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(tag, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" });
  const monthDay = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" });
  return {
    number: (n: number) => nf.format(n),
    compact: (n: number) => compact.format(n),
    /** ISO date string (YYYY-MM-DD) as stored by Postgres `date`. */
    date: (iso: string) => date.format(new Date(`${iso}T00:00:00Z`)),
    monthDay: (iso: string) => monthDay.format(new Date(`${iso}T00:00:00Z`)),
    dateTime: (d: Date | string) => dateTime.format(typeof d === "string" ? new Date(d) : d),
  };
}

const cache = new Map<Locale, Formatter>();

/** Number and date formatters for a UI locale (memoised). */
export function formatFor(locale: Locale): Formatter {
  let f = cache.get(locale);
  if (!f) {
    f = createFormatter(locale);
    cache.set(locale, f);
  }
  return f;
}
