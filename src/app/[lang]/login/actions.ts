"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DEFAULT_LOCALE, isLocale, localeFromPath, localePath, type Locale } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/server";
import { auth } from "@/lib/auth";
import { DEMO_USER } from "@/lib/auth/demo";

export type LoginState = { error?: string };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
  lang: z.string().optional(),
});

/** The form posts its page's locale; fall back to the Referer, then English. */
async function localeOf(value: unknown): Promise<Locale> {
  return isLocale(value) ? value : await getLocale().catch(() => DEFAULT_LOCALE);
}

/**
 * Only allow same-site paths as the post-login destination, and make sure
 * they carry a locale (the proxy adds one to `next`, but be defensive).
 */
function safeNext(locale: Locale, next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return localePath(locale, "/dashboard");
  return localeFromPath(next) ? next : localePath(locale, next);
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = Object.fromEntries(formData);
  const locale = await localeOf(raw.lang);
  const t = (await getDictionary(locale)).auth;

  const parsed = credentials.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "email" ? t.invalidEmail : t.missingPassword };
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: t.wrongCredentials };
    throw err;
  }
  redirect(safeNext(locale, parsed.data.next));
}

export async function signInAsDemo(formData: FormData) {
  const locale = await localeOf(formData.get("lang"));
  await auth.api.signInEmail({
    body: { email: DEMO_USER.email, password: DEMO_USER.password },
  });
  redirect(safeNext(locale, formData.get("next")?.toString()));
}

export async function signOut() {
  const locale = await getLocale();
  await auth.api.signOut({ headers: await headers() });
  redirect(localePath(locale, "/login"));
}
