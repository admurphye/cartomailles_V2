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

       const nextRow = result[row + 1];
const nextRowHasDecrease =
  nextRow.some(
    child => child.consumes === 2
  );

if (
  nextRowHasDecrease &&
  row === 0
) {

  result[row].push({
    ...stitch,
    x: stitchIndex * spacingX,
    y: row * spacingY,
  });

  return;
}
const children =
  nextRow.filter(
    child =>
      child.parents.includes(
        stitchIndex
      )
  );

// Cas diminution
if (
  stitch.consumes === 2 &&
  stitch.parents.length === 2
) {

  const x =
    (
      stitch.parents[0] * spacingX +
      stitch.parents[1] * spacingX
    ) / 2;
console.log(
  "DIM",
  stitchIndex,
  "X",
  x
);
  result[row].push({
    ...stitch,
    x,
    y: row * spacingY,
  });

  return;
}
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