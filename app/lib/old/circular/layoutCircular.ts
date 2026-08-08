import {
  Stitch,
  PositionedCircularStitch,
} from "../types";

export function layoutCircular(
  rounds: Stitch[][]
): PositionedCircularStitch[][] {

  const centerX = 350;
  const centerY = 350;

  const symbolSize = 18; // largeur moyenne d'un symbole
  const minRadius = 40;

const firstRadius = Math.max(
  40,
  (rounds[0]?.length ?? 1) * symbolSize / (2 * Math.PI)
);
  const ringSpacing = symbolSize * 2;

  const result: PositionedCircularStitch[][] = [];
  const roundAngles: number[][] = [];

  let radius = firstRadius;

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {

    const round = rounds[roundIndex];

    if (round.length === 0) {
      result.push([]);
      roundAngles.push([]);
      continue;
    }

    if (roundIndex > 0) {
      const requiredRadius = Math.max(
  minRadius,
  round.length * symbolSize / (2 * Math.PI)
);

radius = Math.max(
  radius + ringSpacing,
  requiredRadius
);
    }

    result.push([]);
    roundAngles.push([]);

    const sectorSize = (Math.PI * 2) / round.length;

    round.forEach((stitch, stitchIndex) => {

      const startAngle = stitchIndex * sectorSize;
      const endAngle = startAngle + sectorSize;
      const centerAngle = (startAngle + endAngle) / 2;

      const x =
        centerX +
        Math.cos(centerAngle) * radius;

      const y =
        centerY +
        Math.sin(centerAngle) * radius;

      result[roundIndex].push({
        ...stitch,
        x,
        y,
        radius,
        startAngle,
        endAngle,
        rotation: centerAngle,
      });

      roundAngles[roundIndex].push(centerAngle);

    });

  }

  return result;
}