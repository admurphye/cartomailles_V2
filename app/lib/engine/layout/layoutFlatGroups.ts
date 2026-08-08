import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedGroup } from "../model/PositionedGroup";
import { PositionedStitch } from "../model/PositionedStitch";
import { explodeGroups } from "./explodeGroups";

export function layoutFlatGroups(
  graph: CrochetGraph
): PositionedStitch[] {

  const groups = graph.groups;
  const positionedGroups: PositionedGroup[] = [];

  const startX = 80;
  const startY = 80;

  const spacingX = 50;
  const spacingY = 70;

  const rounds = [...new Set(groups.map(g => g.round))];

  for (const round of rounds) {

    const currentGroups =
      groups.filter(g => g.round === round);

    const turningChains = currentGroups.filter(
      (group) => group.role === "turningChain"
    );
    const structuralGroups = currentGroups.filter(
      (group) => group.role !== "turningChain"
    );

    structuralGroups.forEach((group, index) => {

      const groupCenterX =
        startX + index * spacingX;

      const groupCenterY =
        startY + (round - 1) * spacingY;

      positionedGroups.push({

        id: group.id,

        round: group.round,

        order: group.order,

        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,

        centerX: groupCenterX,

        centerY: groupCenterY,

        rotation: 0,

        orientation: "horizontal",

        stitches: group.stitches,

      });

    });

    turningChains.forEach((group, index) => {
      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: startX - 18,
        centerY: startY + (round - 1) * spacingY - (index + 1) * 18,
        rotation: 0,
        orientation: "horizontal",
        stitches: group.stitches,
      });
    });

  }

  return explodeGroups(positionedGroups);

}
