import {
  Stitch,
  PositionedCircularStitch,
} from "../types";

function getNextParentAngle(
  previousAngles: number[],
  parentIndex: number
) {
  const current =
    previousAngles[parentIndex];

  const next =
    previousAngles[
      (parentIndex + 1) %
      previousAngles.length
    ];

  // Gestion du passage 360° -> 0°
  if (next < current) {
    return next + Math.PI * 2;
  }

  return next;
}
export function layoutCircular(
  rounds: Stitch[][]
): PositionedCircularStitch[][] {

  const centerX = 350;
  const centerY = 350;

  const firstRadius = 40;
  const ringSpacing = 55;

  const result: PositionedCircularStitch[][] = [];
  const roundAngles: number[][] = [];

  rounds.forEach((round, roundIndex) => {

    const radius =
      firstRadius + roundIndex * ringSpacing;

    result.push([]);
    roundAngles.push([]);

    if (round.length === 0) return;

    const sectorSize =
      (Math.PI * 2) / round.length;

    round.forEach((stitch, stitchIndex) => {

      const startAngle =
        stitchIndex * sectorSize;

      const endAngle =
        startAngle + sectorSize;

      const centerAngle =
        (startAngle + endAngle) / 2;

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

  });

  return result;

}