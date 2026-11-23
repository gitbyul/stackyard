import { autoLayout } from "./analyze";
import type { Link, MapDoc, Step } from "./model";

type Draft = Omit<Step, "x" | "y" | "role" | "valueAdded"> & { role?: string; valueAdded?: boolean };

/**
 * A typical current-state flow for a pallet-in, case-out DC: inbound with a
 * count check that can branch into a discrepancy hold, then storage and the
 * outbound pick-pack-ship chain. Minutes are per order (per pallet inbound).
 */
export function currentStateTemplate(id: (n: number) => string): MapDoc {
  let n = 0;
  const next = () => id(++n);
  const draft: Draft[] = [
    { id: next(), kind: "delay", label: "Truck waits at gate", minutes: 30, process: null },
    { id: next(), kind: "operation", label: "Unload pallets", minutes: 20, process: "receiving", role: "Receiver" },
    { id: next(), kind: "decision", label: "Count matches ASN?", minutes: 2, process: "receiving", role: "Receiver" },
    { id: next(), kind: "delay", label: "Hold for discrepancy review", minutes: 120, process: null, role: "Inventory control" },
    { id: next(), kind: "inspection", label: "Quality check", minutes: 8, process: "receiving", role: "QC" },
    { id: next(), kind: "transport", label: "Move to reserve", minutes: 6, process: "putaway", role: "Reach truck" },
    { id: next(), kind: "storage", label: "Reserve storage", minutes: 0, process: "putaway" },
    { id: next(), kind: "delay", label: "Wait for order release", minutes: 45, process: null },
    { id: next(), kind: "operation", label: "Pick order lines", minutes: 12, process: "picking", role: "Picker" },
    { id: next(), kind: "transport", label: "Move to pack bench", minutes: 5, process: "picking" },
    { id: next(), kind: "operation", label: "Pack and label", minutes: 6, process: "packing", role: "Packer" },
    { id: next(), kind: "inspection", label: "Weight check", minutes: 1, process: "packing" },
    { id: next(), kind: "delay", label: "Stage at dock", minutes: 60, process: null },
    { id: next(), kind: "operation", label: "Load trailer", minutes: 15, process: "shipping", role: "Loader" },
  ];
  const [gate, unload, count, hold, qc, move, reserve, release, pick, toPack, pack, weigh, stage, load] = draft.map(
    (d) => d.id,
  );

  let l = 0;
  const link = (source: string, target: string, label = ""): Link => ({ id: `link-${++l}`, source, target, label });
  const links = [
    link(gate, unload),
    link(unload, count),
    link(count, qc, "Yes"),
    link(count, hold, "No"),
    link(hold, qc),
    link(qc, move),
    link(move, reserve),
    link(reserve, release),
    link(release, pick),
    link(pick, toPack),
    link(toPack, pack),
    link(pack, weigh),
    link(weigh, stage),
    link(stage, load),
  ];

  const steps: Step[] = draft.map((d) => ({
    ...d,
    x: 0,
    y: 0,
    role: d.role ?? "",
    valueAdded: d.valueAdded ?? d.kind === "operation",
  }));
  return { version: 1, steps: autoLayout(steps, links), links };
}
