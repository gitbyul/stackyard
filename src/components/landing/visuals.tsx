/**
 * Small, static SVG previews of each module for the landing page. They are
 * drawn from the same ideas as the real screens (same ABC ramp, same ASME
 * symbols) but with fixed illustrative data, so the page stays a static,
 * zero-JS server render.
 */

import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/fill";

const ABC = { A: "var(--abc-a)", B: "var(--abc-b)", C: "var(--abc-c)" } as const;

type Labels = { t: Dictionary["landing"]["visuals"] };

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className="h-auto w-full">
      {children}
    </svg>
  );
}

/** Pareto curve: 40 SKUs with a long-tail demand, split into A/B/C at 80/95%. */
export function ParetoPreview({ t }: Labels) {
  const n = 40;
  // Exponent 1.4 puts the 80% point at 20% of SKUs, close to the demo data.
  const weights = Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, 1.4));
  const total = weights.reduce((a, b) => a + b, 0);
  let run = 0;
  const pts = [{ x: 0, y: 0, cls: "A" as keyof typeof ABC }];
  weights.forEach((w, i) => {
    const before = run / total;
    run += w;
    pts.push({ x: (i + 1) / n, y: run / total, cls: before < 0.8 ? "A" : before < 0.95 ? "B" : "C" });
  });
  // First point at or past the A cut-off: where the marker and label sit.
  const cut = pts.find((p) => p.y >= 0.8) ?? pts[pts.length - 1];
  const X = (v: number) => 28 + v * 276;
  const Y = (v: number) => 176 - v * 152;
  const segment = (cls: keyof typeof ABC) => {
    const idx = pts.map((p, i) => (p.cls === cls ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) return null;
    const from = Math.max(0, idx[0] - 1);
    const seg = pts.slice(from, idx.at(-1)! + 1);
    const line = seg.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
    const area = `${line} L${X(seg.at(-1)!.x).toFixed(1)} ${Y(0)} L${X(seg[0].x).toFixed(1)} ${Y(0)} Z`;
    return (
      <g key={cls}>
        <path d={area} fill={ABC[cls]} opacity={0.14} />
        <path d={line} fill="none" stroke={ABC[cls]} strokeWidth={2} strokeLinejoin="round" />
      </g>
    );
  };
  return (
    <Frame label={fill(t.pareto, { x: Math.round(cut.x * 100), y: Math.round(cut.y * 100) })}>
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={28} x2={304} y1={Y(v)} y2={Y(v)} stroke="var(--border)" />
          <text x={22} y={Y(v) + 3} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">
            {v * 100}%
          </text>
        </g>
      ))}
      <line x1={28} x2={304} y1={Y(0.8)} y2={Y(0.8)} stroke="var(--muted-foreground)" strokeDasharray="0" opacity={0.4} />
      <text x={302} y={Y(0.8) - 4} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">
        {t.paretoCut}
      </text>
      {(["A", "B", "C"] as const).map(segment)}
      <circle cx={X(cut.x)} cy={Y(cut.y)} r={4} fill="var(--abc-a)" stroke="var(--card)" strokeWidth={2} />
      <text x={X(0.42)} y={Y(0.3)} fontSize={11} fontWeight={600} fill="var(--foreground)">
        {fill(t.pareto, { x: Math.round(cut.x * 100), y: Math.round(cut.y * 100) })}
      </text>
    </Frame>
  );
}

/** Top-down rack rows with one selected row and its inspector badge. */
export function StudioPreview({ t }: Labels) {
  const rows = Array.from({ length: 7 }, (_, r) => r);
  return (
    <Frame label={`${t.studioRow} · ${t.studioPositions}`}>
      <rect x={10} y={10} width={300} height={180} rx={6} fill="var(--muted)" />
      {rows.map((r) => {
        const y = 22 + r * 18 + (r > 0 ? Math.floor((r + 1) / 2) * 6 : 0);
        return [0, 1].map((block) => {
          const selected = r === 3 && block === 0;
          return (
            <g key={`${r}-${block}`}>
              <rect
                x={20 + block * 148}
                y={y}
                width={132}
                height={9}
                rx={1.5}
                fill={selected ? "var(--signal)" : "var(--primary)"}
                opacity={selected ? 1 : 0.55}
              />
              {Array.from({ length: 11 }, (_, b) => (
                <line
                  key={b}
                  x1={20 + block * 148 + b * 12}
                  x2={20 + block * 148 + b * 12}
                  y1={y}
                  y2={y + 9}
                  stroke="var(--card)"
                  strokeWidth={1}
                  opacity={0.7}
                />
              ))}
            </g>
          );
        });
      })}
      {/* dock doors */}
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={30 + i * 32} y={182} width={16} height={6} rx={1} fill="var(--muted-foreground)" />
      ))}
      <g transform="translate(176 92)">
        <rect width={118} height={40} rx={6} fill="var(--card)" stroke="var(--border)" />
        <text x={10} y={16} fontSize={10} fontWeight={600} fill="var(--foreground)">
          {t.studioRow}
        </text>
        <text x={10} y={31} fontSize={9} fill="var(--muted-foreground)">
          {t.studioPositions}
        </text>
      </g>
    </Frame>
  );
}

/** Pallet slots coloured by ABC class, densest near the dock doors. */
export function SlottingPreview({ t }: Labels) {
  const cols = 24;
  const rowsN = 8;
  const cells = [];
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      // Distance from the nearest of three doors along the bottom edge.
      const doorDist = Math.min(...[4, 12, 20].map((d) => Math.abs(c - d))) + (rowsN - 1 - r) * 1.6;
      const cls = doorDist < 3 ? "A" : doorDist < 6.5 ? "B" : doorDist < 10 ? "C" : null;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={22 + c * 12}
          y={24 + r * 18}
          width={10}
          height={12}
          rx={1.5}
          fill={cls ? ABC[cls] : "var(--muted)"}
        />,
      );
    }
  }
  return (
    <Frame label={t.slotting}>
      {cells}
      {[4, 12, 20].map((d) => (
        <rect key={d} x={22 + d * 12 - 6} y={176} width={22} height={7} rx={1.5} fill="var(--muted-foreground)" />
      ))}
      <text x={300} y={16} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--foreground)">
        {t.slotting}
      </text>
    </Frame>
  );
}

/** Weekly performance index for three processes around the benchmark. */
export function ProductivityPreview({ t }: Labels) {
  const series = [
    { label: t.receiving, color: "var(--series-1)", v: [76, 77, 75, 78, 76, 77, 79, 78, 80, 81, 82, 83] },
    { label: t.putaway, color: "var(--series-2)", v: [104, 102, 106, 110, 108, 112, 109, 111, 114, 112, 113, 115] },
    { label: t.picking, color: "var(--series-3)", v: [88, 87, 90, 86, 89, 91, 90, 92, 91, 94, 95, 96] },
  ];
  const X = (i: number) => 34 + i * 24.5;
  const Y = (v: number) => 168 - ((v - 70) / 50) * 148;
  return (
    <Frame label={`${t.receiving}, ${t.putaway}, ${t.picking} · ${t.benchmark} 100`}>
      {[70, 85, 100, 115].map((v) => (
        <g key={v}>
          <line x1={34} x2={304} y1={Y(v)} y2={Y(v)} stroke={v === 100 ? "var(--muted-foreground)" : "var(--border)"} />
          <text x={28} y={Y(v) + 3} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">
            {v}
          </text>
        </g>
      ))}
      <text x={302} y={Y(100) - 4} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">
        {t.benchmark}
      </text>
      {series.map((s, i) => (
        <g key={`legend-${s.label}`} transform={`translate(${40 + i * 88} 194)`}>
          <line x1={0} x2={12} y1={-3} y2={-3} stroke={s.color} strokeWidth={2} strokeLinecap="round" />
          <text x={17} y={0} fontSize={9} fill="var(--muted-foreground)">
            {s.label}
          </text>
        </g>
      ))}
      {series.map((s, k) => (
        <path
          key={k}
          d={s.v.map((v, i) => `${i ? "L" : "M"}${X(i)} ${Y(v).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </Frame>
  );
}

function Symbol({ kind, x, y }: { kind: "op" | "insp" | "move" | "delay" | "store" | "decide"; x: number; y: number }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  return (
    <g transform={`translate(${x} ${y})`} className="text-foreground">
      {kind === "op" && <circle cx={8} cy={8} r={6} {...s} />}
      {kind === "insp" && <rect x={2} y={2} width={12} height={12} {...s} />}
      {kind === "move" && <path d="M2 8h10M8 4l4 4-4 4" {...s} strokeLinecap="round" />}
      {kind === "delay" && <path d="M3 3h5a5 5 0 0 1 0 10H3z" {...s} />}
      {kind === "store" && <path d="M8 2 14 14H2z" {...s} strokeLinejoin="round" />}
      {kind === "decide" && <path d="M8 1 15 8 8 15 1 8z" {...s} strokeLinejoin="round" />}
    </g>
  );
}

/** A short dock-to-dock flow with the critical path highlighted. */
export function ProcessPreview({ t }: Labels) {
  const nodes = [
    { x: 14, y: 36, kind: "delay", label: t.gate },
    { x: 112, y: 36, kind: "op", label: t.unload },
    { x: 210, y: 36, kind: "decide", label: t.count },
    { x: 210, y: 112, kind: "delay", label: t.hold },
    { x: 112, y: 112, kind: "insp", label: t.qc },
    { x: 14, y: 112, kind: "store", label: t.store },
  ] as const;
  const box = (n: (typeof nodes)[number], critical: boolean) => (
    <g key={n.label}>
      <rect
        x={n.x}
        y={n.y}
        width={84}
        height={34}
        rx={6}
        fill="var(--card)"
        stroke={critical ? "var(--signal)" : "var(--border)"}
        strokeWidth={critical ? 2 : 1}
      />
      <Symbol kind={n.kind} x={n.x + 8} y={n.y + 9} />
      <text x={n.x + 30} y={n.y + 21} fontSize={10} fill="var(--foreground)">
        {n.label}
      </text>
    </g>
  );
  const arrow = (d: string, critical: boolean, key: string) => (
    <path key={key} d={d} fill="none" stroke={critical ? "var(--signal)" : "var(--muted-foreground)"} strokeWidth={critical ? 2 : 1.2} markerEnd={critical ? "url(#arrow-hot)" : "url(#arrow)"} />
  );
  return (
    <Frame label={t.process}>
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 8 4 0 8z" fill="var(--muted-foreground)" />
        </marker>
        <marker id="arrow-hot" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 8 4 0 8z" fill="var(--signal)" />
        </marker>
      </defs>
      {arrow("M98 53 H110", true, "a")}
      {arrow("M196 53 H208", true, "b")}
      {arrow("M252 70 V110", true, "c")}
      <text x={258} y={94} fontSize={9} fill="var(--muted-foreground)">
        {t.no}
      </text>
      {arrow("M208 129 H198", true, "d")}
      {arrow("M110 129 H100", true, "e")}
      {nodes.map((n) => box(n, true))}
      <text x={300} y={180} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--foreground)">
        {t.process}
      </text>
    </Frame>
  );
}
