import {
  Stitch,
  PositionedStitch,
} from "./types";

export function layoutFlat(
  rounds: Stitch[][]
): PositionedStitch[][] {

  const result: PositionedStitch[][] = [];

  const spacingX = 50;
  const spacingY = 70;

  for (
    let row = 0;
    row < rounds.length;
    row++
  ) {
    const positioned: PositionedStitch[] = [];

    for (
      let i = 0;
      i < rounds[row].length;
      i++
    ) {

      const stitch =
        rounds[row][i];

      let x = i * spacingX;

      if (
  row > 0 &&
  stitch.parents.length > 0
) {

  const parentIndex =
    stitch.parents[0];

  const parent =
    result[row - 1]?.[
      parentIndex
    ];

  if (parent) {

    const previousStitch =
      rounds[row - 1][parentIndex];

    if (
      previousStitch?.produces === 2
    ) {

      const childNumber =
        i % 2;

      x =
        parent.x +
        (childNumber === 0
          ? -15
          : 15);

    } else {

      x = parent.x;

    }
  }
}

      positioned.push({
        ...stitch,
        x,
        y: row * spacingY,
      });
    }

    result.push(positioned);
  }
console.log("LAYOUT", result);
  return result;
}