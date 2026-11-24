# Stackyard

[![CI](https://github.com/gitbyul/stackyard/actions/workflows/ci.yml/badge.svg)](https://github.com/gitbyul/stackyard/actions/workflows/ci.yml)

**Live demo: [stackyard-seven.vercel.app](https://stackyard-seven.vercel.app)**. Choose *Explore the demo workspace* to sign in.

**Warehouse design studio**: turn raw order lines into storage decisions. Analyse SKU movement, size the racking, and lay out a distribution center in an interactive 3D studio.

> Portfolio project. Every company, site and dataset in it is fictional.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Partial Prefetching) · React 19 · TypeScript |
| UI | Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons · Recharts |
| 3D | three.js · React Three Fiber · drei · zustand (editor state) |
| Diagrams | React Flow (@xyflow/react) |
| Data | PostgreSQL via Drizzle ORM: **Neon** in production, embedded **PGlite** locally |
| Auth | Better Auth (email + password, cookie-cached sessions), Next.js `proxy.ts` gate |
| Hosting | Vercel (Hobby/free tier) |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
cp .env.local .env           # drizzle-kit and the db scripts read .env
pnpm db:setup                # migrate + seed sample data into .data/pglite
pnpm dev
```

Open http://localhost:3000 and choose **Explore the demo workspace**.

With `DATABASE_URL` empty, the app uses an embedded PGlite database in `.data/`, so you don't need Docker or a Postgres install.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` | Generate route types, then `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm db:generate` | Create a SQL migration from `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations (Neon or PGlite, picked from `DATABASE_URL`) |
| `pnpm db:seed` | Reset sample data + demo user (deterministic) |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:
unit tests, ESLint, typecheck and a production build (pnpm from
`packageManager`), on Node 26 like local development and Vercel. Vercel deploys
separately through its Git integration.

## Deploying to Vercel (free tier)

Everything below fits the free plans: Vercel Hobby (non-commercial, fine for a
portfolio) and Neon Free (0.5 GB; the database sleeps when idle, so the first
request after a pause takes a second or two).

1. **Import the repository** in Vercel (New Project → pick the GitHub repo).
   Framework preset: Next.js. Leave the build command as the default.
2. **Use pnpm 12.** Under Settings → Environment Variables add
   `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel installs the pnpm version pinned in
   `packageManager`. Keep Settings → Build and Deployment → Node.js at **26.x**.
3. **Add a database.** Storage → Marketplace → **Neon** (Free plan, region close
   to your Vercel functions, e.g. `us-east-1` for the default `iad1`) → connect
   it to the project. This sets `DATABASE_URL`.
4. **Add the auth secret.** Create `BETTER_AUTH_SECRET` (any random string of 32+
   characters, e.g. `openssl rand -base64 32`) for Production and Preview.
   Don't set `BETTER_AUTH_URL`; the app picks the production domain or the
   preview URL from Vercel's own variables.
5. **Deploy.** Push to `main` (or Redeploy). The `vercel-build` script applies
   migrations, seeds the demo data **only if the database is empty**, then
   builds, so nobody has to copy the connection string. Every pull request gets
   its own preview URL.

Share the project's production domain (Settings → Domains). With Vercel's
default Standard Protection, other deployment URLs such as
`<project>-<team>.vercel.app` or per-commit URLs ask visitors to sign in to
Vercel.

To reset the demo data later, run `pnpm db:seed` locally with the Neon
`DATABASE_URL` and `BETTER_AUTH_SECRET` in your environment.

## Project layout

```
src/
  app/
    page.tsx               public landing page (static)
    login/                 sign-in page + server actions (demo login)
    (app)/                 signed-in shell: sidebar + pages
      dashboard/  projects/  projects/[projectId]/  analysis/  studio/  studio/[layoutId]/  slotting/  productivity/  process/  process/[mapId]/
    api/auth/[...all]/     Better Auth handler
  components/app/          app-level components (sidebar, header, badges)
  components/analysis/     ABC filters, Pareto chart, share bars, matrix, SKU table
  components/studio/       3D editor: scene, instanced racks, store, toolbar, inspector
  components/slotting/     slotting view, worker hook, 3D slot plan
  components/three/        shared 3D pieces: site floor, docks, camera fitting
  components/productivity/ filters, status badge, weekly trend chart
  components/process/      process map editor and step node
  components/ui/           shadcn/ui primitives
  lib/auth/                Better Auth config, session helpers, demo account
  lib/db/                  Drizzle schema + driver selection (Neon / PGlite)
  lib/analysis/            pure analysis logic (ABC classification) + unit tests
  lib/layout/              layout model, rack-field generator, stats/validation + tests
  lib/slotting/            locations + travel cost, sizing, solver, Web Worker + tests
  lib/productivity/        reference rates, performance index, weekly series + tests
  lib/process-map/         map model, flow analysis, auto-layout, seed template + tests
  lib/data/                data access layer, always scoped to the signed-in user
  proxy.ts                 optimistic redirect to /login
scripts/                   migrate + seed
drizzle/                   generated SQL migrations
```

## Roadmap

- [x] Foundation: auth, app shell, projects/sites, sample data
- [x] Movement analysis: ABC classification by units or order lines, Pareto curve, units × lines matrix, CSV export
- [ ] Movement analysis: order profiles, SKU mix
- [x] Layout studio: instanced 3D rack editor with drag, undo/redo, validation and a rack-field generator
- [ ] Layout studio: GPU id-buffer picking, aisles/zones, 2D DXF export
- [x] Slotting: cube-per-order / velocity solver in a Web Worker, compared with a by-code baseline, 3D slot plan and CSV export
- [x] Productivity: per-process labour rates vs. industry reference rates, weekly index trend, site comparison
- [x] Process maps: React Flow editor with ASME step types, critical path, value-added ratio, auto-arrange and immutable version history
- [x] Production deployment on Vercel + Neon (free tier)
- [ ] Landing polish
