"use client";

import { Html, MapControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { FitCamera, SiteFloor, type Controls } from "@/components/three/site-floor";
import { rowLength, type Floor, type RackRow } from "@/lib/layout/model";
import { RackInstances } from "./rack-instances";
import { useStudio, useStudioApi } from "./store";

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();

/** Where the pointer ray meets the floor (y = 0), or null if it doesn't. */
function floorPoint(e: ThreeEvent<PointerEvent>) {
  return e.ray.intersectPlane(floorPlane, hitPoint) ? hitPoint.clone() : null;
}

/**
 * One invisible box per row. Picking a few hundred boxes is far cheaper than
 * raycasting tens of thousands of rack parts, and it gives each row a
 * generous hit target. Also drives dragging via pointer capture.
 */
function RowHitBoxes({ rows }: { rows: RackRow[] }) {
  const api = useStudioApi();
  // Read three's live objects at event time rather than mutating hook values.
  const getThree = useThree((s) => s.get);
  const setControlsEnabled = (on: boolean) => {
    const controls = getThree().controls as unknown as Controls | null;
    if (controls) controls.enabled = on;
  };
  const ref = useRef<THREE.InstancedMesh>(null);
  const drag = useRef<{ id: string; dx: number; dz: number } | null>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const y = new THREE.Vector3(0, 1, 0);
    rows.forEach((r, i) => {
      const h = r.levels * r.levelHeight;
      q.setFromAxisAngle(y, r.rotation === 90 ? Math.PI / 2 : 0);
      m.compose(new THREE.Vector3(r.x, h / 2, r.z), q, new THREE.Vector3(rowLength(r) + 0.2, h + 0.2, r.depth + 0.4));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = rows.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [rows]);

  const rowAt = (e: ThreeEvent<PointerEvent>) => (e.instanceId != null ? rows[e.instanceId] : undefined);

  return (
    <instancedMesh
      key={Math.ceil(Math.max(1, rows.length) / 256)}
      ref={ref}
      args={[undefined, undefined, Math.ceil(Math.max(1, rows.length) / 256) * 256]}
      onPointerMove={(e) => {
        if (drag.current) {
          e.stopPropagation();
          const p = floorPoint(e);
          if (!p) return;
          api.getState().dragTo(p.x + drag.current.dx, p.z + drag.current.dz);
          return;
        }
        e.stopPropagation();
        const row = rowAt(e);
        api.getState().hover(row?.id ?? null);
        // MapControls handles pointerdown on the canvas before R3F's handlers
        // run, so it must already be off while the pointer is over a row;
        // otherwise pressing on a row would start a pan instead of a drag.
        setControlsEnabled(!row);
      }}
      onPointerOut={() => {
        if (drag.current) return;
        api.getState().hover(null);
        setControlsEnabled(true);
      }}
      // Clicks on a row must not reach the floor, which clears the selection.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const row = rowAt(e);
        if (!row) return;
        e.stopPropagation();
        const p = floorPoint(e);
        if (!p) return;
        (e.target as Element).setPointerCapture(e.pointerId);
        drag.current = { id: row.id, dx: row.x - p.x, dz: row.z - p.z };
        setControlsEnabled(false);
        api.getState().beginDrag(row.id);
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        e.stopPropagation();
        (e.target as Element).releasePointerCapture(e.pointerId);
        drag.current = null;
        setControlsEnabled(true);
        api.getState().endDrag();
      }}
    >
      <boxGeometry />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  );
}

function CameraRig({ floor }: { floor: Floor }) {
  const request = useStudio((s) => s.cameraRequest);
  return <FitCamera floor={floor} view={request.view} requestKey={request.n} />;
}

function SelectedLabel({ rows, selectedId }: { rows: RackRow[]; selectedId: string | null }) {
  const row = rows.find((r) => r.id === selectedId);
  if (!row) return null;
  return (
    <Html position={[row.x, row.levels * row.levelHeight + 1, row.z]} center zIndexRange={[10, 0]}>
      <span className="pointer-events-none whitespace-nowrap rounded bg-primary px-1.5 py-0.5 font-mono text-[11px] text-primary-foreground shadow">
        {row.name}
      </span>
    </Html>
  );
}

export function StudioScene({ dockDoors, flagged }: { dockDoors: number; flagged: Set<string> }) {
  const api = useStudioApi();
  const floor = useStudio((s) => s.floor);
  const rows = useStudio((s) => s.rows);
  const selectedId = useStudio((s) => s.selectedId);
  const hoveredId = useStudio((s) => s.hoveredId);
  const showPallets = useStudio((s) => s.showPallets);
  const dragging = useStudio((s) => s.draggingId !== null);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.5, far: 2000 }}
      gl={{ antialias: true }}
      style={{ cursor: dragging ? "grabbing" : hoveredId ? "grab" : "default" }}
    >
      <color attach="background" args={["#f7f9fb"]} />
      <hemisphereLight args={["#ffffff", "#c8d0da", 1.6]} />
      <directionalLight position={[floor.width * 0.3, 60, floor.depth * 1.2]} intensity={1.4} />
      <MapControls makeDefault enableDamping={false} maxPolarAngle={Math.PI / 2.1} screenSpacePanning={false} />
      <CameraRig floor={floor} />
      <SiteFloor floor={floor} dockDoors={dockDoors} onFloorClick={() => api.getState().select(null)} />
      <RackInstances
        rows={rows}
        selectedId={selectedId}
        hoveredId={hoveredId}
        flagged={flagged}
        showPallets={showPallets}
      />
      <RowHitBoxes rows={rows} />
      <SelectedLabel rows={rows} selectedId={selectedId} />
    </Canvas>
  );
}
