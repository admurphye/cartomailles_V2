export interface StitchAdjustment {
  stitchId: string;

  offsetX: number;
  offsetY: number;
}

export type StitchAdjustments = Record<
  string,
  StitchAdjustment
>;