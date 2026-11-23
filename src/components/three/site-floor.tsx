"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { dockPositions, type Floor } from "@/lib/layout/model";

export type CameraView = "perspective" | "top";

/** The bits of drei's MapControls we touch. */
export type Controls = { enabled: boolean; target: THREE.Vector3; update: () => void };

/** Floor, grid, walls, dock doors and the dock staging zone. */
export function SiteFloor({
  floor,
  dockDoors,
  onFloorClick,
}: {
  floor: Floor;
  dockDoors: number;
  /** Called for a click (not a drag) on empty floor. */
  onFloorClick?: () => void;
}) {
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

  const docks = useMemo(() => dockPositions(floor, dockDoors), [floor, dockDoors]);

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[floor.width / 2, 0, floor.depth / 2]}
        onClick={(e) => {
          if (e.delta < 4) onFloorClick?.();
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

/**
 * Frames the whole floor. Re-runs when `requestKey` changes, so a button can
 * ask for the same view again after the user has orbited away.
 */
export function FitCamera({
  floor,
  view,
  requestKey = 0,
}: {
  floor: Floor;
  view: CameraView;
  requestKey?: number;
}) {
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
    const target = new THREE.Vector3(cx, 0, cz);
    const dir =
      view === "top"
        ? new THREE.Vector3(0, 1, 0.0001).normalize()
        : new THREE.Vector3(-0.35, 0.8, 0.9).normalize();

    // Walk the camera back along `dir` until the floor and the tops of the
    // tallest racks all land inside the viewport. A closed-form fit only
    // works for a straight-down view; this handles the oblique one too.
    const cam = camera as THREE.PerspectiveCamera;
    cam.aspect = size.width / size.height;
    const corners = [0, floor.width].flatMap((x) =>
      [0, floor.depth].flatMap((z) => [0, 12].map((y) => new THREE.Vector3(x, y, z))),
    );
    const v = new THREE.Vector3();
    let dist = Math.max(floor.width, floor.depth) * 0.5;
    for (let i = 0; i < 60; i++) {
      cam.position.copy(target).addScaledVector(dir, dist);
      cam.lookAt(target);
      cam.far = dist * 4;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      const fits = corners.every((c) => {
        v.copy(c).project(cam);
        return Math.abs(v.x) <= 0.92 && Math.abs(v.y) <= 0.92;
      });
      if (fits) break;
      dist *= 1.08;
    }
    controls?.target.copy(target);
    controls?.update();
    invalidate();
  }, [view, requestKey, floor, getThree, hasControls, measured]);
  return null;
}
