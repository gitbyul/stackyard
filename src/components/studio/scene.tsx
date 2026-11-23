"use client";

import { Html, MapControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { rowLength, type Floor, type RackRow } from "@/lib/layout/model";
import { RackInstances } from "./rack-instances";
import { useStudio, useStudioApi } from "./store";

/** The bits of drei's MapControls we touch. */
type Controls = { enabled: boolean; target: THREE.Vector3; update: () => void };

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
  const drag = useRef<{ id: string; dx: number; dz: number; moved: boolean } | null>(null);

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
          drag.current.moved = true;
          api.getState().dragTo(p.x + drag.current.dx, p.z + drag.current.dz);
          return;
        }
        e.stopPropagation();
        api.getState().hover(rowAt(e)?.id ?? null);
      }}
      onPointerOut={() => {
        if (!drag.current) api.getState().hover(null);
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
        drag.current = { id: row.id, dx: row.x - p.x, dz: row.z - p.z, moved: false };
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

function FloorAndWalls({ floor, dockDoors }: { floor: Floor; dockDoors: number }) {
  const api = useStudioApi();
  const grid = useMemo(() => {
    const size = Math.ceil(Math.max(floor.width, floor.depth) / 10) * 10;
    const g = new THREE.GridHelper(size, size / 2, "#9aa6b5", "#d5dbe3");
    g.position.set(size / 2, 0.005, size / 2);
    (g.material as THREE.Material).transparent = true;
    (g.material as THREE.Material).opacity = 0.5;
    g.raycast = () => {};
    return g;
  }, [floor]);

  const outline = useMemo(() => {
    const pts = [
      [0, 0],
      [floor.width, 0],
      [floor.width, floor.depth],
      [0, floor.depth],
      [0, 0],
    ].map(([x, z]) => new THREE.Vector3(x, 0.02, z));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [floor]);

  // Dock doors spread evenly along the front wall (z = depth).
  const docks = useMemo(() => {
    const n = Math.max(0, dockDoors);
    const spacing = floor.width / (n + 1);
    return Array.from({ length: n }, (_, i) => spacing * (i + 1));
  }, [floor, dockDoors]);

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[floor.width / 2, 0, floor.depth / 2]}
        onClick={(e) => {
          if (e.delta < 4) api.getState().select(null);
        }}
      >
        <planeGeometry args={[floor.width, floor.depth]} />
        <meshStandardMaterial color="#eef1f5" />
      </mesh>
      <primitive object={grid} />
      <lineSegments geometry={outline}>
        <lineBasicMaterial color="#5b6b80" />
      </lineSegments>
      {/* Dock staging zone hint */}
      <mesh rotation-x={-Math.PI / 2} position={[floor.width / 2, 0.01, floor.depth - 9]} raycast={() => null}>
        <planeGeometry args={[floor.width, 18]} />
        <meshBasicMaterial color="#f5b220" transparent opacity={0.08} />
      </mesh>
      {docks.map((x) => (
        <mesh key={x} position={[x, 1.6, floor.depth + 0.15]} raycast={() => null}>
          <boxGeometry args={[3, 3.2, 0.3]} />
          <meshStandardMaterial color="#5b6b80" />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ floor }: { floor: Floor }) {
  const request = useStudio((s) => s.cameraRequest);
  const getThree = useThree((s) => s.get);
  // Re-run once MapControls has registered itself as the default controls.
  const hasControls = useThree((s) => s.controls !== null);
  // …and once the canvas has been measured; a 0×0 size would give an infinite distance.
  const measured = useThree((s) => s.size.width > 0 && s.size.height > 0);

  useEffect(() => {
    if (!measured) return;
    const { camera, invalidate, size } = getThree();
    const controls = getThree().controls as unknown as Controls | null;
    const cx = floor.width / 2;
    const cz = floor.depth / 2;
    // Distance at which the whole floor fits the viewport for this fov/aspect.
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov ?? 45);
    const aspect = size.width / Math.max(1, size.height);
    const t = Math.tan(fov / 2);
    const fit = Math.max(floor.depth / 2 / t, floor.width / 2 / (t * aspect)) * 1.08;
    if (request.view === "top") {
      camera.position.set(cx, fit, cz + 0.01);
    } else {
      const dir = new THREE.Vector3(-0.35, 0.8, 0.9).normalize();
      camera.position.set(cx + dir.x * fit, dir.y * fit, cz + dir.z * fit);
    }
    camera.far = fit * 4;
    camera.updateProjectionMatrix();
    controls?.target.set(cx, 0, cz);
    controls?.update();
    invalidate();
  }, [request, floor, getThree, hasControls, measured]);
  return null;
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
      <FloorAndWalls floor={floor} dockDoors={dockDoors} />
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
