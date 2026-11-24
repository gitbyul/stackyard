import {
  ArrowRight,
  Boxes,
  ChartColumnBig,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  Layers,
  Route,
  ServerCog,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/app/language-switcher";
import { Logo } from "@/components/app/logo";
import {
  ParetoPreview,
  ProcessPreview,
  ProductivityPreview,
  SlottingPreview,
  StudioPreview,
} from "@/components/landing/visuals";
import { Button } from "@/components/ui/button";
import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatFor } from "@/lib/format";

const REPO_URL = "https://github.com/gitbyul/stackyard";

/** Number of unit tests (`pnpm test`); update when the suite grows. */
const TEST_COUNT = 70;

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Module order and visuals; the copy lives in the `landing` dictionary. */
const MODULES = [
  { id: "analysis", icon: ChartColumnBig, Visual: ParetoPreview },
  { id: "studio", icon: Boxes, Visual: StudioPreview },
  { id: "slotting", icon: Route, Visual: SlottingPreview },
  { id: "productivity", icon: Gauge, Visual: ProductivityPreview },
  { id: "process", icon: Workflow, Visual: ProcessPreview },
] as const;

const ENGINEERING = [
  { id: "webgl", icon: Layers },
  { id: "worker", icon: Cpu },
  { id: "server", icon: ServerCog },
  { id: "tests", icon: FlaskConical },
  { id: "deploy", icon: Database },
] as const;

const STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "shadcn/ui",
  "Drizzle ORM",
  "Neon Postgres",
  "Better Auth",
  "three.js · R3F",
  "React Flow",
  "Recharts",
  "Vitest",
  "GitHub Actions",
  "Vercel",
];

/** Headline numbers from the sample data and the test suite. */
const STATS = [
  { value: 5, key: "modules" },
  { value: 76_000, key: "lines", compact: true },
  { value: 29_400, key: "positions" },
  { value: TEST_COUNT, key: "tests" },
] as const;

/**
 * Isometric rack field drawn in SVG, standing in for the 3D studio. Faces are
 * opaque and drawn back to front (painter's order), so nearer stacks cover
 * the ones behind instead of showing through.
 */
function RackField({ label }: { label: string }) {
  const shade = (pct: number) => `color-mix(in oklab, var(--primary) ${pct}%, var(--card))`;
  const blocks: { key: string; x: number; y: number; lv: number; hot: boolean }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const levels = 1 + ((row * 7 + col * 3) % 3);
      for (let lv = 0; lv < levels; lv++) {
        blocks.push({
          key: `${row}-${col}-${lv}`,
          x: 180 + col * 52 - row * 26,
          y: 60 + row * 30 + col * 15,
          lv,
          hot: (row + col) % 5 === 0 && lv === levels - 1,
        });
      }
    }
  }
  // Further back = smaller screen y; within a stack, bottom level first.
  blocks.sort((a, b) => a.y - b.y || a.lv - b.lv);
  return (
    <svg viewBox="0 0 560 340" role="img" aria-label={label} className="h-auto w-full">
      {blocks.map((b) => (
        <g key={b.key} transform={`translate(${b.x} ${b.y - b.lv * 16})`} stroke="var(--card)" strokeWidth={0.75}>
          <path d="M0 0 L22 -11 L44 0 L22 11 Z" style={{ fill: b.hot ? "var(--signal)" : shade(28) }} />
          <path
            d="M0 0 L22 11 L22 25 L0 14 Z"
            style={{ fill: b.hot ? "color-mix(in oklab, var(--signal) 80%, black)" : shade(70) }}
          />
          <path
            d="M44 0 L22 11 L22 25 L44 14 Z"
            style={{ fill: b.hot ? "color-mix(in oklab, var(--signal) 65%, black)" : shade(50) }}
          />
        </g>
      ))}
    </svg>
  );
}

export default async function LandingPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.landing;
  const f = formatFor(locale);
  const demo = localePath(locale, "/login");
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b border-transparent bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo />
          <nav aria-label={dict.common.sections} className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#workflow" className="hover:text-foreground">
              {t.navWorkflow}
            </a>
            <a href="#modules" className="hover:text-foreground">
              {t.navModules}
            </a>
            <a href="#engineering" className="hover:text-foreground">
              {t.navEngineering}
            </a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher compact />
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GitHubMark className="size-4" /> {t.headerSource}
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href={demo}>{t.headerDemo}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-signal" /> {t.badge}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {t.headline}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              {t.intro}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={demo}>
                  {t.ctaDemo} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GitHubMark className="size-4" /> {t.ctaSource}
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t.noSignup}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <RackField label={t.badge} />
          </div>
        </section>

        {/* Proof points */}
        <section aria-label={t.atAGlance} className="border-y bg-muted/30">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.key}>
                <dt className="sr-only">{t.stats[s.key]}</dt>
                <dd className="text-3xl font-semibold tracking-tight">
                  {"compact" in s ? f.compact(s.value) : f.number(s.value)}
                </dd>
                <p className="mt-1 text-sm text-muted-foreground">{t.stats[s.key]}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">{t.workflowTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t.workflowIntro}</p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m, i) => (
              <li key={m.id}>
                <a
                  href={`#${m.id}`}
                  className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} · {t.modules[m.id].step}
                  </span>
                  <span className="mt-2 flex items-center gap-2 font-medium">
                    <m.icon className="size-4 text-primary dark:text-signal" />
                    {dict.nav[m.id]}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">{t.modules[m.id].lead}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* Modules */}
        <section id="modules" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t.modulesTitle}</h2>
              <p className="mt-2 text-muted-foreground">{t.modulesIntro}</p>
            </div>
            {MODULES.map((m, i) => (
              <article
                key={m.id}
                id={m.id}
                className="grid scroll-mt-24 items-center gap-8 md:grid-cols-2"
                aria-labelledby={`${m.id}-title`}
              >
                <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                  <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <m.icon className="size-4 text-primary dark:text-signal" /> {t.modules[m.id].step}
                  </p>
                  <h3 id={`${m.id}-title`} className="mt-2 text-xl font-semibold tracking-tight">
                    {dict.nav[m.id]}
                  </h3>
                  <p className="mt-2 text-muted-foreground">{t.modules[m.id].lead}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {t.modules[m.id].points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <m.Visual t={t.visuals} />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Engineering */}
        <section id="engineering" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">{t.engineeringTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t.engineeringIntro}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINEERING.map((e) => (
              <div key={e.id} className="rounded-xl border bg-card p-5">
                <e.icon className="size-5 text-primary dark:text-signal" />
                <h3 className="mt-3 font-medium">{t.engineering[e.id].title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.engineering[e.id].body}</p>
              </div>
            ))}
            <div className="rounded-xl border bg-card p-5 sm:col-span-2 lg:col-span-1">
              <h3 className="font-medium">{t.stack}</h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {STACK.map((s) => (
                  <li key={s} className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t.closingTitle}</h2>
              <p className="mt-2 text-primary-foreground/80">{t.closingBody}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href={demo}>
                  {t.ctaDemo} <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GitHubMark className="size-4" /> {t.closingSource}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>{t.footer}</span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <GitHubMark className="size-4" /> gitbyul/stackyard
          </a>
        </div>
      </footer>
    </div>
  );
}
