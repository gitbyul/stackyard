/**
 * Process map model. Steps use the classic flow-process-chart categories
 * (ASME): operation, inspection, transport, delay and storage, plus a
 * decision for branching. Steps can link to a productivity process so the
 * map and the labour benchmarks talk about the same work.
 */
import { z } from "zod";

import { PROCESSES } from "@/lib/productivity/benchmarks";

export const STEP_KINDS = ["operation", "inspection", "transport", "delay", "storage", "decision"] as const;
export type StepKind = (typeof STEP_KINDS)[number];

/** Behaviour per step kind; the labels and hints live in the UI dictionaries. */
export const STEP_INFO: Record<StepKind, { valueAddedByDefault: boolean }> = {
  operation: { valueAddedByDefault: true },
  inspection: { valueAddedByDefault: false },
  transport: { valueAddedByDefault: false },
  delay: { valueAddedByDefault: false },
  storage: { valueAddedByDefault: false },
  decision: { valueAddedByDefault: false },
};

export const stepSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(STEP_KINDS),
  label: z.string().min(1).max(60),
  x: z.number().finite(),
  y: z.number().finite(),
  /** Typical minutes per order (or per pallet for inbound). */
  minutes: z.number().min(0).max(10_000),
  valueAdded: z.boolean(),
  process: z.enum(PROCESSES).nullable(),
  role: z.string().max(40).default(""),
});
export type Step = z.infer<typeof stepSchema>;

export const linkSchema = z.object({
  id: z.string().min(1).max(64),
  source: z.string().min(1).max(64),
  target: z.string().min(1).max(64),
  label: z.string().max(40).default(""),
});
export type Link = z.infer<typeof linkSchema>;

export const mapDocSchema = z
  .object({
    version: z.literal(1),
    steps: z.array(stepSchema).max(300),
    links: z.array(linkSchema).max(600),
  })
  .refine(
    (d) => {
      const ids = new Set(d.steps.map((s) => s.id));
      return ids.size === d.steps.length && d.links.every((l) => ids.has(l.source) && ids.has(l.target));
    },
    { message: "Step ids must be unique and every link must connect existing steps." },
  );
export type MapDoc = z.infer<typeof mapDocSchema>;
