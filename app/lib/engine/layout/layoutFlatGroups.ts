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
  const spacingY = 55;

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
    const structuralGroups = currentGroups.filter(
      (group) => group.role !== "turningChain" && group.role !== "chainSpace"
    );
    const chainSpaces = currentGroups.filter(
      (group) => group.role === "chainSpace"
    );
    const isRightToLeft = round % 2 === 0;

    structuralGroups.forEach((group, index) => {

      const displayIndex = isRightToLeft
        ? structuralGroups.length - 1 - index
        : index;

      const groupCenterX =
        startX + displayIndex * spacingX;

      const groupCenterY = rowCenterY;

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

    // Les mailles en l'air situées au milieu d'un rang forment une
    // petite arche (picot) entre les mailles qui les entourent.
    for (let index = 0; index < chainSpaces.length;) {
      const run = [chainSpaces[index]];

      while (
        index + run.length < chainSpaces.length &&
        chainSpaces[index + run.length].order === run[run.length - 1].order + 1
      ) {
        run.push(chainSpaces[index + run.length]);
      }

      const groupsBefore = structuralGroups.filter(
        (group) => group.order < run[0].order
      ).length;
      const leftLogicalPosition = Math.max(0, groupsBefore - 1);

      run.forEach((group, chainIndex) => {
        const progress = (chainIndex + 1) / (run.length + 1);
        const logicalPosition = leftLogicalPosition + progress;
        const displayPosition = isRightToLeft
          ? structuralGroups.length - 1 - logicalPosition
          : logicalPosition;

        positionedGroups.push({
          id: group.id,
          round: group.round,
          order: group.order,
          operation: group.operation,
          role: group.role,
          countsAsStitch: group.countsAsStitch,
          centerX: startX + displayPosition * spacingX,
          centerY: rowCenterY - Math.sin(progress * Math.PI) * 34,
          rotation: 0,
          orientation: "horizontal",
          stitches: group.stitches,
        });
      });

      index += run.length;
    }

    turningChains.forEach((group, index) => {
      const startXForRound = isRightToLeft
        ? startX + structuralGroups.length * spacingX + 18
        : startX - 18;

      positionedGroups.push({
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
      });
    });

  }

  return explodeGroups(positionedGroups);

}
