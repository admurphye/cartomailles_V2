import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedStitch } from "../model/PositionedStitch";
import { PositionedGroup } from "../model/PositionedGroup";
import { explodeGroups } from "./explodeGroups";

export function layoutCircularGroups(
  graph: CrochetGraph,
  ringSpacing = 50
): PositionedStitch[] {
  const groups = graph.groups;
  const positionedGroups: PositionedGroup[] = [];
  const centerX = 350;
  const centerY = 350;
  const rounds = [...new Set(groups.map((group) => group.round))];
  const structuralRounds = rounds.filter((round) =>
    groups.some(
      (group) =>
        group.round === round &&
        group.role !== "magicRing" &&
        group.role !== "turningChain"
    )
  );

  for (const round of rounds) {
    const currentGroups = groups.filter((group) => group.round === round);
    const magicRings = currentGroups.filter(
      (group) => group.role === "magicRing"
    );
    const turningChains = currentGroups.filter(
      (group) => group.role === "turningChain"
    );
    const structuralGroups = currentGroups.filter(
      (group) =>
        group.role !== "turningChain" &&
        group.role !== "chainSpace" &&
        group.role !== "magicRing"
    );
    const chainSpaces = currentGroups.filter(
      (group) => group.role === "chainSpace"
    );
    const structuralRoundIndex = structuralRounds.indexOf(round);
    const radius = (structuralRoundIndex + 1) * ringSpacing;

    magicRings.forEach((group) => {
      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX,
        centerY,
        rotation: 0,
        orientation: "horizontal",
        stitches: group.stitches,
      });
    });

    structuralGroups.forEach((group, index) => {
      const groupAngle =
        (2 * Math.PI * index) / structuralGroups.length - Math.PI / 2;

      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: centerX + radius * Math.cos(groupAngle),
        centerY: centerY + radius * Math.sin(groupAngle),
        // Le symbole de base pointe vers le haut. Un quart de tour ajouté à
        // l'angle polaire l'oriente du centre vers l'extérieur du diagramme.
        rotation: groupAngle + Math.PI / 2,
        orientation: "radial",
        stitches: group.stitches,
      });
    });

    // Une suite de mailles en l'air interne au tour est dessinée en
    // picot, vers l'extérieur du cercle, entre ses mailles voisines.
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
      const previousIndex = Math.max(0, groupsBefore - 1);

      run.forEach((group, chainIndex) => {
        const progress = (chainIndex + 1) / (run.length + 1);
        const logicalPosition = previousIndex + progress;
        const angle =
          (2 * Math.PI * logicalPosition) / structuralGroups.length - Math.PI / 2;
        const picotRadius = radius + Math.sin(progress * Math.PI) * 34;

        positionedGroups.push({
          id: group.id,
          round: group.round,
          order: group.order,
          operation: group.operation,
          role: group.role,
          countsAsStitch: group.countsAsStitch,
          centerX: centerX + picotRadius * Math.cos(angle),
          centerY: centerY + picotRadius * Math.sin(angle),
          rotation: angle,
          orientation: "radial",
          stitches: group.stitches,
        });
      });

      index += run.length;
    }

    turningChains.forEach((group, index) => {
      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX,
        centerY: centerY - radius - (index + 1) * 18,
        rotation: -Math.PI / 2,
        orientation: "radial",
        stitches: group.stitches,
      });
    });
  }

  return explodeGroups(positionedGroups);
}
