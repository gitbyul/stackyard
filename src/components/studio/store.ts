"use client";

import { createContext, use } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

import { generateRackField } from "@/lib/layout/generate";
import { rowRect, type Floor, type RackRow } from "@/lib/layout/model";

const HISTORY_LIMIT = 100;
export const SNAP = 0.1;

export const snap = (v: number, step = SNAP) => Math.round(v / step) * step;
const round2 = (v: number) => Math.round(v * 100) / 100;

export type StudioState = {
  floor: Floor;
  clearHeight: number;
  rows: RackRow[];
  selectedId: string | null;
  hoveredId: string | null;
  draggingId: string | null;
  past: RackRow[][];
  future: RackRow[][];
  /** Rows as last saved; dirty = rows !== savedRows. */
  savedRows: RackRow[];
  showPallets: boolean;
  /** Bumped to ask the scene to reset its camera. */
  cameraRequest: { view: "perspective" | "top"; n: number };

  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  /** Apply a change and record it for undo. */
  updateRow: (id: string, patch: Partial<RackRow>) => void;
  addRow: () => void;
  duplicateSelected: () => void;
  rotateSelected: () => void;
  removeSelected: () => void;
  nudgeSelected: (dx: number, dz: number) => void;
  regenerate: () => void;
  beginDrag: (id: string) => void;
  /** Move during a drag; recorded once by beginDrag, not per frame. */
  dragTo: (x: number, z: number) => void;
  endDrag: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: (rows: RackRow[]) => void;
  togglePallets: () => void;
  requestCamera: (view: "perspective" | "top") => void;
};

function newId() {
  return `row-${crypto.randomUUID().slice(0, 8)}`;
}

/** Next free "Rnn" name. */
function nextName(rows: RackRow[]) {
  const used = new Set(rows.map((r) => r.name));
  for (let n = rows.length + 1; ; n++) {
    const name = `R${String(n).padStart(2, "0")}`;
    if (!used.has(name)) return name;
  }
}

/** Keep a row's centre such that its footprint stays on the floor. */
function clampToFloor(row: RackRow, floor: Floor): RackRow {
  const r = rowRect({ ...row, x: 0, z: 0 });
  const hx = r.maxX;
  const hz = r.maxZ;
  return {
    ...row,
    x: round2(Math.min(Math.max(row.x, hx), Math.max(hx, floor.width - hx))),
    z: round2(Math.min(Math.max(row.z, hz), Math.max(hz, floor.depth - hz))),
  };
}

export function createStudioStore(init: { floor: Floor; clearHeight: number; rows: RackRow[] }) {
  return createStore<StudioState>()((set, get) => {
    /** Record the current rows for undo, then apply `next`. */
    const commit = (next: RackRow[], extra: Partial<StudioState> = {}) => {
      const { rows, past } = get();
      set({ rows: next, past: [...past, rows].slice(-HISTORY_LIMIT), future: [], ...extra });
    };
    const selected = () => get().rows.find((r) => r.id === get().selectedId);

    return {
      floor: init.floor,
      clearHeight: init.clearHeight,
      rows: init.rows,
      selectedId: null,
      hoveredId: null,
      draggingId: null,
      past: [],
      future: [],
      savedRows: init.rows,
      showPallets: true,
      cameraRequest: { view: "perspective", n: 0 },

      select: (id) => set({ selectedId: id }),
      hover: (id) => {
        if (get().hoveredId !== id) set({ hoveredId: id });
      },

      updateRow: (id, patch) => {
        const { rows, floor } = get();
        commit(rows.map((r) => (r.id === id ? clampToFloor({ ...r, ...patch }, floor) : r)));
      },

      addRow: () => {
        const { rows, floor, clearHeight } = get();
        const template = rows.at(-1);
        const levels = template?.levels ?? Math.max(1, Math.floor((clearHeight - 1) / 1.6));
        const row = clampToFloor(
          {
            id: newId(),
            name: nextName(rows),
            x: floor.width / 2,
            z: floor.depth / 2,
            rotation: 0,
            bays: Math.min(10, Math.max(1, Math.floor((floor.width - 2) / 2.7))),
            levels,
            bayWidth: template?.bayWidth ?? 2.7,
            depth: template?.depth ?? 1.1,
            levelHeight: template?.levelHeight ?? 1.6,
          },
          floor,
        );
        commit([...rows, row], { selectedId: row.id });
      },

      duplicateSelected: () => {
        const src = selected();
        if (!src) return;
        const { rows, floor } = get();
        // Place the copy one aisle (3.2 m) behind the original.
        const offset = src.depth + 3.2;
        const copy = clampToFloor(
          {
            ...src,
            id: newId(),
            name: nextName(rows),
            x: src.rotation === 90 ? src.x + offset : src.x,
            z: src.rotation === 0 ? src.z + offset : src.z,
          },
          floor,
        );
        commit([...rows, copy], { selectedId: copy.id });
      },

      rotateSelected: () => {
        const src = selected();
        if (src) get().updateRow(src.id, { rotation: src.rotation === 0 ? 90 : 0 });
      },

      removeSelected: () => {
        const { rows, selectedId } = get();
        if (!selectedId) return;
        commit(
          rows.filter((r) => r.id !== selectedId),
          { selectedId: null, hoveredId: null },
        );
      },

      nudgeSelected: (dx, dz) => {
        const src = selected();
        if (src) get().updateRow(src.id, { x: round2(src.x + dx), z: round2(src.z + dz) });
      },

      regenerate: () => {
        const { floor, clearHeight } = get();
        let n = 0;
        commit(generateRackField(floor, { clearHeight, id: () => `row-gen-${++n}-${Date.now().toString(36)}` }), {
          selectedId: null,
        });
      },

      beginDrag: (id) => {
        const { rows, past } = get();
        set({
          draggingId: id,
          selectedId: id,
          past: [...past, rows].slice(-HISTORY_LIMIT),
          future: [],
        });
      },
      dragTo: (x, z) => {
        const { rows, draggingId, floor } = get();
        if (!draggingId) return;
        set({
          rows: rows.map((r) => (r.id === draggingId ? clampToFloor({ ...r, x: snap(x), z: snap(z) }, floor) : r)),
        });
      },
      endDrag: () => {
        const { past, rows } = get();
        // A click without movement shouldn't leave an empty undo step.
        if (past.at(-1) === rows || JSON.stringify(past.at(-1)) === JSON.stringify(rows)) {
          set({ past: past.slice(0, -1) });
        }
        set({ draggingId: null });
      },

      undo: () => {
        const { past, future, rows } = get();
        const prev = past.at(-1);
        if (!prev) return;
        set({ rows: prev, past: past.slice(0, -1), future: [rows, ...future] });
      },
      redo: () => {
        const { past, future, rows } = get();
        const next = future[0];
        if (!next) return;
        set({ rows: next, past: [...past, rows], future: future.slice(1) });
      },

      markSaved: (rows) => set({ savedRows: rows }),
      togglePallets: () => set({ showPallets: !get().showPallets }),
      requestCamera: (view) => set({ cameraRequest: { view, n: get().cameraRequest.n + 1 } }),
    };
  });
}

export type StudioStore = StoreApi<StudioState>;

export const StudioContext = createContext<StudioStore | null>(null);

export function useStudio<T>(selector: (s: StudioState) => T): T {
  const store = use(StudioContext);
  if (!store) throw new Error("useStudio must be used inside <StudioContext>");
  return useStore(store, selector);
}

export function useStudioApi(): StudioStore {
  const store = use(StudioContext);
  if (!store) throw new Error("useStudioApi must be used inside <StudioContext>");
  return store;
}
