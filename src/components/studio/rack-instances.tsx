"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { rowLength, type RackRow } from "@/lib/layout/model";

/*
 * Renders every rack row with three InstancedMeshes (uprights, beams, pallet
 * loads), so the whole field costs three draw calls no matter how many bays.
 * These meshes don't raycast: picking goes through RowHitBoxes instead.
 */

const COLORS = {
  upright: new THREE.Color("#2f5d9e"),
  beam: new THREE.Color("#e8722c"),
  selected: new THREE.Color("#f5b220"),
  hovered: new THREE.Color("#7aa7e8"),
  flagged: new THREE.Color("#d03b3b"),
  palletA: new THREE.Color("#c9a77a"),
  palletB: new THREE.Color("#b89263"),
};

const UPRIGHT_W = 0.09;
const BEAM_H = 0.12;
const BEAM_T = 0.06;

/** Deterministic 0–1 hash so pallet occupancy doesn't flicker between renders. */
function hash01(...parts: (string | number)[]) {
  let h = 2166136261;
  for (const ch of parts.join(":")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

type Part = { row: number; m: THREE.Matrix4 };
type Built = { uprights: Part[]; beams: Part[]; pallets: (Part & { tone: number })[] };

function buildParts(rows: RackRow[]): Built {
  const uprights: Part[] = [];
  const beams: Part[] = [];
  const pallets: Built["pallets"] = [];
  const rowM = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  const place = (list: Part[], row: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    local.compose(p.set(x, y, z), q.identity(), s.set(sx, sy, sz));
    list.push({ row, m: new THREE.Matrix4().multiplyMatrices(rowM, local) });
  };

  rows.forEach((r, ri) => {
    rowM.compose(
      p.set(r.x, 0, r.z),
      new THREE.Quaternion().setFromAxisAngle(yAxis, r.rotation === 90 ? Math.PI / 2 : 0),
      s.set(1, 1, 1),
    );
    const len = rowLength(r);
    const height = r.levels * r.levelHeight;
    const x0 = -len / 2;

    for (let i = 0; i <= r.bays; i++) {
      place(uprights, ri, x0 + i * r.bayWidth, height / 2, 0, UPRIGHT_W, height, r.depth);
    }

    const loadW = Math.min(1.0, r.bayWidth / 2 - 0.15);
    const loadH = Math.min(1.3, r.levelHeight - 0.3);
    const loadD = Math.min(1.2, r.depth + 0.1);
    for (let b = 0; b < r.bays; b++) {
      const cx = x0 + (b + 0.5) * r.bayWidth;
      for (let l = 0; l < r.levels; l++) {
        const y = l * r.levelHeight;
        if (l > 0) {
          for (const side of [-1, 1]) {
            place(beams, ri, cx, y - BEAM_H / 2, side * (r.depth / 2 - BEAM_T / 2), r.bayWidth - UPRIGHT_W, BEAM_H, BEAM_T);
          }
        }
        for (const side of [-1, 1]) {
          const h = hash01(r.id, b, l, side);
          if (h > 0.86) continue; // ~86% occupied
          local.compose(
            p.set(cx + (side * r.bayWidth) / 4, y + 0.02 + loadH / 2, 0),
            q.identity(),
            s.set(loadW, loadH, loadD),
          );
          pallets.push({ row: ri, m: new THREE.Matrix4().multiplyMatrices(rowM, local), tone: h });
        }
      }
    }
    // Top beams to close the frame.
    for (let b = 0; b < r.bays; b++) {
      const cx = x0 + (b + 0.5) * r.bayWidth;
      for (const side of [-1, 1]) {
        place(beams, ri, cx, height - BEAM_H / 2, side * (r.depth / 2 - BEAM_T / 2), r.bayWidth - UPRIGHT_W, BEAM_H, BEAM_T);
      }
    }
  });

  return { uprights, beams, pallets };
}

const box = new THREE.BoxGeometry(1, 1, 1);
const noRaycast = () => null;

function useInstances(
  parts: Part[],
  color: (part: Part, i: number) => THREE.Color,
  deps: unknown[],
) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    parts.forEach((part, i) => {
      mesh.setMatrixAt(i, part.m);
      mesh.setColorAt(i, color(part, i));
    });
    mesh.count = parts.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function RackInstances({
  rows,
  selectedId,
  hoveredId,
  flagged,
  showPallets,
}: {
  rows: RackRow[];
  selectedId: string | null;
  hoveredId: string | null;
  flagged: Set<string>;
  showPallets: boolean;
}) {
  const built = useMemo(() => buildParts(rows), [rows]);

  const frameColor = (base: THREE.Color) => (part: Part) => {
    const id = rows[part.row].id;
    if (id === selectedId) return COLORS.selected;
    if (flagged.has(id)) return COLORS.flagged;
    if (id === hoveredId) return COLORS.hovered;
    return base;
  };

  const uprights = useInstances(built.uprights, frameColor(COLORS.upright), [built, selectedId, hoveredId, flagged]);
  const beams = useInstances(built.beams, frameColor(COLORS.beam), [built, selectedId, hoveredId, flagged]);
  const pallets = useInstances(
    built.pallets,
    (part) => ((part as Built["pallets"][number]).tone > 0.43 ? COLORS.palletA : COLORS.palletB),
    [built],
  );

  // Capacity is fixed per mesh instance, so remount when the layout grows.
  const cap = (n: number) => Math.max(1, Math.ceil(n / 1024) * 1024);

  return (
    <group>
      <instancedMesh
        key={`u${cap(built.uprights.length)}`}
        ref={uprights}
        args={[box, undefined, cap(built.uprights.length)]}
        raycast={noRaycast}
        frustumCulled={false}
      >
        <meshStandardMaterial metalness={0.3} roughness={0.6} />
      </instancedMesh>
      <instancedMesh
        key={`b${cap(built.beams.length)}`}
        ref={beams}
        args={[box, undefined, cap(built.beams.length)]}
        raycast={noRaycast}
        frustumCulled={false}
      >
        <meshStandardMaterial metalness={0.2} roughness={0.5} />
      </instancedMesh>
      <instancedMesh
        key={`p${cap(built.pallets.length)}`}
        ref={pallets}
        args={[box, undefined, cap(built.pallets.length)]}
        raycast={noRaycast}
        visible={showPallets}
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
