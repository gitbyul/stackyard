/**
 * How many pallet positions a SKU needs to hold `coverDays` of stock.
 * Dimensions are per case, in mm. A 1.0 × 1.2 × 1.3 m load is filled to 85%
 * (cases rarely tile perfectly).
 */
export const PALLET_VOLUME_MM3 = 1000 * 1200 * 1300;
const FILL = 0.85;
export const MAX_POSITIONS_PER_SKU = 40;

export type SkuDims = {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  unitsPerCase: number;
};

export function unitsPerPallet(d: SkuDims): number {
  const caseVolume = d.lengthMm * d.widthMm * d.heightMm;
  const cases = Math.max(1, Math.floor((PALLET_VOLUME_MM3 * FILL) / caseVolume));
  return cases * Math.max(1, d.unitsPerCase);
}

/** Positions for `coverDays` of average demand; every SKU keeps at least one. */
export function positionsNeeded(d: SkuDims, unitsInPeriod: number, periodDays: number, coverDays: number): number {
  const daily = periodDays > 0 ? unitsInPeriod / periodDays : 0;
  const pallets = Math.ceil((daily * coverDays) / unitsPerPallet(d));
  return Math.min(MAX_POSITIONS_PER_SKU, Math.max(1, pallets));
}
