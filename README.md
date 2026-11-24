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
| i18n | English + Korean, locale-prefixed routes (`/en`, `/ko`), typed dictionaries, `Intl` formatting |
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

## Importing your own data

**Data** in the sidebar (`/en/data`, `/ko/data`) is where each site's inputs are managed:

- **Projects and sites**: create a project (name, client, industry), add sites to it, or delete a site together with everything stored under it.
- **Datasets** per site, each with a CSV template, export and import:

| Dataset | Columns | Feeds |
| --- | --- | --- |
| SKU master | `code, name, category, length_mm, width_mm, height_mm, weight_kg, units_per_case` | slotting, analysis |
| Order lines | `order_no, shipped_on, sku_code, quantity` | movement analysis, slotting |
| Labour logs | `work_date, shift, process, hours, volume` | productivity benchmarks |

How an import works:

1. The file is parsed and checked **in the browser** first, so problems are listed by row and column, with a preview, before anything is sent.
2. The server parses and validates it **again**, and checks that every order line's `sku_code` exists in the site's SKU master.
3. Nothing is written unless every row is valid. The write is **all-or-nothing**: one batch on Neon (HTTP batches run as a transaction), a transaction on PGlite.

Rules:

- Headers match in any order and case, and unknown columns are ignored.
- Dates use `YYYY-MM-DD`.
- A file can have up to 50,000 rows and 3.5 MB.
- Exports use the same columns, so a file can be exported, edited and imported again.
- **SKUs** can be *added or updated* by code, or *replaced*. Replace makes the file the SKU master, so SKUs that aren't in the file are deleted along with their order lines.
- **Order lines and labour logs** can be *added* to what is stored or *replace* it.

The parser and validation rules are in `src/lib/import/` (unit-tested) and the server actions are in `src/app/[lang]/(app)/data/actions.ts`.

> The public demo account is shared, so anything imported there is visible to other visitors. It is reset to the sample data every day (see *Daily demo reset*).

## Languages

The UI ships in **English** and **Korean**. Every page lives under a locale prefix, e.g. `/en/dashboard` and `/ko/dashboard`, and each language is prerendered with its own `<html lang>`, canonical URL and `hreflang` alternates.

- **Bare URLs** (`/`, `/dashboard?site=…`) are redirected by `proxy.ts`: first to the language saved in the `NEXT_LOCALE` cookie, then the best match from the browser's `Accept-Language`, then English. The query string is kept.
- **Language switcher** in the page header, landing page, login page and editors. It swaps the `/{lang}` segment of the current URL and remembers the choice in the cookie.
- **Dictionaries** live in `src/i18n/dictionaries/`. `en.ts` defines the shape and `ko.ts` must satisfy it, so a missing or extra key fails `pnpm typecheck`. Placeholders use `{name}` and are filled with `fill()`.
- **Server components** call `getLocale()` / `getDictionary()` (`src/i18n/server.ts`, built on `next/root-params`). **Client components** use `useI18n()`, which returns `{ locale, t, fmt, href }`.
- **Numbers and dates** go through `formatFor(locale)` (`src/lib/format.ts`), e.g. `697,000` / `69.7만`.
- **Server actions** return error codes rather than text, and the UI maps them to the current language.
- Accessibility labels from libraries (sidebar toggle, toast region, React Flow controls) are translated too.

User data such as project and site names is not translated. The social preview image stays in English because the built-in OG font has no Hangul glyphs.

To add a language: append it to `LOCALES` in `src/i18n/config.ts`, add a dictionary that satisfies `Dictionary`, and register it in `src/i18n/dictionaries/index.ts`.

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
5. **Add the cron secret.** Create `CRON_SECRET` (another random string, e.g.
   `openssl rand -hex 32`) for Production. Vercel Schedules sends it to the daily
   demo reset; without it the endpoint stays switched off.
6. **Deploy.** Push to `main` (or Redeploy). The `vercel-build` script applies
   migrations, seeds the demo data **only if the database is empty**, then
   builds, so nobody has to copy the connection string. Every pull request gets
   its own preview URL.

Share the project's production domain (Settings → Domains). With Vercel's
default Standard Protection, other deployment URLs such as
`<project>-<team>.vercel.app` or per-commit URLs ask visitors to sign in to
Vercel.

### Daily demo reset

Visitors share the demo account and can import, clear or delete data, so it is put back every day.

- `vercel.json` defines a Vercel Schedule (`reset-demo`) that calls `GET /api/cron/reset-demo` every day at 03:00 in the `Asia/Seoul` timezone (18:00 UTC). On Hobby it starts within a 15-minute window.
- Pause it or run it on demand from the project's Schedules page (or `vercel schedules invoke reset-demo`) without redeploying; each run shows up in its execution history.
- Vercel creates Preview-branch copies of the schedule as inactive. Leave them that way: Preview deployments share the production database.
- The endpoint only runs with `Authorization: Bearer $CRON_SECRET`, which Vercel adds by itself.
- It rebuilds the sample data in two steps so the workspace is never half-empty:
  1. **Staging.** A fresh copy (about 80k rows) is written under owner-less projects with temporary codes, in small requests. Nothing shows them, because every page filters by owner.
  2. **Switch-over.** One atomic step deletes the demo account's projects (cascading to their sites, SKUs, orders, layouts, logs and maps) and hands the staged projects over.
- A run that fails while staging is cleaned up by the next one.
- The demo user and its sessions are kept. Other accounts are never touched.

To run it by hand on production:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/reset-demo
```

To rebuild everything from scratch, demo user included, run `pnpm db:seed` locally with the Neon `DATABASE_URL` and `BETTER_AUTH_SECRET` in your environment.

## Project layout

```
src/
  app/
    [lang]/                every page, prefixed with /en or /ko
      page.tsx             public landing page (static)
      login/               sign-in page + server actions (demo login)
      (app)/               signed-in shell: sidebar + pages
        dashboard/  projects/  projects/[projectId]/  data/  analysis/  studio/  studio/[layoutId]/  slotting/  productivity/  process/  process/[mapId]/
    api/auth/[...all]/     Better Auth handler
    api/cron/reset-demo/   daily demo reset (Vercel Schedules)
  components/app/          app-level components (sidebar, header, badges)
  components/analysis/     ABC filters, Pareto chart, share bars, matrix, SKU table
  components/studio/       3D editor: scene, instanced racks, store, toolbar, inspector
  components/slotting/     slotting view, worker hook, 3D slot plan
  components/three/        shared 3D pieces: site floor, docks, camera fitting
  components/productivity/ filters, status badge, weekly trend chart
  components/process/      process map editor and step node
  components/data/         data page: dataset cards, CSV import dialog, project/site forms
  components/ui/           shadcn/ui primitives
  lib/auth/                Better Auth config, session helpers, demo account
  lib/db/                  Drizzle schema + driver selection (Neon / PGlite)
  lib/analysis/            pure analysis logic (ABC classification) + unit tests
  lib/layout/              layout model, rack-field generator, stats/validation + tests
  lib/slotting/            locations + travel cost, sizing, solver, Web Worker + tests
  lib/productivity/        reference rates, performance index, weekly series + tests
  lib/process-map/         map model, flow analysis, auto-layout, seed template + tests
  lib/data/                data access layer, always scoped to the signed-in user
  lib/import/              CSV reader/writer, dataset columns and validation + tests
  lib/demo/                deterministic sample data + the staged demo reset
  i18n/                    locale config, dictionaries (en, ko), server + client helpers
  proxy.ts                 locale redirect for bare URLs + optimistic redirect to login
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
- [x] Data management: projects/sites, CSV import (validated, atomic), export and templates
- [x] Daily demo reset (Vercel Schedules, staged + atomic switch-over)
- [x] Production deployment on Vercel + Neon (free tier)
- [x] Landing polish
- [x] English and Korean UI with locale-prefixed routes
