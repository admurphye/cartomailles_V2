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
  const positionedById = new Map<string, PositionedStitch>();
  const parentIdsByChildId = new Map<string, string[]>();
  const centerX = 350;
  const centerY = 350;

  for (const link of graph.links) {
    if (link.type === "chain") continue;

    const parentIds = parentIdsByChildId.get(link.to) ?? [];
    parentIds.push(link.from);
    parentIdsByChildId.set(link.to, parentIds);
  }
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
    const roundStartIndex = positionedGroups.length;
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
    const firstChainSpaceOrder = chainSpaces[0]?.order ?? Number.POSITIVE_INFINITY;
    const leadingMotifGroups = turningChains.length > 0 && chainSpaces.length > 0
      ? structuralGroups.filter((group) => group.order < firstChainSpaceOrder)
      : [];
    const circularGroups = [...structuralGroups, ...chainSpaces].sort(
      (a, b) => a.order - b.order
    );
    // La chaînette de début remplace la première bride : elle occupe donc un
    // seul emplacement et reste accolée aux brides suivantes du motif.
    const turningChainSlots = turningChains.length > 0 ? 1 : 0;
    const turningChainOffset = turningChainSlots;
    const circularSlotCount = circularGroups.length + turningChainSlots;
    const hasIncompleteParentLinks = structuralGroups.some((group) =>
      group.stitches.every((stitch) =>
        (parentIdsByChildId.get(stitch.id) ?? []).length === 0
      )
    );
    const angleForGroup = (group: typeof circularGroups[number]) => {
      const index = circularGroups.indexOf(group) + turningChainOffset;

      return (2 * Math.PI * index) / circularSlotCount - Math.PI / 2;
    };
    const parentAngleForGroup = (group: typeof circularGroups[number]) => {
      // Si le rang demande plus de mailles qu'il n'existe de parents, une
      // partie des groupes n'a aucun lien. Mélanger alignement sur les parents
      // et placement automatique crée alors des chevauchements. Dans ce cas,
      // tout le rang est réparti régulièrement dans l'ordre des instructions.
      if (hasIncompleteParentLinks) return angleForGroup(group);

      const parentIds = [
        ...new Set(group.stitches.flatMap((stitch) =>
          parentIdsByChildId.get(stitch.id) ?? []
        )),
      ];
      const parentPositions = parentIds
        .map((parentId) => positionedById.get(parentId))
        .filter((parent): parent is PositionedStitch => parent !== undefined)
        // Le centre d'un anneau magique n'a pas d'angle exploitable.
        .filter((parent) =>
          Math.hypot(parent.x - centerX, parent.y - centerY) > 0.001
        );

      if (parentPositions.length === 0) return angleForGroup(group);

      // Les sorties d'une augmentation partagent le même centre visuel, mais
      // deviennent des mailles distinctes au rang suivant. On leur attribue
      // alors leur angle logique dans le rang : une virgule avance ainsi bien
      // vers la maille suivante au lieu d'empiler les nouveaux symboles.
      const hasStackedParent = parentPositions.some((parent) =>
        [...positionedById.values()].some((candidate) =>
          candidate.id !== parent.id &&
          candidate.round === parent.round &&
          Math.hypot(candidate.x - parent.x, candidate.y - parent.y) < 0.001
        )
      );

      if (hasStackedParent) {
        const parentRound = parentPositions[0].round;
        const logicalParents = graph.stitches
          .filter((stitch) => stitch.round === parentRound && stitch.role !== "magicRing" && stitch.role !== "turningChain")
          .sort((a, b) => a.order - b.order);
        const logicalAngles = parentIds
          .map((id) => logicalParents.findIndex((stitch) => stitch.id === id))
          .filter((index) => index >= 0)
          .map((index) => 2 * Math.PI * index / logicalParents.length - Math.PI / 2);

        if (logicalAngles.length > 0) {
          const direction = logicalAngles.reduce((sum, angle) => ({
            x: sum.x + Math.cos(angle),
            y: sum.y + Math.sin(angle),
          }), { x: 0, y: 0 });
          return Math.atan2(direction.y, direction.x);
        }
      }

      const direction = parentPositions.reduce(
        (sum, parent) => {
          const angle = Math.atan2(parent.y - centerY, parent.x - centerX);
          return {
            x: sum.x + Math.cos(angle),
            y: sum.y + Math.sin(angle),
          };
        },
        { x: 0, y: 0 }
      );

      return Math.atan2(direction.y, direction.x);
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
      const leadingMotifIndex = leadingMotifGroups.indexOf(group);
      const isLeadingMotifGroup = leadingMotifIndex >= 0;
      const groupAngle = isLeadingMotifGroup
        ? -Math.PI / 2
        : parentAngleForGroup(group);
      const isSameParentBride = group.role === "sameParent";
      const sameParentTilt = isSameParentBride ? Math.PI / 7 : 0;
      const groupRadius = isSameParentBride && turningChains.length > 0
        ? radius - (turningChains.length - 1) * 6
        : radius;
      const tangentOffset = isLeadingMotifGroup
        ? (leadingMotifIndex + 1 - leadingMotifGroups.length / 2) * 18
        : isSameParentBride
          ? 16 * Math.sin(sameParentTilt)
          : 0;

      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: centerX + groupRadius * Math.cos(groupAngle) -
          tangentOffset * Math.sin(groupAngle),
        centerY: centerY + groupRadius * Math.sin(groupAngle) +
          tangentOffset * Math.cos(groupAngle),
        // Le symbole de base pointe vers le haut. Un quart de tour ajouté à
        // l'angle polaire l'oriente du centre vers l'extérieur du diagramme.
        rotation: groupAngle + Math.PI / 2 + sameParentTilt,
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

    const turningChainGap = 12;
    const turningChainTangentOffset = leadingMotifGroups.length > 0
      ? -leadingMotifGroups.length / 2 * 18
      : 0;

    turningChains.forEach((group, index) => {
      const chainRadius = radius -
        (turningChains.length - 1 - index) * turningChainGap;

      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: centerX + turningChainTangentOffset,
        centerY: centerY - chainRadius,
        rotation: -Math.PI / 2,
        orientation: "radial",
        stitches: group.stitches,
      });
    });

    // Les angles obtenus deviennent les références du rang suivant.
    for (const stitch of explodeGroups(positionedGroups.slice(roundStartIndex))) {
      positionedById.set(stitch.id, stitch);
    }
  }

  return explodeGroups(positionedGroups);
}
