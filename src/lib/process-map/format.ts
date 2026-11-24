import { fill } from "@/i18n/fill";

/** "45 min" / "5 h 30 min" using the dictionary's duration templates. */
export function formatMinutes(t: { minutes: string; hoursMinutes: string }, minutes: number): string {
  const m = Math.round(minutes);
  return m >= 60 ? fill(t.hoursMinutes, { h: Math.floor(m / 60), m: m % 60 }) : fill(t.minutes, { m });
}
