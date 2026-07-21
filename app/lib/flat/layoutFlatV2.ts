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

const reverse = row % 2 === 1;

const displayRow = reverse
  ? [...rounds[row]].reverse()
  : rounds[row];

displayRow.forEach(
  (stitch, stitchIndex) => {
 
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

          if (!parent) {

            console.error(
              "Parent introuvable",
              {
                row,
                stitchIndex,
                parents: stitch.parents,
                nextRowLength: result[row + 1].length,
              }
            );

            // On place provisoirement la maille
            x = stitchIndex * spacingX;

          } else {

            x = parent.x;

          }

        }

        // ================================
        // Premier rang (aucun parent)
        // ================================

        else {

          x = stitchIndex * spacingX;

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
const SVG_WIDTH = 700;
const CENTER_X = SVG_WIDTH / 2;

for (let row = 0; row < result.length; row++) {

  if (result[row].length === 0) continue;

  const minX = Math.min(...result[row].map(s => s.x));
  const maxX = Math.max(...result[row].map(s => s.x));

  const rowCenter = (minX + maxX) / 2;

  const offset = CENTER_X - rowCenter;

  result[row].forEach(stitch => {
    stitch.x += offset;
  });
const reverse = row % 2 === 1;

if (reverse) {
  const minX = Math.min(...result[row].map(s => s.x));
  const maxX = Math.max(...result[row].map(s => s.x));

  result[row].forEach(stitch => {
    stitch.x = maxX - (stitch.x - minX);
  });
}
}
  return result;

}