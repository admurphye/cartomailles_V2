import {
  Stitch,
  PositionedStitch,
} from "../types";

export const ROW_SPACING = 40;

export function layoutFlatV2(
  rounds: Stitch[][]
): PositionedStitch[][] {

  if (!rounds || rounds.length === 0) {
    return [];
  }

  const spacingX = 50;
  const spacingY = ROW_SPACING;
  const BASE_Y = 700;

  const result: PositionedStitch[][] = [];

  // ====================================
  // Placement du dernier rang
  // ====================================

  const lastRow = rounds.length - 1;

  result[lastRow] = [];

  rounds[lastRow].forEach((stitch, index) => {

    result[lastRow].push({
      ...stitch,
      x: index * spacingX,
      y: BASE_Y - lastRow * spacingY,
    });

  });

  // ====================================
  // Remonter les rangs
  // ====================================

  for (
    let row = lastRow - 1;
    row >= 0;
    row--
  ) {

    result[row] = [];

    rounds[row].forEach(
      (stitch, stitchIndex) => {
 console.log(
    "ROW",
    row,
    "STITCH",
    stitchIndex,
    stitch.symbol,
    stitch.parents
  );
        let x = 0;

        const parentCount =
          stitch.parents.length;

        // ================================
        // Diminution
        // ================================

        if (parentCount === 2) {

          const leftParent =
            result[row + 1][stitch.parents[0]];

          const rightParent =
            result[row + 1][stitch.parents[1]];

          x =
            (
              leftParent.x +
              rightParent.x
            ) / 2;

        }

        // ================================
        // Maille normale
        // ================================

        else if (parentCount === 1) {

          const parent =
            result[row + 1][stitch.parents[0]];

          x = parent.x;

        }

        // ================================
        // Premier rang
        // ================================

        else {

          x =
            stitchIndex *
            spacingX;

        }

        result[row].push({

          ...stitch,

          x,

          y:
            BASE_Y -
            row * spacingY,

        });

      }

    );

  }

  return result;

}