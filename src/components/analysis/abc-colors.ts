import type { AbcClass } from "@/lib/analysis/abc";

/** CSS variables for each ABC class (defined in globals.css for light and dark). */
export const ABC_FILL: Record<AbcClass, string> = {
  A: "var(--abc-a)",
  B: "var(--abc-b)",
  C: "var(--abc-c)",
};

/** Text color that reads on top of the class fill. */
export const ABC_INK: Record<AbcClass, string> = {
  A: "var(--abc-a-ink)",
  B: "var(--abc-b-ink)",
  C: "var(--abc-c-ink)",
};
