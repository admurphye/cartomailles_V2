import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedGroup } from "../model/PositionedGroup";
import { PositionedStitch } from "../model/PositionedStitch";
import { explodeGroups } from "./explodeGroups";
import { applyFlatRowDirections, flatRowDirection } from "./flatRowDirection";
import {
  layoutChainSpaceFan,
  layoutChainSpaceGroup,
} from "./layoutChainSpaceGroup";

function replacementVerticalBand(
  type: PositionedStitch["type"] | undefined,
  centerY: number
) {
  switch (type) {
    case "sc":
    case "slst":
      return { top: centerY - 6, bottom: centerY + 6 };
    case "ch":
    case "mr":
      return { top: centerY - 3, bottom: centerY + 3 };
    default:
      return { top: centerY - 9, bottom: centerY + 9 };
  }
}

export function layoutFlatGroups(
  graph: CrochetGraph,
  spacingY = 55
): PositionedStitch[] {
  graph = applyFlatRowDirections(graph);

  const groups = graph.groups;
  const positionedGroups: PositionedGroup[] = [];
  const positionedById = new Map<string, PositionedStitch>();
  const localPositionOverrides = new Map<string, PositionedStitch>();
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
    const isRightToLeft = flatRowDirection(round) === "rtl";
    const visualParentPosition = (parentId: string) => positionedById.get(parentId);

    const displayGroups = isRightToLeft
      ? [...rowGroups].reverse()
      : rowGroups;
    const groupWidths = displayGroups.map(
      (group) => Math.max(0, (group.stitches.length - 1) * stitchSpacing)
    );
    const rowWidth = groupWidths.reduce((total, width) => total + width, 0) +
      Math.max(0, displayGroups.length - 1) * groupGap;
    let cursorX = centerX - rowWidth / 2;

    const parentPositionsFor = (group: typeof displayGroups[number]) => [
      ...new Set(
        group.stitches.flatMap((stitch) =>
          parentIdsByChildId.get(stitch.id) ?? []
        )
      ),
    ]
      .map(visualParentPosition)
      .filter((parent): parent is PositionedStitch => parent !== undefined);

    // Les mailles d'une augmentation partagent volontairement le même point
    // d'ancrage. Au rang suivant, leurs enfants doivent toutefois être
    // répartis autour de ce point, sinon ils se superposent deux par deux.
    const anchorKey = (x: number) => x.toFixed(6);
    const anchoredSingleCounts = new Map<string, number>();
    for (const group of displayGroups) {
      const parents = parentPositionsFor(group);
      if (group.stitches.length !== 1 || parents.length === 0) continue;
      const x = parents.reduce((total, parent) => total + parent.x, 0) /
        parents.length;
      const key = anchorKey(x);
      anchoredSingleCounts.set(key, (anchoredSingleCounts.get(key) ?? 0) + 1);
    }
    const anchoredSingleIndexes = new Map<string, number>();
    const targetedStitchCounts = new Map<string, number>();
    for (const group of displayGroups) {
      if (group.role !== "chainSpaceTarget") continue;
      const parents = parentPositionsFor(group);
      if (parents.length === 0) continue;
      const x = parents.reduce((total, parent) => total + parent.x, 0) / parents.length;
      const key = anchorKey(x);
      targetedStitchCounts.set(
        key,
        (targetedStitchCounts.get(key) ?? 0) + group.stitches.length
      );
    }
    const targetedGroupIndexes = new Map<string, number>();

    const positionedRowGroups: PositionedGroup[] = [];

    displayGroups.forEach((group, index) => {
      const groupWidth = groupWidths[index];
      const defaultCenterX = cursorX + groupWidth / 2;
      const parentPositions = parentPositionsFor(group);
      let groupCenterX = parentPositions.length > 0
        ? parentPositions.reduce((total, parent) => total + parent.x, 0) /
          parentPositions.length
        : defaultCenterX;
      if (
        group.stitches.length === 1 &&
        group.role !== "chainSpaceTarget" &&
        parentPositions.length > 0
      ) {
        const key = anchorKey(groupCenterX);
        const count = anchoredSingleCounts.get(key) ?? 1;
        const position = anchoredSingleIndexes.get(key) ?? 0;
        groupCenterX += (position - (count - 1) / 2) * stitchSpacing;
        anchoredSingleIndexes.set(key, position + 1);
      }
      if (group.role === "chainSpaceTarget" && parentPositions.length > 0) {
        const key = anchorKey(groupCenterX);
        const count = targetedStitchCounts.get(key) ?? 1;
        const position = targetedGroupIndexes.get(key) ?? 0;
        const groupMidpoint = position + (group.stitches.length - 1) / 2;
        groupCenterX += (groupMidpoint - (count - 1) / 2) * stitchSpacing;
        targetedGroupIndexes.set(key, position + group.stitches.length);
      }
      const isSameParentBride = group.role === "sameParent";
      const sameParentTilt = isSameParentBride
        ? (isRightToLeft ? Math.PI / 4 : -Math.PI / 4)
        : 0;
      const targetedParents = group.role === "chainSpaceTarget"
        ? parentPositionsFor(group)
        : [];
      const targetedKey = targetedParents.length > 0
        ? anchorKey(targetedParents.reduce((sum, parent) => sum + parent.x, 0) /
          targetedParents.length)
        : "";
      const targetedCount = targetedStitchCounts.get(targetedKey) ?? 1;
      const targetedMidpoint = group.role === "chainSpaceTarget"
        ? (targetedGroupIndexes.get(targetedKey) ?? group.stitches.length) -
          (group.stitches.length + 1) / 2
        : 0;
      const targetedTilt = group.role === "chainSpaceTarget" && targetedCount > 1
        ? (targetedMidpoint - (targetedCount - 1) / 2) /
          ((targetedCount - 1) / 2) * (Math.PI / 5)
        : 0;
      // Écarte suffisamment la bride de la chaînette pour que sa tige ne
      // traverse pas les ovales, tout en gardant visuellement le même pied.
      const adjustedCenterX = groupCenterX + 22 * Math.sin(sameParentTilt);

      const groupCenterY = isSameParentBride
        ? rowCenterY + Math.max(0, turningChains.length - 1) * 9
        : rowCenterY;

      const positionedGroup: PositionedGroup = {

        id: group.id,

        round: group.round,

        order: group.order,

        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,

        centerX: adjustedCenterX,

        centerY: groupCenterY,

        rotation: isSameParentBride ? sameParentTilt : targetedTilt,

        orientation: "horizontal",

        stitches: group.stitches,

      };

      positionedGroups.push(positionedGroup);
      positionedRowGroups.push(positionedGroup);

      cursorX += groupWidth + groupGap;

    });

    const parentKey = (group: PositionedGroup) => [
      ...new Set(group.stitches.flatMap((stitch) =>
        parentIdsByChildId.get(stitch.id) ?? []
      )),
    ].sort().join("-");
    const motifs: Array<{
      left: PositionedGroup;
      chains: PositionedGroup[];
      right: PositionedGroup;
      targetX: number;
    }> = [];

    for (let index = 0; index < positionedRowGroups.length; index++) {
      const left = positionedRowGroups[index];
      if (left.role !== "chainSpaceTarget") continue;
      const chains: PositionedGroup[] = [];
      let nextIndex = index + 1;
      while (positionedRowGroups[nextIndex]?.role === "chainSpace") {
        chains.push(positionedRowGroups[nextIndex]);
        nextIndex++;
      }
      const right = positionedRowGroups[nextIndex];
      if (
        chains.length === 0 ||
        right?.role !== "chainSpaceTarget" ||
        parentKey(left) !== parentKey(right)
      ) continue;
      const parents = [
        ...new Set(left.stitches.flatMap((stitch) =>
          parentIdsByChildId.get(stitch.id) ?? []
        )),
      ]
        .map(visualParentPosition)
        .filter((parent): parent is PositionedStitch => parent !== undefined);
      if (parents.length === 0) continue;
      motifs.push({
        left,
        chains,
        right,
        targetX: parents.reduce((sum, parent) => sum + parent.x, 0) /
          parents.length,
      });
      index = nextIndex;
    }

    const orderedMotifs = [...motifs].sort((a, b) => a.targetX - b.targetX);
    orderedMotifs.forEach((motif, index) => {
      const leftDistance = index > 0
        ? motif.targetX - orderedMotifs[index - 1].targetX
        : Number.POSITIVE_INFINITY;
      const rightDistance = index < orderedMotifs.length - 1
        ? orderedMotifs[index + 1].targetX - motif.targetX
        : Number.POSITIVE_INFINITY;
      const availableWidth = Math.min(leftDistance, rightDistance) - 8;
      let localStitchGap = stitchSpacing;
      while (localStitchGap > 8) {
        const candidate = layoutChainSpaceGroup({
          targetX: motif.targetX,
          leftCount: motif.left.stitches.length,
          chainCount: motif.chains.length,
          rightCount: motif.right.stitches.length,
          stitchGap: localStitchGap,
          direction: flatRowDirection(round),
        });
        if (candidate.maxX - candidate.minX <= availableWidth) break;
        localStitchGap--;
      }
      const geometry = layoutChainSpaceGroup({
        targetX: motif.targetX,
        leftCount: motif.left.stitches.length,
        chainCount: motif.chains.length,
        rightCount: motif.right.stitches.length,
        stitchGap: localStitchGap,
        direction: flatRowDirection(round),
      });
      motif.left.centerX = geometry.leftCenterX;
      motif.left.rotation = geometry.leftRotation;
      motif.left.stitchSpacing = localStitchGap;
      motif.right.centerX = geometry.rightCenterX;
      motif.right.rotation = geometry.rightRotation;
      motif.right.stitchSpacing = localStitchGap;
    });

    // Place chaque arceau de mailles en l'air entre les deux groupes qu'il
    // relie. Sans cela, les ml sans parent utilisent la grille par défaut et
    // peuvent apparaître du mauvais côté d'une bride dans un rang retour.
    for (let index = 0; index < positionedRowGroups.length;) {
      if (positionedRowGroups[index].role !== "chainSpace") {
        index++;
        continue;
      }

      const runStart = index;
      while (
        index < positionedRowGroups.length &&
        positionedRowGroups[index].role === "chainSpace"
      ) {
        index++;
      }

      const before = positionedRowGroups[runStart - 1];
      const after = positionedRowGroups[index];
      const runLength = index - runStart;

      if (!before && after) {
        for (let runIndex = 0; runIndex < runLength; runIndex++) {
          positionedRowGroups[runStart + runIndex].centerX =
            after.centerX - (runLength - runIndex) * stitchSpacing;
        }
        continue;
      }

      if (before && !after) {
        for (let runIndex = 0; runIndex < runLength; runIndex++) {
          positionedRowGroups[runStart + runIndex].centerX =
            before.centerX + (runIndex + 1) * stitchSpacing;
        }
        continue;
      }

      if (!before || !after) continue;

      const deltaX = after.centerX - before.centerX;
      const archHeight = Math.max(22, Math.min(48, Math.abs(deltaX) * 0.3));

      for (let runIndex = 0; runIndex < runLength; runIndex++) {
        const progress = (runIndex + 1) / (runLength + 1);
        const chainGroup = positionedRowGroups[runStart + runIndex];
        chainGroup.centerX = before.centerX + deltaX * progress;
        chainGroup.centerY = rowCenterY -
          archHeight * 4 * progress * (1 - progress);

        // Oriente chaque symbole suivant la tangente de l'arceau. Le signe
        // de deltaX rend ce calcul valable dans les deux sens de rang.
        const tangentY = -4 * archHeight * (1 - 2 * progress);
        chainGroup.rotation = Math.atan2(tangentY, deltaX);
      }
    }

    const turningChainAnchorParent = turningChains
      .flatMap((group) => group.stitches)
        .flatMap((stitch) => parentIdsByChildId.get(stitch.id) ?? [])
        .map(visualParentPosition)
        .find((parent): parent is PositionedStitch => parent !== undefined);
    const chainCountsAsStitch = turningChains.some(
      (group) => group.countsAsStitch
    );
    const logicalReplacedGroup = rowGroups.find(
      (group) => group.role !== "chainSpace" && group.role !== "freeChain"
    );
    const replacedGroup = positionedRowGroups.find(
      (group) => group.id === logicalReplacedGroup?.id
    );
    const replacementBand = replacementVerticalBand(
      turningChains.find((group) => group.chainRepresents)?.chainRepresents ??
        replacedGroup?.stitches[0]?.type,
      replacedGroup?.centerY ?? rowCenterY
    );

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
        chainCountsAsStitch: group.chainCountsAsStitch,
        chainRepresents: group.chainRepresents,
        centerX: turningChainAnchorParent?.x ?? startXForRound,
        // La première ml part du parent et la dernière atteint exactement
        // la ligne du nouveau rang (elle remplace la première bride).
        centerY: chainCountsAsStitch
          ? replacementBand.top +
            (replacementBand.bottom - replacementBand.top) *
              (turningChains.length === 1
                ? 0.5
                : index / (turningChains.length - 1))
          : rowCenterY + (turningChains.length - 1 - index) * 18,
        rotation: 0,
        orientation: "horizontal",
        stitches: group.stitches,
      };

      positionedGroups.push(positionedGroup);
      positionedRowGroups.push(positionedGroup);
    });

    const archMotifStitchIds = new Set(
      motifs.flatMap((motif) => [
        ...motif.left.stitches.map((stitch) => stitch.id),
        ...motif.right.stitches.map((stitch) => stitch.id),
      ])
    );
    const rowStitches = explodeGroups(positionedRowGroups);
    const targetedByParent = new Map<string, PositionedStitch[]>();
    for (const stitch of rowStitches) {
      if (stitch.role !== "chainSpaceTarget" || archMotifStitchIds.has(stitch.id)) {
        continue;
      }
      const key = [...(parentIdsByChildId.get(stitch.id) ?? [])].sort().join("-");
      const targeted = targetedByParent.get(key) ?? [];
      targeted.push(stitch);
      targetedByParent.set(key, targeted);
    }

    const fans = [...targetedByParent.entries()].map(([key, stitches]) => {
      const parents = key.split("-").map(visualParentPosition)
        .filter((parent): parent is PositionedStitch => parent !== undefined);
      return {
        stitches: stitches.sort((a, b) => a.x - b.x),
        targetX: parents.reduce((sum, parent) => sum + parent.x, 0) /
          Math.max(1, parents.length),
        targetY: Math.min(...parents.map((parent) => parent.y)),
      };
    }).sort((a, b) => a.targetX - b.targetX);

    for (const [fanIndex, fan] of fans.entries()) {
      const leftDistance = fanIndex > 0
        ? fan.targetX - fans[fanIndex - 1].targetX
        : Number.POSITIVE_INFINITY;
      const rightDistance = fanIndex < fans.length - 1
        ? fans[fanIndex + 1].targetX - fan.targetX
        : Number.POSITIVE_INFINITY;
      const neighborDistance = Math.min(leftDistance, rightDistance);
      const stitchCount = fan.stitches.length;
      const desiredGap = stitchSpacing *
        (stitchCount <= 3 ? 1.5 : stitchCount <= 5 ? 1.3125 : 1);
      const desiredWidth = desiredGap * Math.max(1, stitchCount - 1);
      const neighborWidthRatio = stitchCount <= 3 ? 0.62 : 0.8;
      const groupWidth = Math.min(
        desiredWidth,
        neighborDistance * neighborWidthRatio
      );
      const localGap = groupWidth / Math.max(1, stitchCount - 1);
      const positions = layoutChainSpaceFan({
        targetX: fan.targetX,
        stitchTypes: fan.stitches.map((stitch) => stitch.type),
        stitchGap: localGap,
      });
      fan.stitches.forEach((stitch, index) => {
        const rotation = positions[index].rotation;
        const normalized = fan.stitches.length === 1
          ? 0
          : index / (fan.stitches.length - 1) * 2 - 1;
        const baseSpread = Math.min(8, fan.stitches.length * 1.5);
        const stitchHeight = stitch.type === "hdc"
          ? 22
          : stitch.type === "dc" || stitch.type === "fpdc" || stitch.type === "bpdc"
            ? 28
            : stitch.type === "tr"
              ? 36
              : stitch.type === "dtr"
                ? 44
                : 12;
        const baseX = fan.targetX + normalized * baseSpread;
        const baseY = fan.targetY - 6;
        const headX = positions[index].x;
        const headY = baseY - stitchHeight;
        const positioned = {
          ...stitch,
          x: headX,
          y: headY,
          rotation: rotation * 180 / Math.PI,
          fanGeometry: ["hdc", "dc", "dtr", "tr"].includes(stitch.type)
            ? { baseX, baseY, headX, headY }
            : undefined,
        };
        localPositionOverrides.set(stitch.id, positioned);
      });
    }

    // Rend les positions du rang disponibles aux enfants du rang suivant.
    for (const stitch of explodeGroups(positionedRowGroups)) {
      positionedById.set(stitch.id, localPositionOverrides.get(stitch.id) ?? stitch);
    }

  }

  return explodeGroups(positionedGroups).map(
    (stitch) => localPositionOverrides.get(stitch.id) ?? stitch
  );

}
