import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { DEMO_USER } from "./demo";

/**
 * The only auth endpoints a demo session may call. Its password is public
 * (the demo button signs in with it), so everything else — changing the
 * password, email or profile, deleting the account, listing or revoking
 * sessions (which would show other visitors' IPs) — is refused. An allowlist
 * also covers endpoints added by future Better Auth versions.
 */
export const DEMO_ALLOWED_PATHS: ReadonlySet<string> = new Set(["/get-session", "/sign-out", "/sign-in/email"]);

export function isDemoBlocked(path: string, email: string | null | undefined) {
  return email === DEMO_USER.email && !DEMO_ALLOWED_PATHS.has(path);
}

/**
 * The URL auth runs on. On Vercel, production uses the project's production
 * domain; preview deployments use their own unique URL, otherwise sign-in
 * from a preview would be checked against the production origin.
 */
function baseURL() {
  const env = process.env;
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Also accept the deployment's own URL and branch URL on Vercel. */
function trustedOrigins() {
  const env = process.env;
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
}

/**
 * Built as a factory so CLI scripts can create it without `server-only`.
 * Public sign-up is off; only the seed script passes `allowSignUp` to create
 * the demo user.
 */
export function createAuth(db: Db, { allowSignUp = false }: { allowSignUp?: boolean } = {}) {
  return betterAuth({
    baseURL: baseURL(),
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, disableSignUp: !allowSignUp },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (DEMO_ALLOWED_PATHS.has(ctx.path)) return;
        const session = await getSessionFromCtx(ctx);
        if (isDemoBlocked(ctx.path, session?.user.email)) {
          throw new APIError("FORBIDDEN", { message: "The shared demo account can't be changed." });
        }
      }),
    },
    session: {
      // Cache the session in a signed cookie for 5 minutes to skip DB reads.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
