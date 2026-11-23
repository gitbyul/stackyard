/// <reference lib="webworker" />
import { runSlotting, type SlottingRequest } from "./run";

/** Runs the solver off the main thread so the 3D view stays responsive. */
self.onmessage = (e: MessageEvent<{ id: number; request: SlottingRequest }>) => {
  const started = performance.now();
  const response = runSlotting(e.data.request);
  self.postMessage({ id: e.data.id, response, ms: performance.now() - started });
};
