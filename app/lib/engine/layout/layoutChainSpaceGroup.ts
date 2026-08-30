import type { FlatRowDirection } from "./flatRowDirection";
import type { StitchType } from "../model/Stitch";

export type ChainSpaceFanPosition = {
  x: number;
  yOffset: number;
  rotation: number;
};

const stitchLift: Partial<Record<StitchType, number>> = {
  slst: 0,
  sc: 0,
  ch: 3,
  hdc: 8,
  dc: 16,
  fpdc: 16,
  bpdc: 16,
  tr: 24,
  dtr: 32,
};

/** Dispose les têtes en éventail autour du centre d'un même arceau. */
export function layoutChainSpaceFan({
  targetX,
  stitchTypes,
  stitchGap,
}: {
  targetX: number;
  stitchTypes: StitchType[];
  stitchGap: number;
}): ChainSpaceFanPosition[] {
  const middle = (stitchTypes.length - 1) / 2;
  const maxDistance = Math.max(1, middle);
  const maxTilt = Math.PI / 10;

  return stitchTypes.map((type, index) => {
    const localPosition = index - middle;
    return {
      x: targetX + localPosition * stitchGap,
      yOffset: -(stitchLift[type] ?? 8),
      rotation: localPosition / maxDistance * maxTilt,
    };
  });
}

export type ChainSpaceGroupLayout = {
  leftCenterX: number;
  rightCenterX: number;
  leftRotation: number;
  rightRotation: number;
  minX: number;
  maxX: number;
};

export function layoutChainSpaceGroup({
  targetX,
  leftCount,
  chainCount,
  rightCount,
  stitchGap,
  direction,
}: {
  targetX: number;
  leftCount: number;
  chainCount: number;
  rightCount: number;
  stitchGap: number;
  direction: FlatRowDirection;
}): ChainSpaceGroupLayout {
  const centerGap = Math.max(30, chainCount * stitchGap);
  const leftWidth = Math.max(0, leftCount - 1) * stitchGap;
  const rightWidth = Math.max(0, rightCount - 1) * stitchGap;
  const tilt = Math.PI / 10;

  return {
    leftCenterX: targetX - centerGap / 2 - leftWidth / 2,
    rightCenterX: targetX + centerGap / 2 + rightWidth / 2,
    leftRotation: direction === "ltr" ? -tilt : tilt,
    rightRotation: direction === "ltr" ? tilt : -tilt,
    minX: targetX - centerGap / 2 - leftWidth,
    maxX: targetX + centerGap / 2 + rightWidth,
  };
}
