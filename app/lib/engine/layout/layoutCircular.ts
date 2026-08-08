import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedStitch } from "../model/PositionedStitch";

export function layoutCircular(graph: CrochetGraph): PositionedStitch[] {

  const positioned: PositionedStitch[] = [];

  const centerX = 350;
  const centerY = 350;
  const ringSpacing = 60;

  const rounds = [...new Set(graph.stitches.map((s) => s.round))].sort(
    (a, b) => a - b
  );

  rounds.forEach((round) => {
    const stitches = graph.stitches.filter((s) => s.round === round);

    const radius = round === 0 ? 0 : round * ringSpacing;

    stitches.forEach((stitch, index) => {
      let angle =
  (2 * Math.PI * index) / stitches.length - Math.PI / 2;

// Décalage visuel des augmentations
if (stitch.operation === "increase") {
  const offset = 0.08; // environ 4,5°

  angle += index % 2 === 0 ? -offset : offset;
}

      positioned.push({
        ...stitch,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
  });

  return positioned;
}