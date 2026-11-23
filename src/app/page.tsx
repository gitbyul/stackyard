import { ArrowRight, Boxes, ChartColumnBig, Gauge, Route, Workflow } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

const MODULES = [
  {
    icon: ChartColumnBig,
    title: "Movement analysis",
    body: "ABC velocity, order profiles and SKU-mix curves from raw order lines.",
  },
  {
    icon: Boxes,
    title: "Layout studio",
    body: "A WebGL editor that keeps 100k instanced racks and pallets at 60 fps.",
  },
  {
    icon: Route,
    title: "Auto-slotting",
    body: "Place fast movers near the docks with a solver that runs in a Web Worker.",
  },
  {
    icon: Gauge,
    title: "Productivity",
    body: "Benchmark pick, pack and put-away rates across sites and shifts.",
  },
  {
    icon: Workflow,
    title: "Process maps",
    body: "Model inbound-to-outbound flows as editable, versioned diagrams.",
  },
];

/** Isometric rack field drawn in SVG, standing in for the 3D studio. */
function RackField() {
  const racks = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 40 + col * 52 - row * 26;
      const y = 60 + row * 30 + col * 15;
      const levels = 1 + ((row * 7 + col * 3) % 3);
      for (let lv = 0; lv < levels; lv++) {
        const hot = (row + col) % 5 === 0 && lv === levels - 1;
        racks.push(
          <g key={`${row}-${col}-${lv}`} transform={`translate(${x + 140} ${y - lv * 16})`}>
            <path d="M0 0 L22 -11 L44 0 L22 11 Z" className={hot ? "fill-signal" : "fill-primary/25"} />
            <path d="M0 0 L22 11 L22 25 L0 14 Z" className={hot ? "fill-signal/80" : "fill-primary/55"} />
            <path d="M44 0 L22 11 L22 25 L44 14 Z" className={hot ? "fill-signal/60" : "fill-primary/40"} />
          </g>,
        );
      }
    }
  }
  return (
    <svg viewBox="0 0 560 340" role="img" aria-label="Isometric warehouse rack layout" className="h-auto w-full">
      {racks}
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Button asChild size="sm" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-signal" /> Warehouse design studio
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              From order data to a warehouse you can walk through.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              Stackyard turns raw order lines into storage decisions: analyse SKU movement, size the
              racking, and lay out the floor in an interactive 3D studio.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Open the demo <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#modules">See the modules</a>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <RackField />
          </div>
        </section>

        <section id="modules" className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">One workspace, five modules</h2>
            <p className="mt-2 text-muted-foreground">Each module reads the same project data.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m) => (
                <div key={m.title} className="rounded-xl border bg-card p-5">
                  <m.icon className="size-5 text-primary dark:text-signal" />
                  <h3 className="mt-3 font-medium">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>Stackyard: a portfolio project. All companies and data are fictional.</span>
          <span>Next.js · Drizzle · Neon · Three.js</span>
        </div>
      </footer>
    </div>
  );
}
