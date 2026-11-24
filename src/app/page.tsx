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

import { Logo } from "@/components/app/logo";
import {
  ParetoPreview,
  ProcessPreview,
  ProductivityPreview,
  SlottingPreview,
  StudioPreview,
} from "@/components/landing/visuals";
import { Button } from "@/components/ui/button";

const REPO_URL = "https://github.com/gitbyul/stackyard";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const MODULES = [
  {
    id: "analysis",
    step: "Analyse",
    icon: ChartColumnBig,
    title: "Movement analysis",
    lead: "Find the few SKUs that drive most of the work.",
    points: [
      "ABC classification by units or by order lines, with adjustable cut-offs",
      "Cumulative movement curve, class shares and a units × lines matrix",
      "Sortable SKU ranking with CSV export",
    ],
    Visual: ParetoPreview,
  },
  {
    id: "studio",
    step: "Design",
    icon: Boxes,
    title: "Layout studio",
    lead: "Lay out pallet racking in 3D and see the capacity change live.",
    points: [
      "Generate a conventional rack field from the floor size and clear height",
      "Drag, rotate and resize rows with undo/redo and keyboard shortcuts",
      "Live pallet-position count, floor coverage and overlap checks",
    ],
    Visual: StudioPreview,
  },
  {
    id: "slotting",
    step: "Slot",
    icon: Route,
    title: "Slotting",
    lead: "Put the busiest stock closest to the dock doors.",
    points: [
      "Sizes each SKU's storage from demand and case volume",
      "Cube-per-order solver runs in a Web Worker, compared with a by-code baseline",
      "3D slot plan by ABC class and a CSV of every assignment",
    ],
    Visual: SlottingPreview,
  },
  {
    id: "productivity",
    step: "Measure",
    icon: Gauge,
    title: "Productivity",
    lead: "Benchmark labour rates per process against reference rates.",
    points: [
      "Performance index from standard vs. actual hours, weighted by workload",
      "Weekly trend per process and day/night comparison",
      "Cross-site matrix, each site against its own industry",
    ],
    Visual: ProductivityPreview,
  },
  {
    id: "process",
    step: "Improve",
    icon: Workflow,
    title: "Process maps",
    lead: "Map the flow from dock to dock and measure the waste.",
    points: [
      "Flow-process charts with the five ASME step types plus decisions",
      "Value-added ratio, critical path and loop / dead-end checks",
      "Every save kept as a numbered version you can reload",
    ],
    Visual: ProcessPreview,
  },
] as const;

const ENGINEERING = [
  {
    icon: Layers,
    title: "Instanced WebGL",
    body: "Every upright, beam and pallet is drawn with three instanced meshes, so a 29,400-position site is three draw calls. Picking uses one hit box per row.",
  },
  {
    icon: Cpu,
    title: "Off-main-thread solver",
    body: "Slotting runs in a Web Worker. Stale results are dropped and the previous plan stays on screen while the next one solves.",
  },
  {
    icon: ServerCog,
    title: "Server-first Next.js 16",
    body: "Cache Components with streamed data, server actions validated with zod, and a data layer that scopes every query to the signed-in user.",
  },
  {
    icon: FlaskConical,
    title: "Tested domain logic",
    body: "ABC, layout generation, slotting, productivity and flow analysis are pure functions covered by 57 Vitest cases, run in CI on every push.",
  },
  {
    icon: Database,
    title: "Free-tier production",
    body: "Vercel Hobby with Neon Postgres. The build applies migrations and seeds an empty database, so no secrets are copied by hand.",
  },
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

const STATS = [
  { value: "5", label: "connected modules" },
  { value: "76k", label: "sample order lines" },
  { value: "29,400", label: "pallet positions in 3D" },
  { value: "57", label: "unit tests in CI" },
];

/**
 * Isometric rack field drawn in SVG, standing in for the 3D studio. Faces are
 * opaque and drawn back to front (painter's order), so nearer stacks cover
 * the ones behind instead of showing through.
 */
function RackField() {
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
    <svg viewBox="0 0 560 340" role="img" aria-label="Isometric warehouse rack layout" className="h-auto w-full">
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

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b border-transparent bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#workflow" className="hover:text-foreground">
              Workflow
            </a>
            <a href="#modules" className="hover:text-foreground">
              Modules
            </a>
            <a href="#engineering" className="hover:text-foreground">
              Engineering
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GitHubMark className="size-4" /> Source
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Open the demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-signal" /> Warehouse design studio
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              From order data to a warehouse you can walk through.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              Stackyard turns raw order lines into storage decisions: analyse SKU movement, lay out the racking in
              3D, slot stock near the docks, benchmark labour and map the flow, all on one set of project data.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Explore the live demo <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GitHubMark className="size-4" /> View the source
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">No sign-up: the demo workspace opens with one click.</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <RackField />
          </div>
        </section>

        {/* Proof points */}
        <section aria-label="At a glance" className="border-y bg-muted/30">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl font-semibold tracking-tight">{s.value}</dd>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How a project flows</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The same order lines, layouts and labour data feed every step, so a change in one module shows up in the
            next.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m, i) => (
              <li key={m.id}>
                <a
                  href={`#${m.id}`}
                  className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} · {m.step}
                  </span>
                  <span className="mt-2 flex items-center gap-2 font-medium">
                    <m.icon className="size-4 text-primary dark:text-signal" />
                    {m.title}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">{m.lead}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* Modules */}
        <section id="modules" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Five modules, one workspace</h2>
              <p className="mt-2 text-muted-foreground">
                Every module below is live in the demo with fictional sample data.
              </p>
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
                    <m.icon className="size-4 text-primary dark:text-signal" /> {m.step}
                  </p>
                  <h3 id={`${m.id}-title`} className="mt-2 text-xl font-semibold tracking-tight">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">{m.lead}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {m.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <m.Visual />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Engineering */}
        <section id="engineering" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Under the hood</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Built as a production-style app, not a mock-up: real auth, a real database, tested logic and CI.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINEERING.map((e) => (
              <div key={e.title} className="rounded-xl border bg-card p-5">
                <e.icon className="size-5 text-primary dark:text-signal" />
                <h3 className="mt-3 font-medium">{e.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
              </div>
            ))}
            <div className="rounded-xl border bg-card p-5 sm:col-span-2 lg:col-span-1">
              <h3 className="font-medium">Stack</h3>
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
              <h2 className="text-2xl font-semibold tracking-tight">See it with real numbers.</h2>
              <p className="mt-2 text-primary-foreground/80">
                The demo workspace has three fictional clients, four sites and 76k order lines ready to explore.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">
                  Explore the live demo <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GitHubMark className="size-4" /> Source on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>Stackyard: a portfolio project. All companies and data are fictional.</span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <GitHubMark className="size-4" /> gitbyul/stackyard
          </a>
        </div>
      </footer>
    </div>
  );
}
