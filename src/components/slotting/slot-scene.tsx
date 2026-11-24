"use client";

import { Html, MapControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { RackInstances } from "@/components/studio/rack-instances";
import { FitCamera, SiteFloor, type CameraView } from "@/components/three/site-floor";
import type { AbcClass } from "@/lib/analysis/abc";
import type { Floor, RackRow } from "@/lib/layout/model";
import type { Location } from "@/lib/slotting/locations";
import type { Assignment } from "@/lib/slotting/solve";
import { fill, useI18n } from "@/i18n/client";

/** Same validated ordinal ramp as the analysis charts (light surface). */
const CLASS_COLOR: Record<AbcClass, THREE.Color> = {
  A: new THREE.Color("#184f95"),
  B: new THREE.Color("#3987e5"),
  C: new THREE.Color("#86b6ef"),
};
const HOVER = new THREE.Color("#f5b220");

type Slot = { loc: Location; a: Assignment };

const box = new THREE.BoxGeometry(1, 1, 1);

/** One pallet load per assigned position, coloured by the SKU's ABC class. */
function SlotLoads({ slots, rows }: { slots: Slot[]; rows: RackRow[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [hover, setHover] = useState<number | null>(null);
  const cap = Math.max(1, Math.ceil(slots.length / 1024) * 1024);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    slots.forEach(({ loc, a }, i) => {
      const r = rows[loc.rowIndex];
      const w = Math.min(1.0, r.bayWidth / 2 - 0.15);
      const h = Math.min(1.3, r.levelHeight - 0.3);
      q.setFromAxisAngle(yAxis, r.rotation === 90 ? Math.PI / 2 : 0);
      m.compose(new THREE.Vector3(loc.x, loc.y + 0.02 + h / 2, loc.z), q, new THREE.Vector3(w, h, Math.min(1.2, r.depth + 0.1)));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, i === hover ? HOVER : CLASS_COLOR[a.sku.cls]);
    });
    mesh.count = slots.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [slots, rows, hover]);

  const hovered = hover !== null ? slots[hover] : null;
  const { t: dict, fmt } = useI18n();
  const t = dict.slotting;
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(e.instanceId ?? null);
  };

  return (
    <>
      <instancedMesh
        key={cap}
        ref={ref}
        args={[box, undefined, cap]}
        onPointerMove={onMove}
        onPointerOut={() => setHover(null)}
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {hovered && (
        <Html position={[hovered.loc.x, hovered.loc.y + 2, hovered.loc.z]} center zIndexRange={[10, 0]}>
          <div className="pointer-events-none w-max rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
            <p className="font-mono font-semibold text-foreground">{hovered.a.sku.code}</p>
            <p className="text-muted-foreground">
              {fill(t.hover.location, { loc: hovered.loc.code, cls: hovered.a.sku.cls })}
            </p>
            <p className="text-muted-foreground">
              {fill(t.hover.detail, { lines: fmt.number(hovered.a.sku.lines), trip: Math.round(hovered.loc.cost) })}
            </p>
          </div>
        </Html>
      )}
    </>
  );
}

const noFlags = new Set<string>();

export function SlotScene({
  rows,
  floor,
  dockDoors,
  locations,
  assignments,
  view,
  viewKey,
}: {
  rows: RackRow[];
  floor: Floor;
  dockDoors: number;
  locations: Location[];
  assignments: Assignment[];
  view: CameraView;
  viewKey: number;
}) {
  const slots = useMemo(
    () => assignments.flatMap((a) => a.locations.map((i) => ({ loc: locations[i], a }))),
    [assignments, locations],
  );

  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 45, near: 0.5, far: 2000 }}>
      <color attach="background" args={["#f7f9fb"]} />
      <hemisphereLight args={["#ffffff", "#c8d0da", 1.6]} />
      <directionalLight position={[floor.width * 0.3, 60, floor.depth * 1.2]} intensity={1.4} />
      <MapControls makeDefault enableDamping={false} maxPolarAngle={Math.PI / 2.1} screenSpacePanning={false} />
      <FitCamera floor={floor} view={view} requestKey={viewKey} />
      <SiteFloor floor={floor} dockDoors={dockDoors} />
      {/* Frames only; the loads come from the slot plan. */}
      <RackInstances rows={rows} selectedId={null} hoveredId={null} flagged={noFlags} showPallets={false} ghost />
      <SlotLoads slots={slots} rows={rows} />
    </Canvas>
  );
}
