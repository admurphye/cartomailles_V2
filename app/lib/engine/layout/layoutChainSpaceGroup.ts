import type { FlatRowDirection } from "./flatRowDirection";

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
