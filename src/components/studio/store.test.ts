import { describe, expect, it } from "vitest";

import type { RackRow } from "@/lib/layout/model";
import { createStudioStore } from "./store";

const floor = { width: 50, depth: 40 };
const row = (over: Partial<RackRow> = {}): RackRow => ({
  id: "a",
  name: "R01",
  x: 20,
  z: 10,
  rotation: 0,
  bays: 4,
  levels: 3,
  bayWidth: 2.5,
  depth: 1,
  levelHeight: 1.5,
  ...over,
});

const make = (rows = [row()]) => createStudioStore({ floor, clearHeight: 10, rows });

describe("studio store", () => {
  it("records edits for undo and redo", () => {
    const store = make();
    store.getState().updateRow("a", { bays: 6 });
    store.getState().updateRow("a", { levels: 4 });
    expect(store.getState().rows[0]).toMatchObject({ bays: 6, levels: 4 });

    store.getState().undo();
    expect(store.getState().rows[0]).toMatchObject({ bays: 6, levels: 3 });
    store.getState().undo();
    expect(store.getState().rows[0].bays).toBe(4);
    store.getState().redo();
    expect(store.getState().rows[0].bays).toBe(6);
  });

  it("clears redo history after a new edit", () => {
    const store = make();
    store.getState().updateRow("a", { bays: 6 });
    store.getState().undo();
    store.getState().updateRow("a", { bays: 8 });
    expect(store.getState().future).toEqual([]);
  });

  it("records a drag as a single undo step and snaps to 10 cm", () => {
    const store = make();
    const s = store.getState();
    s.beginDrag("a");
    s.dragTo(21.04, 12.37);
    s.dragTo(25.26, 15.51);
    s.endDrag();
    expect(store.getState().rows[0]).toMatchObject({ x: 25.3, z: 15.5 });
    expect(store.getState().past).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().rows[0]).toMatchObject({ x: 20, z: 10 });
  });

  it("drops the undo step for a click without movement", () => {
    const store = make();
    store.getState().beginDrag("a");
    store.getState().endDrag();
    expect(store.getState().past).toEqual([]);
    expect(store.getState().selectedId).toBe("a");
  });

  it("keeps rows inside the building", () => {
    const store = make();
    store.getState().updateRow("a", { x: -100, z: 999 });
    // Row is 10 m long and 1 m deep, so its centre stops 5 m / 0.5 m from the walls.
    expect(store.getState().rows[0]).toMatchObject({ x: 5, z: 39.5 });
  });

  it("rotates, duplicates and deletes the selection", () => {
    const store = make();
    store.getState().select("a");
    store.getState().rotateSelected();
    expect(store.getState().rows[0].rotation).toBe(90);

    store.getState().duplicateSelected();
    const [orig, copy] = store.getState().rows;
    expect(copy.id).not.toBe(orig.id);
    expect(copy.name).toBe("R02");
    expect(store.getState().selectedId).toBe(copy.id);

    store.getState().removeSelected();
    expect(store.getState().rows.map((r) => r.id)).toEqual(["a"]);
    expect(store.getState().selectedId).toBeNull();
  });

  it("tracks unsaved changes against the last save", () => {
    const store = make();
    const dirty = () => store.getState().rows !== store.getState().savedRows;
    expect(dirty()).toBe(false);
    store.getState().updateRow("a", { bays: 5 });
    expect(dirty()).toBe(true);
    store.getState().markSaved(store.getState().rows);
    expect(dirty()).toBe(false);
  });

  it("regenerates a full rack field as one undoable step", () => {
    const store = make();
    store.getState().regenerate();
    expect(store.getState().rows.length).toBeGreaterThan(1);
    store.getState().undo();
    expect(store.getState().rows.map((r) => r.id)).toEqual(["a"]);
  });
});
