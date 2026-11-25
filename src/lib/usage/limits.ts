/**
 * Per-account storage limits (PRD S-04, decided 2026-11-25). Saving past a
 * limit is refused before anything is written. The demo sample uses
 * 3 projects, 4 sites and about 80,000 rows, so visitors of the shared demo
 * account have roughly 40,000 rows of room until the nightly reset.
 */
export const LIMITS = {
  projects: 5,
  sites: 8,
  /** SKUs + order lines + labour logs across all of the account's sites. */
  rows: 120_000,
} as const;

export type Usage = { projects: number; sites: number; rows: number };
