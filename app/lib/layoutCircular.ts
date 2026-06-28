import {
  Stitch,
  PositionedStitch,
} from "./types";

const CENTER_X = 350;
const CENTER_Y = 350;

const FIRST_RADIUS = 40;
const MAX_RADIUS = 280;

export function layoutCircular(
  rounds: Stitch[][]
): PositionedStitch[][] {

  const result: PositionedStitch[][] = [];

  const step =
    MAX_RADIUS /
    Math.max(rounds.length, 1);

  rounds.forEach((round, rowIndex) => {

    const radius =
      FIRST_RADIUS + rowIndex * step;

    result[rowIndex] = [];

    round.forEach((stitch, stitchIndex) => {

      let angle =
    (stitchIndex / round.length) *
    Math.PI *
    2;

// Décalage visuel des augmentations

if (
  stitch.symbol === "V" &&
  stitch.parents.length === 1
) {
  angle +=
    stitchIndex % 2 === 0
      ? -0.08
      : 0.08;
}
      result[rowIndex].push({

        ...stitch,

        x:
          CENTER_X +
          Math.cos(angle) * radius,

        y:
          CENTER_Y +
          Math.sin(angle) * radius,

      });

    });

  });

  return result;

}