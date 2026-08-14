import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedGroup } from "../model/PositionedGroup";
import { PositionedStitch } from "../model/PositionedStitch";
import { explodeGroups } from "./explodeGroups";

export function layoutFlatGroups(
  graph: CrochetGraph,
  spacingY = 55
): PositionedStitch[] {

  const groups = graph.groups;
  const positionedGroups: PositionedGroup[] = [];
  const positionedById = new Map<string, PositionedStitch>();
  const parentIdsByChildId = new Map<string, string[]>();

  for (const link of graph.links) {
    if (link.type === "chain") continue;

    const parentIds = parentIdsByChildId.get(link.to) ?? [];
    parentIds.push(link.from);
    parentIdsByChildId.set(link.to, parentIds);
  }

  const centerX = 350;
  const startY = 80;

  const stitchSpacing = 16;
  const groupGap = 26;

  const rounds = [...new Set(groups.map(g => g.round))].sort((a, b) => a - b);

  for (const [roundIndex, round] of rounds.entries()) {

    // En SVG, les petites valeurs de Y sont en haut. On inverse donc
    // l'index des rangs pour construire le diagramme du bas vers le haut.
    const rowCenterY =
      startY + (rounds.length - 1 - roundIndex) * spacingY;

    const currentGroups =
      groups.filter(g => g.round === round);

    const turningChains = currentGroups.filter(
      (group) => group.role === "turningChain"
    );
    const rowGroups = currentGroups
      .filter((group) => group.role !== "turningChain")
      .sort((a, b) => a.order - b.order);
    const isRightToLeft = round % 2 === 0;

    const displayGroups = isRightToLeft
      ? [...rowGroups].reverse()
      : rowGroups;
    const groupWidths = displayGroups.map(
      (group) => Math.max(0, (group.stitches.length - 1) * stitchSpacing)
    );
    const rowWidth = groupWidths.reduce((total, width) => total + width, 0) +
      Math.max(0, displayGroups.length - 1) * groupGap;
    let cursorX = centerX - rowWidth / 2;

    const positionedRowGroups: PositionedGroup[] = [];

    displayGroups.forEach((group, index) => {
      const groupWidth = groupWidths[index];
      const defaultCenterX = cursorX + groupWidth / 2;
      const parentPositions = [
        ...new Set(
          group.stitches.flatMap((stitch) =>
            parentIdsByChildId.get(stitch.id) ?? []
          )
        ),
      ]
        .map((parentId) => positionedById.get(parentId))
        .filter((parent): parent is PositionedStitch => parent !== undefined);
      const groupCenterX = parentPositions.length > 0
        ? parentPositions.reduce((total, parent) => total + parent.x, 0) /
          parentPositions.length
        : defaultCenterX;

      const groupCenterY = rowCenterY;

      const positionedGroup: PositionedGroup = {

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

      };

      positionedGroups.push(positionedGroup);
      positionedRowGroups.push(positionedGroup);

      cursorX += groupWidth + groupGap;

    });

    turningChains.forEach((group, index) => {
      const startXForRound = isRightToLeft
        ? centerX + rowWidth / 2 + 18
        : centerX - rowWidth / 2 - 18;

      const positionedGroup: PositionedGroup = {
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: startXForRound,
        centerY: rowCenterY + (index + 1) * 18,
        rotation: 0,
        orientation: "horizontal",
        stitches: group.stitches,
      };

      positionedGroups.push(positionedGroup);
      positionedRowGroups.push(positionedGroup);
    });

    // Rend les positions du rang disponibles aux enfants du rang suivant.
    for (const stitch of explodeGroups(positionedRowGroups)) {
      positionedById.set(stitch.id, stitch);
    }

  }

  return explodeGroups(positionedGroups);

}
