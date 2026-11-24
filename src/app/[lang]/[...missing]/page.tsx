import { notFound } from "next/navigation";

/**
 * Any /{lang}/… path no other route matches, plus missing or foreign detail
 * pages that proxy.ts rewrites here. notFound() runs while prerendering, so
 * the response is a real 404 rendered by the localized [lang]/not-found.tsx.
 */
export default function Missing(): never {
  notFound();
}
