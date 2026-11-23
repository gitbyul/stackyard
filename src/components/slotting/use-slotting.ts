"use client";

import { useEffect, useRef, useState } from "react";

import { runSlotting, type SlottingRequest, type SlottingResponse } from "@/lib/slotting/run";

type Result = {
  response: SlottingResponse;
  ms: number;
  inWorker: boolean;
  /** The request this result answers; compared by identity. */
  forRequest: SlottingRequest;
};

/**
 * Runs the slotting solver in a Web Worker and returns the latest result,
 * keeping the previous one on screen while a new request is in flight.
 * Stale responses are dropped. Falls back to the main thread if workers
 * aren't available. Pass a memoised `request`: each new object re-runs.
 */
export function useSlotting(request: SlottingRequest) {
  const [worker, setWorker] = useState<Worker | null | undefined>(undefined);
  const seq = useRef(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let w: Worker | null = null;
    try {
      w = new Worker(new URL("../../lib/slotting/slotting.worker.ts", import.meta.url), { type: "module" });
    } catch {
      w = null;
    }
    // Subscribing to an external system (the worker) is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorker(w);
    return () => w?.terminate();
  }, []);

  useEffect(() => {
    if (worker === undefined) return; // not created yet
    const id = ++seq.current;

    if (worker === null) {
      // Defer so the pending state paints before the main thread is busy.
      const t = setTimeout(() => {
        const started = performance.now();
        const response = runSlotting(request);
        if (id === seq.current) {
          setResult({ response, ms: performance.now() - started, inWorker: false, forRequest: request });
        }
      }, 0);
      return () => clearTimeout(t);
    }

    const onMessage = (e: MessageEvent<{ id: number; response: SlottingResponse; ms: number }>) => {
      if (e.data.id !== seq.current) return;
      setResult({ response: e.data.response, ms: e.data.ms, inWorker: true, forRequest: request });
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, request });
    return () => worker.removeEventListener("message", onMessage);
  }, [worker, request]);

  return {
    response: result?.response ?? null,
    ms: result?.ms ?? null,
    inWorker: result?.inWorker ?? false,
    running: result?.forRequest !== request,
  };
}
