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
    const circularGroups = [...structuralGroups, ...chainSpaces].sort(
      (a, b) => a.order - b.order
    );
    const turningChainSlots = turningChains.length > 0 ? 1 : 0;
    const circularSlotCount = circularGroups.length + turningChainSlots;
    const angleForGroup = (group: typeof circularGroups[number]) => {
      const index = circularGroups.indexOf(group) + turningChainSlots;

      return (2 * Math.PI * index) / circularSlotCount - Math.PI / 2;
    };
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

    structuralGroups.forEach((group) => {
      const groupAngle = angleForGroup(group);

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

      run.forEach((group, chainIndex) => {
        const progress = (chainIndex + 1) / (run.length + 1);
        const angle = angleForGroup(group);
        // Une ml isolée représente un espace entre deux mailles : elle reste
        // sur le rang. Seule une suite de plusieurs ml forme une petite arche.
        const archHeight = run.length === 1
          ? 0
          : Math.min(34, 14 + (run.length - 2) * 6);
        const picotRadius =
          radius + Math.sin(progress * Math.PI) * archHeight;
        const angleStep = (2 * Math.PI) / circularSlotCount;
        const progressPerRadian = 1 / ((run.length + 1) * angleStep);
        const radiusDerivative =
          archHeight * Math.PI * Math.cos(progress * Math.PI) * progressPerRadian;
        const tangentX =
          radiusDerivative * Math.cos(angle) - picotRadius * Math.sin(angle);
        const tangentY =
          radiusDerivative * Math.sin(angle) + picotRadius * Math.cos(angle);
        const archTangent = Math.atan2(tangentY, tangentX);

        positionedGroups.push({
          id: group.id,
          round: group.round,
          order: group.order,
          operation: group.operation,
          role: group.role,
          countsAsStitch: group.countsAsStitch,
          centerX: centerX + picotRadius * Math.cos(angle),
          centerY: centerY + picotRadius * Math.sin(angle),
          // L'ovale suit exactement la tangente de l'arceau. La formule est
          // locale et reste identique au raccordement du cercle.
          rotation: archTangent,
          orientation: "radial",
          stitches: group.stitches,
        });
      });

      index += run.length;
    }

    const previousRadius = Math.max(0, radius - ringSpacing);

    turningChains.forEach((group, index) => {
      const progress = (index + 1) / turningChains.length;
      const chainRadius =
        previousRadius + (radius - previousRadius) * progress;

      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX,
        centerY: centerY - chainRadius,
        rotation: -Math.PI / 2,
        orientation: "radial",
        stitches: group.stitches,
      });
    });
  }

  return explodeGroups(positionedGroups);
}
