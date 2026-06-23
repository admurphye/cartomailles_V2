import { Stitch } from "./types";

export type PositionedStitch = Stitch & {
  x: number;
  y: number;
};

export function layoutFlat(
  rounds: Stitch[][]
): PositionedStitch[][] {

  const spacingX = 40;
  const spacingY = 60;

  const result: PositionedStitch[][] = [];

  rounds.forEach((round, rowIndex) => {

    const positionedRound: PositionedStitch[] = [];

    round.forEach((stitch, stitchIndex) => {

      let x = stitchIndex * spacingX;

      if (
        rowIndex > 0 &&
        stitch.parents.length > 0
      ) {
        const parentIndex =
          stitch.parents[0];

        const parent =
          result[rowIndex - 1]?.[parentIndex];

        if (parent) {
          x = parent.x;
        }
      }
if (
  stitch.symbol === "V" &&
  rowIndex > 0
) {
  x += spacingX / 2;
}
      positionedRound.push({
        ...stitch,
        x,
        y: rowIndex * spacingY,
      });

    });

    result.push(positionedRound);

  });

  return result;
}