# Stackyard

**Warehouse design studio**: turn raw order lines into storage decisions. Analyse SKU movement, size the racking, and lay out a distribution center in an interactive 3D studio.

> Portfolio project. Every company, site and dataset in it is fictional.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Partial Prefetching) · React 19 · TypeScript |
| UI | Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons · Recharts |
| 3D | three.js · React Three Fiber · drei · zustand (editor state) |
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

## Deploying to Vercel (free)

1. Import the repo in Vercel.
2. Storage → Marketplace → **Neon** → connect. This sets `DATABASE_URL`.
3. Add the `BETTER_AUTH_SECRET` environment variable.
4. Run once against the Neon URL: `DATABASE_URL=... pnpm db:setup`.
5. Deploy. Vercel detects the production URL automatically.

## Project layout

```
src/
  app/
    page.tsx               public landing page (static)
    login/                 sign-in page + server actions (demo login)
    (app)/                 signed-in shell: sidebar + pages
      dashboard/  projects/  projects/[projectId]/  analysis/  studio/  studio/[layoutId]/
    api/auth/[...all]/     Better Auth handler
  components/app/          app-level components (sidebar, header, badges)
  components/analysis/     ABC filters, Pareto chart, share bars, matrix, SKU table
  components/studio/       3D editor: scene, instanced racks, store, toolbar, inspector
  components/ui/           shadcn/ui primitives
  lib/auth/                Better Auth config, session helpers, demo account
  lib/db/                  Drizzle schema + driver selection (Neon / PGlite)
  lib/analysis/            pure analysis logic (ABC classification) + unit tests
  lib/layout/              layout model, rack-field generator, stats/validation + tests
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
- [ ] Auto-slotting: placement solver in a Web Worker
- [ ] Productivity benchmarks
- [ ] Process maps
- [ ] i18n (ko/en), landing polish, deployment
