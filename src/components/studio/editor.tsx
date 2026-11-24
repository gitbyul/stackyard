"use client";

import {
  Box,
  Copy,
  LoaderCircle,
  Map as MapIcon,
  Plus,
  Redo2,
  Rotate3d,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveLayout } from "@/app/[lang]/(app)/studio/[layoutId]/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fill, useI18n } from "@/i18n/client";
import type { RackRow } from "@/lib/layout/model";
import { layoutStats } from "@/lib/layout/stats";
import { Inspector } from "./inspector";
import { RowList } from "./row-list";
import { createStudioStore, StudioContext, useStudio, useStudioApi } from "./store";

// WebGL only runs in the browser.
const StudioScene = dynamic(() => import("./scene").then((m) => m.StudioScene), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export type EditorLayout = {
  id: string;
  name: string;
  floorWidth: number;
  floorDepth: number;
  rows: RackRow[];
  clearHeight: number;
  dockDoors: number;
};

function ToolButton({
  label,
  shortcut,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={pressed ? "secondary" : "ghost"}
          size="icon"
          className="size-8"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <kbd className="ml-2 font-mono text-[10px] opacity-70">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Toolbar({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  const s = useStudio((st) => st);
  const { t: dict } = useI18n();
  const t = dict.studio.toolbar;
  const mod = isMac() ? "⌘" : "Ctrl+";
  const hasSel = s.selectedId !== null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-3 py-1.5">
      <ToolButton label={t.undo} shortcut={`${mod}Z`} onClick={s.undo} disabled={s.past.length === 0}>
        <Undo2 />
      </ToolButton>
      <ToolButton label={t.redo} shortcut={`${mod}⇧Z`} onClick={s.redo} disabled={s.future.length === 0}>
        <Redo2 />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton label={t.add} shortcut="N" onClick={s.addRow}>
        <Plus />
      </ToolButton>
      <ToolButton label={t.duplicate} shortcut={`${mod}D`} onClick={s.duplicateSelected} disabled={!hasSel}>
        <Copy />
      </ToolButton>
      <ToolButton label={t.rotate} shortcut="R" onClick={s.rotateSelected} disabled={!hasSel}>
        <RotateCw />
      </ToolButton>
      <ToolButton label={t.remove} shortcut="Del" onClick={s.removeSelected} disabled={!hasSel}>
        <Trash2 />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton
        label={t.regenerate}
        onClick={() => {
          if (window.confirm(t.regenerateConfirm)) s.regenerate();
        }}
      >
        <Wand2 />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton label={t.pallets} shortcut="P" onClick={s.togglePallets} pressed={s.showPallets}>
        <Box />
      </ToolButton>
      <ToolButton label={dict.common.topView} shortcut="T" onClick={() => s.requestCamera("top")}>
        <MapIcon />
      </ToolButton>
      <ToolButton label={dict.common.perspectiveView} shortcut="V" onClick={() => s.requestCamera("perspective")}>
        <Rotate3d />
      </ToolButton>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
          {saving ? dict.common.saving : dirty ? dict.common.unsaved : dict.common.allSaved}
        </span>
        <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />} {dict.common.save}
        </Button>
      </div>
    </div>
  );
}

function useShortcuts(onSave: () => void) {
  const api = useStudioApi();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Leave typing in form fields alone. The target isn't always an element.
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, select, [contenteditable='true']")) return;
      const s = api.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const step = e.shiftKey ? 1 : 0.1;

      const handled = (() => {
        if (mod && key === "z") return e.shiftKey ? s.redo() : s.undo(), true;
        if (mod && key === "y") return s.redo(), true;
        if (mod && key === "s") return onSave(), true;
        if (mod && key === "d") return s.duplicateSelected(), true;
        if (mod) return false;
        switch (key) {
          case "delete":
          case "backspace":
            return s.removeSelected(), true;
          case "escape":
            return s.select(null), true;
          case "r":
            return s.rotateSelected(), true;
          case "n":
            return s.addRow(), true;
          case "p":
            return s.togglePallets(), true;
          case "t":
            return s.requestCamera("top"), true;
          case "v":
            return s.requestCamera("perspective"), true;
          case "arrowleft":
            return s.nudgeSelected(-step, 0), true;
          case "arrowright":
            return s.nudgeSelected(step, 0), true;
          case "arrowup":
            return s.nudgeSelected(0, -step), true;
          case "arrowdown":
            return s.nudgeSelected(0, step), true;
        }
        return false;
      })();
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, onSave]);
}

function EditorBody({ layout }: { layout: EditorLayout }) {
  const api = useStudioApi();
  const rows = useStudio((s) => s.rows);
  const floor = useStudio((s) => s.floor);
  const dirty = useStudio((s) => s.rows !== s.savedRows);
  const dragging = useStudio((s) => s.draggingId !== null);
  const [saving, startSaving] = useTransition();
  const { t: dict } = useI18n();

  // Recompute checks after a drag ends, not on every pointer move.
  const [settledRows, setSettledRows] = useState(rows);
  if (!dragging && settledRows !== rows) setSettledRows(rows);
  const stats = useMemo(() => layoutStats(settledRows, floor), [settledRows, floor]);

  const onSave = () => {
    const snapshot = api.getState().rows;
    if (snapshot === api.getState().savedRows) return;
    startSaving(async () => {
      const res = await saveLayout(layout.id, { version: 1, rows: snapshot });
      if (res.ok) {
        api.getState().markSaved(snapshot);
        toast.success(dict.studio.saved);
      } else {
        toast.error(dict.studio.errors[res.error]);
      }
    });
  };
  useShortcuts(onSave);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Toolbar onSave={onSave} saving={saving} dirty={dirty} />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[12rem_minmax(0,1fr)_19rem]">
        <aside className="hidden min-h-0 flex-col border-r xl:flex">
          <RowList flagged={stats.flagged} />
        </aside>
        <div className="relative h-[60svh] min-h-0 min-w-0 lg:h-auto">
          <StudioScene dockDoors={layout.dockDoors} flagged={stats.flagged} />
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
            {fill(dict.studio.hint, { w: floor.width, d: floor.depth })}
          </div>
        </div>
        <aside className="min-h-0 overflow-y-auto border-t lg:border-l lg:border-t-0">
          <Inspector stats={stats} clearHeight={layout.clearHeight} />
        </aside>
      </div>
    </div>
  );
}

export function StudioEditor({ layout }: { layout: EditorLayout }) {
  const [store] = useState(() =>
    createStudioStore({
      floor: { width: layout.floorWidth, depth: layout.floorDepth },
      clearHeight: layout.clearHeight,
      rows: layout.rows,
    }),
  );
  return (
    <StudioContext value={store}>
      <EditorBody layout={layout} />
    </StudioContext>
  );
}
