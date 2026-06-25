import {
  Stitch,
  PositionedStitch,
} from "./types";

export function layoutFlat(
  rounds: Stitch[][]
): PositionedStitch[][] {

  const spacingX = 50;
  const spacingY = 70;

  const result: PositionedStitch[][] = [];

  // ====================================
  // Dernier rang
  // ====================================

  const lastRow =
    rounds.length - 1;

  result[lastRow] = [];

  rounds[lastRow].forEach(
    (stitch, i) => {

      result[lastRow].push({
        ...stitch,
        x: i * spacingX,
        y: lastRow * spacingY,
      });

    }
  );

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

        const children =
          result[row + 1].filter(
            child =>
              child.parents.includes(
                stitchIndex
              )
          );

        let x = 0;

        if (children.length === 0) {

          x =
            stitchIndex *
            spacingX;

        } else if (
          children.length === 1
        ) {

          x =
            children[0].x;

        } else {

          x =
            (
              children[0].x +
              children[
                children.length - 1
              ].x
            ) / 2;

        }

        result[row].push({
          ...stitch,
          x,
          y: row * spacingY,
        });

      }
    );
  }

  return result;
}