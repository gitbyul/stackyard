/** A/B cut-off presets offered in the analysis filters (cumulative %). */
export const CUT_PRESETS = [
  { value: "80-95", label: "80 / 95 (standard)" },
  { value: "70-90", label: "70 / 90" },
  { value: "80-90", label: "80 / 90" },
] as const;

export const DEFAULT_CUT = "80-95";
