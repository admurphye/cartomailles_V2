import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedStitch } from "../model/PositionedStitch";
import { PositionedGroup } from "../model/PositionedGroup";
import { explodeGroups } from "./explodeGroups";

export function layoutCircularGroups(
  graph: CrochetGraph
): PositionedStitch[] {

const groups = graph.groups;
  const positionedGroups: PositionedGroup[] = [];

  const centerX = 350;
  const centerY = 350;

  const ringSpacing = 60;

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

    const radius = round * ringSpacing;

    structuralGroups.forEach((group, index) => {

      const groupAngle =
        (2 * Math.PI * index) /
        structuralGroups.length
        - Math.PI / 2;

const groupCenterX =
    centerX +
    radius * Math.cos(groupAngle);

const groupCenterY =
    centerY +
    radius * Math.sin(groupAngle);
  positionedGroups.push({

  id: group.id,

  round: group.round,

  order: group.order,

  operation: group.operation,
  role: group.role,
  countsAsStitch: group.countsAsStitch,

  centerX: groupCenterX,

  centerY: groupCenterY,

  rotation: groupAngle,

  orientation: "radial",

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
        centerX: centerX,
        centerY: centerY - radius - (index + 1) * 18,
        rotation: -Math.PI / 2,
        orientation: "radial",
        stitches: group.stitches,
      });
    });

  }

 return explodeGroups(positionedGroups);

}
