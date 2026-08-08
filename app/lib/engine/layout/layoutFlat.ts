import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedStitch } from "../model/PositionedStitch";
console.log("===== LAYOUT FLAT =====");
const SPACING_X = 50;
const SPACING_Y = 80;
const MARGIN_X = 60;
const MARGIN_Y = 60;

export function layoutFlat(graph: CrochetGraph): PositionedStitch[] {
  
    const positioned: PositionedStitch[] = [];

  const rounds = new Map<number, typeof graph.stitches>();

  for (const stitch of graph.stitches) {
    const row = stitch.round;

    if (!rounds.has(row)) {
      rounds.set(row, []);
    }

    rounds.get(row)!.push(stitch);
  }

  const sortedRows = [...rounds.keys()].sort((a, b) => a - b);

  for (const row of sortedRows) {
  const stitches = rounds.get(row)!;

  const reverse = row % 2 === 0;

  const count = stitches.length;

  // Centre la ligne sur la plus grande
  const maxCount = Math.max(
    ...sortedRows.map(r => rounds.get(r)!.length)
  );

  const offsetX =
    ((maxCount - count) * SPACING_X) / 2;

  stitches.forEach((stitch, index) => {
    const visualIndex = reverse
      ? count - 1 - index
      : index;

    positioned.push({
      ...stitch,
      x: MARGIN_X + offsetX + visualIndex * SPACING_X,
      y: MARGIN_Y + (row - 1) * SPACING_Y,
    });
  });
}
console.table(positioned);
  return positioned;
}