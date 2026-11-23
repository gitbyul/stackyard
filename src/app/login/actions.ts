"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { DEMO_USER } from "@/lib/auth/demo";

export type LoginState = { error?: string };

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

/** Only allow same-site relative paths as the post-login destination. */
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: "Email or password is incorrect." };
    throw err;
  }
  redirect(safeNext(parsed.data.next));
}

export async function signInAsDemo(formData: FormData) {
  await auth.api.signInEmail({
    body: { email: DEMO_USER.email, password: DEMO_USER.password },
  });
  redirect(safeNext(formData.get("next")?.toString()));
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
