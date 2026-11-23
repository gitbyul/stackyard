const nf = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const df = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export const formatNumber = (n: number) => nf.format(n);
export const formatCompact = (n: number) => compact.format(n);
/** Accepts an ISO date string (YYYY-MM-DD) as stored by Postgres `date`. */
export const formatDate = (iso: string) => df.format(new Date(`${iso}T00:00:00Z`));
