import type { Locale } from "../config";
import { en, type Dictionary } from "./en";
import { ko } from "./ko";

export type { Dictionary };

/**
 * Both dictionaries are small, so they're imported eagerly; the [lang] layout
 * hands the active one to Client Components through <I18nProvider>.
 */
export const dictionaries: Record<Locale, Dictionary> = { en, ko };
