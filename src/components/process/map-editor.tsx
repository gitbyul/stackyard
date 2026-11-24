"use client";

import "@xyflow/react/dist/style.css";

import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { AlertTriangle, CheckCircle2, History, LayoutGrid, LoaderCircle, RotateCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveMapVersion, type SavedVersion } from "@/app/[lang]/(app)/process/[mapId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { analyzeFlow, autoLayout } from "@/lib/process-map/analyze";
import { fill, useI18n } from "@/i18n/client";
import { formatMinutes } from "@/lib/process-map/format";
import { STEP_INFO, STEP_KINDS, type Link, type MapDoc, type Step, type StepKind } from "@/lib/process-map/model";
import { PROCESSES, type Process } from "@/lib/productivity/benchmarks";
import { cn } from "@/lib/utils";
import { StepNode, StepSymbol, type StepData, type StepNodeType } from "./step-node";

const nodeTypes = { step: StepNode };

/* ---------- conversion between the stored document and React Flow ---------- */

function toNodes(doc: MapDoc): StepNodeType[] {
  return doc.steps.map(({ id, x, y, ...data }) => ({ id, type: "step", position: { x, y }, data }));
}
function toEdges(doc: MapDoc): Edge[] {
  return doc.links.map((l) => ({ id: l.id, source: l.source, target: l.target, label: l.label || undefined }));
}
function toDoc(nodes: StepNodeType[], edges: Edge[]): MapDoc {
  const steps: Step[] = nodes.map((n) => ({
    id: n.id,
    kind: n.data.kind,
    label: n.data.label,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    minutes: n.data.minutes,
    valueAdded: n.data.valueAdded,
    process: n.data.process,
    role: n.data.role,
  }));
  const links: Link[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : "",
  }));
  return { version: 1, steps, links };
}
/**
 * Fingerprint for "unsaved changes". Round-trips through the editor's own
 * conversion first: Postgres jsonb reorders object keys, so a document read
 * back from the database must be normalised before it's compared.
 */
const fingerprint = (input: MapDoc) => {
  const d = toDoc(toNodes(input), toEdges(input));
  return JSON.stringify({
    s: [...d.steps].sort((a, b) => a.id.localeCompare(b.id)),
    l: [...d.links].sort((a, b) => a.id.localeCompare(b.id)),
  });
};

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

/* ---------------------------------- inspector ---------------------------------- */

function StepFields({ node, onChange }: { node: StepNodeType; onChange: (patch: Partial<StepData>) => void }) {
  const d = node.data;
  const { t: dict } = useI18n();
  const t = dict.process;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="step-label" className="text-xs text-muted-foreground">
          {t.fields.label}
        </Label>
        <Input
          key={`${node.id}-label`}
          id="step-label"
          defaultValue={d.label}
          maxLength={60}
          className="h-8"
          onBlur={(e) => {
            const v = e.currentTarget.value.trim();
            if (v && v !== d.label) onChange({ label: v });
            else e.currentTarget.value = d.label;
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="step-kind" className="text-xs text-muted-foreground">
          {t.fields.type}
        </Label>
        <Select value={d.kind} onValueChange={(v) => onChange({ kind: v as StepKind })}>
          <SelectTrigger id="step-kind" className="h-8 w-full">
            <SelectValue>
              <span className="flex items-center gap-2">
                <StepSymbol kind={d.kind} className="size-4" /> {t.kinds[d.kind].label}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STEP_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                <StepSymbol kind={k} className="size-4" /> {t.kinds[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="step-min" className="text-xs text-muted-foreground">
            {t.fields.minutes}
          </Label>
          <Input
            key={`${node.id}-min-${d.minutes}`}
            id="step-min"
            type="number"
            min={0}
            step={1}
            defaultValue={d.minutes}
            className="h-8 tabular-nums"
            onBlur={(e) => {
              const v = Number(e.currentTarget.value);
              if (Number.isFinite(v) && v >= 0 && v <= 10_000 && v !== d.minutes) onChange({ minutes: v });
              else e.currentTarget.value = String(d.minutes);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="step-role" className="text-xs text-muted-foreground">
            {t.fields.role}
          </Label>
          <Input
            key={`${node.id}-role`}
            id="step-role"
            defaultValue={d.role}
            maxLength={40}
            className="h-8"
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== d.role) onChange({ role: v });
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="step-process" className="text-xs text-muted-foreground">
          {t.fields.process}
        </Label>
        <Select
          value={d.process ?? "none"}
          onValueChange={(v) => onChange({ process: v === "none" ? null : (v as Process) })}
        >
          <SelectTrigger id="step-process" className="h-8 w-full">
            <SelectValue>{d.process ? dict.processes[d.process].label : t.fields.notLinked}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.fields.notLinked}</SelectItem>
            {PROCESSES.map((p) => (
              <SelectItem key={p} value={p}>
                {dict.processes[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={d.valueAdded}
          onChange={(e) => onChange({ valueAdded: e.target.checked })}
          className="size-4 accent-[var(--primary)]"
        />
        {t.fields.valueAdded}
      </label>
      <p className="text-xs text-muted-foreground">{t.kinds[d.kind].hint}</p>
    </div>
  );
}

/* ------------------------------------ editor ------------------------------------ */

export type MapEditorProps = {
  mapId: string;
  versions: SavedVersion[];
};

function Editor({ mapId, versions: initialVersions }: MapEditorProps) {
  const latest = initialVersions[0]?.doc ?? { version: 1 as const, steps: [], links: [] };
  const [nodes, setNodes, onNodesChange] = useNodesState<StepNodeType>(toNodes(latest));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toEdges(latest));
  const [versions, setVersions] = useState(initialVersions);
  const [savedPrint, setSavedPrint] = useState(() => fingerprint(latest));
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("step");
  const selectionKey = useRef("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [saving, startSaving] = useTransition();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const { t: dict, fmt } = useI18n();
  const t = dict.process;

  // Fit once the nodes have been measured; the fitView prop can run before
  // node sizes and the surrounding layout are known.
  const initialized = useNodesInitialized();
  useEffect(() => {
    if (initialized) fitView({ padding: 0.15 });
  }, [initialized, fitView]);

  const doc = useMemo(() => toDoc(nodes, edges), [nodes, edges]);
  const analysis = useMemo(() => analyzeFlow(doc), [doc]);
  const dirty = fingerprint(doc) !== savedPrint;

  const critical = useMemo(() => new Set(analysis.criticalPath), [analysis]);
  const criticalLinks = useMemo(() => new Set(analysis.criticalLinks), [analysis]);
  const flagged = useMemo(
    () => new Set(analysis.issues.flatMap((i) => ("stepIds" in i ? i.stepIds : []))),
    [analysis],
  );

  // Decorate nodes and edges with analysis results for display only.
  const viewNodes = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, critical: critical.has(n.id), flagged: flagged.has(n.id) } })),
    [nodes, critical, flagged],
  );
  const viewEdges = useMemo(
    () =>
      edges.map((e) => {
        const hot = criticalLinks.has(e.id);
        return {
          ...e,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: hot ? "var(--signal)" : "var(--muted-foreground)" },
          style: { stroke: hot ? "var(--signal)" : "var(--muted-foreground)", strokeWidth: hot ? 2.5 : 1.5 },
          labelStyle: { fontSize: 11, fill: "var(--foreground)" },
          labelBgStyle: { fill: "var(--card)" },
        };
      }),
    [edges, criticalLinks],
  );

  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = edges.find((e) => e.selected);

  const patchNode = (id: string, patch: Partial<StepData>) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      setEdges((es) =>
        es.some((e) => e.source === c.source && e.target === c.target) ? es : addEdge({ ...c, id: uid("link") }, es),
      );
    },
    [setEdges],
  );

  const addStep = (kind: StepKind) => {
    // Drop new steps in the middle of the visible canvas, not the window.
    const rect = canvasRef.current?.getBoundingClientRect();
    const center = screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });
    const id = uid("step");
    const node: StepNodeType = {
      id,
      type: "step",
      position: { x: center.x - 96, y: center.y - 30 },
      selected: true,
      data: {
        kind,
        label: fill(t.newStep, { kind: t.kinds[kind].label.toLowerCase() }),
        minutes: 5,
        valueAdded: STEP_INFO[kind].valueAddedByDefault,
        process: null,
        role: "",
      },
    };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), node]);
    setTab("step");
  };

  const arrange = () => {
    const placed = new Map(autoLayout(doc.steps, doc.links).map((s) => [s.id, s]));
    setNodes((ns) => ns.map((n) => ({ ...n, position: { x: placed.get(n.id)!.x, y: placed.get(n.id)!.y } })));
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
  };

  const deleteSelection = () => {
    const ids = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
    setEdges((es) => es.filter((e) => !e.selected && !ids.has(e.source) && !ids.has(e.target)));
  };

  const load = (v: SavedVersion) => {
    setNodes(toNodes(v.doc));
    setEdges(toEdges(v.doc));
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
    toast.message(fill(t.versions.loaded, { n: v.number }));
  };

  const save = () => {
    if (!dirty || saving) return;
    const snapshot = doc;
    startSaving(async () => {
      const res = await saveMapVersion(mapId, snapshot, note);
      if (!res.ok) {
        toast.error(t.errors[res.error]);
        return;
      }
      setVersions((vs) => [res.version, ...vs]);
      setSavedPrint(fingerprint(snapshot));
      setNote("");
      toast.success(fill(t.versions.saved, { n: res.version.number }));
    });
  };

  // Cmd/Ctrl+S saves; warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b px-3 py-1.5">
        <span className="mr-1 text-xs text-muted-foreground">{t.toolbar.add}</span>
        {STEP_KINDS.map((k) => (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => addStep(k)} aria-label={fill(t.toolbar.addKind, { kind: t.kinds[k].label })}>
                <StepSymbol kind={k} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t.kinds[k].label}: {t.kinds[k].hint}
            </TooltipContent>
          </Tooltip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={arrange}>
          <LayoutGrid /> {t.toolbar.arrange}
        </Button>
        <Button variant="ghost" size="sm" onClick={deleteSelection} disabled={!selectedNode && !selectedEdge}>
          <Trash2 /> {t.toolbar.remove}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
            {saving ? dict.common.saving : dirty ? dict.common.unsaved : fill(dict.common.version, { n: versions[0]?.number ?? 0 })}
          </span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.toolbar.notePlaceholder}
            maxLength={200}
            className="h-8 w-full sm:w-56"
            aria-label={t.toolbar.noteLabel}
          />
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />} {t.toolbar.saveVersion}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div ref={canvasRef} className="relative h-[60svh] min-w-0 lg:h-auto">
          <ReactFlow
            nodes={viewNodes}
            edges={viewEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={({ nodes: ns, edges: es }) => {
              // React Flow reports selection on every nodes update (we pass
              // decorated copies), so only react when the selection changes.
              const key = [...ns.map((n) => n.id), ...es.map((e) => e.id)].sort().join(",");
              if (key === selectionKey.current) return;
              selectionKey.current = key;
              if (key) setTab("step");
            }}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            // A dock-to-dock flow runs wide; allow zooming out far enough to see it whole.
            minZoom={0.1}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
            snapToGrid
            snapGrid={[10, 10]}
            proOptions={{ hideAttribution: true }}
            colorMode="light"
            ariaLabelConfig={{
              "node.a11yDescription.default": dict.a11y.flow.node,
              "node.a11yDescription.keyboardDisabled": dict.a11y.flow.nodeKeyboardDisabled,
              "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) =>
                fill(dict.a11y.flow.nodeMoved, { direction, x, y }),
              "edge.a11yDescription.default": dict.a11y.flow.edge,
              "controls.ariaLabel": dict.a11y.flow.controls,
              "controls.zoomIn.ariaLabel": dict.a11y.flow.zoomIn,
              "controls.zoomOut.ariaLabel": dict.a11y.flow.zoomOut,
              "controls.fitView.ariaLabel": dict.a11y.flow.fitView,
              "controls.interactive.ariaLabel": dict.a11y.flow.interactive,
              "minimap.ariaLabel": dict.a11y.flow.minimap,
              "handle.ariaLabel": dict.a11y.flow.handle,
            }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
          <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
            {t.canvasHint}
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-t lg:border-l lg:border-t-0">
          <Tabs value={tab} onValueChange={setTab} className="gap-0">
            <TabsList className="m-3 grid w-[calc(100%-1.5rem)] grid-cols-3">
              <TabsTrigger value="step">{t.tabs.edit}</TabsTrigger>
              <TabsTrigger value="analysis">{t.tabs.analysis}</TabsTrigger>
              <TabsTrigger value="versions">{t.tabs.versions}</TabsTrigger>
            </TabsList>

            <TabsContent value="step" className="px-4 pb-4">
              {selectedNode ? (
                <StepFields node={selectedNode} onChange={(patch) => patchNode(selectedNode.id, patch)} />
              ) : selectedEdge ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    {labelOf(selectedEdge.source)} → {labelOf(selectedEdge.target)}
                  </p>
                  <Label htmlFor="edge-label" className="text-xs text-muted-foreground">
                    {t.fields.linkLabel}
                  </Label>
                  <Input
                    key={selectedEdge.id}
                    id="edge-label"
                    defaultValue={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                    maxLength={40}
                    className="h-8"
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      setEdges((es) => es.map((x) => (x.id === selectedEdge.id ? { ...x, label: v || undefined } : x)));
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.editEmpty}
                </p>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-5 px-4 pb-4">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t.analysis.steps}</dt>
                <dd className="text-right tabular-nums">{doc.steps.length}</dd>
                <dt className="text-muted-foreground">{t.analysis.total}</dt>
                <dd className="text-right tabular-nums">{formatMinutes(t, analysis.totalMinutes)}</dd>
                <dt className="text-muted-foreground">{t.analysis.valueAddedTime}</dt>
                <dd className="text-right tabular-nums">{formatMinutes(t, analysis.valueAddedMinutes)}</dd>
                <dt className="text-muted-foreground">{t.analysis.ratio}</dt>
                <dd className="text-right font-semibold tabular-nums">{Math.round(analysis.valueAddedRatio * 100)}%</dd>
                <dt className="text-muted-foreground">{t.analysis.critical}</dt>
                <dd className="text-right font-semibold tabular-nums">{formatMinutes(t, analysis.criticalMinutes)}</dd>
              </dl>

              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.analysis.byType}</h3>
                <ul className="space-y-1 text-sm">
                  {STEP_KINDS.map((k) => (
                    <li key={k} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <StepSymbol kind={k} className="size-4 text-muted-foreground" />
                        {t.kinds[k].label}
                      </span>
                      <span className="tabular-nums">{analysis.counts[k]}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.analysis.critical}</h3>
                <ol className="space-y-1 text-sm">
                  {analysis.criticalPath.map((id, i) => (
                    <li key={id} className="flex justify-between gap-2">
                      <span className="truncate">
                        <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                        {labelOf(id)}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatMinutes(t, nodes.find((n) => n.id === id)?.data.minutes ?? 0)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.analysis.checks}</h3>
                {analysis.issues.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-chart-4" /> {t.analysis.ok}
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {analysis.issues.map((issue, i) => (
                      <li key={i} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                        {issue.kind === "cycle"
                          ? fill(t.analysis.loop, { steps: issue.stepIds.map(labelOf).join(", ") })
                          : issue.kind === "isolated"
                            ? fill(t.analysis.isolated, { step: labelOf(issue.stepIds[0]) })
                            : t.analysis.noStart}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            <TabsContent value="versions" className="px-4 pb-4">
              <ol className="space-y-2">
                {versions.map((v, i) => (
                  <li key={v.id} className={cn("rounded-md border p-3 text-sm", i === 0 && "border-primary/40")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <History className="size-3.5 text-muted-foreground" />
                        {fill(dict.common.version, { n: v.number })}
                        {i === 0 && <span className="text-xs font-normal text-muted-foreground">{t.versions.latest}</span>}
                      </span>
                      {i > 0 && (
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => load(v)}>
                          <RotateCcw /> {t.versions.load}
                        </Button>
                      )}
                    </div>
                    {v.note && <p className="mt-1 text-muted-foreground">{v.note}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmt.dateTime(v.createdAt)}
                      {v.author && ` · ${v.author}`} · {fill(t.stepsCount, { n: v.doc.steps.length })}
                    </p>
                  </li>
                ))}
              </ol>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

export function MapEditor(props: MapEditorProps) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
