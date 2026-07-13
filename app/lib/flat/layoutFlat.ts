import {Stitch,PositionedStitch,} from "../types";
export const ROW_SPACING = 40;

export function layoutFlat(
  rounds: Stitch[][]
): PositionedStitch[][] {

  console.log("=== layoutFlat ===");
  console.log(rounds);

  if (!rounds || rounds.length === 0) {
    console.log("Aucun rang");
    return [];
  }

  console.log("Nombre de rangs :", rounds.length);
  console.log("Dernier rang :", rounds[rounds.length - 1]);

  const result: PositionedStitch[][] = [];
const spacingX = 50;
const spacingY = ROW_SPACING;
// Origine du diagramme (rang 1)
const BASE_Y = 700;
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
  y: BASE_Y - lastRow * spacingY,
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
    y: BASE_Y - row * spacingY,
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
    y: BASE_Y - row * spacingY,
  });

  return;
}
let x = 0;

// Cas augmentation
if (stitch.produces === 2) {

  const firstProduced =
    nextRow[stitchIndex * 2];

  const secondProduced =
    nextRow[stitchIndex * 2 + 1];

  if (firstProduced && secondProduced) {

    x =
      (
        firstProduced.x +
        secondProduced.x
      ) / 2;

  } else {

    x = stitchIndex * spacingX;

  }

}

// Cas normal
else if (children.length === 0) {

  x = stitchIndex * spacingX;

}
else {

  x = children[0].x;

}

result[row].push({
  ...stitch,
  x,
  y: BASE_Y - row * spacingY,
});

      }
    );
  }
console.table(
  result[0].map((s, i) => ({
    index: i,
    x: s.x,
    symbol: s.symbol,
  }))
);
  return result;
}