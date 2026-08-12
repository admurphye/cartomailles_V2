import { CrochetGraph } from "../model/CrochetGraph";
import { PositionedGroup } from "../model/PositionedGroup";
import { PositionedStitch } from "../model/PositionedStitch";
import { StitchGroup } from "../model/StitchGroup";
import { explodeGroups } from "./explodeGroups";

const CENTER_X = 350;
const CENTER_Y = 350;
const CLUSTER_SPACING = 14;

type SquarePoint = {
  x: number;
  y: number;
  tangentX: number;
  tangentY: number;
  normalX: number;
  normalY: number;
};

function pointOnSide(side: number, progress: number, halfSize: number): SquarePoint {
  switch (side) {
    case 0:
      return {
        x: CENTER_X - halfSize + progress * halfSize * 2,
        y: CENTER_Y - halfSize,
        tangentX: 1,
        tangentY: 0,
        normalX: 0,
        normalY: -1,
      };
    case 1:
      return {
        x: CENTER_X + halfSize,
        y: CENTER_Y - halfSize + progress * halfSize * 2,
        tangentX: 0,
        tangentY: 1,
        normalX: 1,
        normalY: 0,
      };
    case 2:
      return {
        x: CENTER_X + halfSize - progress * halfSize * 2,
        y: CENTER_Y + halfSize,
        tangentX: -1,
        tangentY: 0,
        normalX: 0,
        normalY: 1,
      };
    default:
      return {
        x: CENTER_X - halfSize,
        y: CENTER_Y + halfSize - progress * halfSize * 2,
        tangentX: 0,
        tangentY: -1,
        normalX: -1,
        normalY: 0,
      };
  }
}

function cornerAfterSide(side: number, halfSize: number): SquarePoint {
  return pointOnSide(side, 1, halfSize);
}

function splitIntoClusters(groups: StitchGroup[]) {
  const clusters: StitchGroup[][] = [];
  const gaps: Array<{ groups: StitchGroup[]; afterCluster: number }> = [];
  let currentCluster: StitchGroup[] = [];
  let currentGap: StitchGroup[] = [];
  const firstClusterIndex = groups.findIndex(
    (group) => group.role !== "chainSpace"
  );
  // Un rang Granny est cyclique. S'il commence par des ml, elles ferment en
  // réalité le dernier coin et doivent donc être traitées après le dernier
  // groupe de brides, pas comme un espace du premier côté.
  const orderedGroups = firstClusterIndex > 0
    ? [...groups.slice(firstClusterIndex), ...groups.slice(0, firstClusterIndex)]
    : groups;

  const flushCluster = () => {
    if (currentCluster.length === 0) return;
    clusters.push(currentCluster);
    currentCluster = [];
  };

  const flushGap = () => {
    if (currentGap.length === 0) return;
    gaps.push({ groups: currentGap, afterCluster: clusters.length - 1 });
    currentGap = [];
  };

  orderedGroups.forEach((group) => {
    if (group.role === "chainSpace") {
      flushCluster();
      currentGap.push(group);
      return;
    }

    flushGap();
    currentCluster.push(group);
  });

  flushCluster();
  flushGap();

  // Un rang uniquement composé de brides reste lisible en le découpant
  // selon les groupes classiques de trois mailles d'un granny.
  if (clusters.length === 1 && clusters[0].length > 3) {
    const source = clusters[0];
    clusters.length = 0;

    for (let index = 0; index < source.length; index += 3) {
      clusters.push(source.slice(index, index + 3));
    }
  }

  return { clusters, gaps };
}

export function layoutGrannyGroups(
  graph: CrochetGraph,
  roundSpacing = 62
): PositionedStitch[] {
  const positionedGroups: PositionedGroup[] = [];
  const rounds = [...new Set(graph.groups.map((group) => group.round))].sort(
    (a, b) => a - b
  );
  const squareRounds = rounds.filter((round) =>
    graph.groups.some(
      (group) =>
        group.round === round &&
        group.role !== "magicRing" &&
        group.role !== "turningChain" &&
        group.stitches[0]?.type !== "slst"
    )
  );

  rounds.forEach((round) => {
    const currentGroups = graph.groups
      .filter((group) => group.round === round)
      .sort((a, b) => a.order - b.order);
    const centerGroups = currentGroups.filter((group) => group.role === "magicRing");
    const turningChains = currentGroups.filter(
      (group) => group.role === "turningChain"
    );
    const joinGroups = currentGroups.filter(
      (group) => group.stitches[0]?.type === "slst"
    );
    const squareGroups = currentGroups.filter(
      (group) =>
        group.role !== "magicRing" &&
        group.role !== "turningChain" &&
        group.stitches[0]?.type !== "slst"
    );

    centerGroups.forEach((group) => {
      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: CENTER_X,
        centerY: CENTER_Y,
        rotation: 0,
        orientation: "horizontal",
        stitches: group.stitches,
      });
    });

    if (squareGroups.length === 0) return;

    const { clusters, gaps } = splitIntoClusters(squareGroups);
    const squareRoundIndex = squareRounds.indexOf(round);
    const halfSize = Math.max(45, (squareRoundIndex + 1) * roundSpacing);
    const baseCount = Math.floor(clusters.length / 4);
    const remainder = clusters.length % 4;
    const clustersPerSide = Array.from(
      { length: 4 },
      (_, side) => baseCount + (side < remainder ? 1 : 0)
    );
    const clusterPoints: Array<SquarePoint & { side: number; localIndex: number }> = [];
    let clusterIndex = 0;

    clustersPerSide.forEach((sideCount, side) => {
      for (let localIndex = 0; localIndex < sideCount; localIndex++) {
        const point = pointOnSide(side, (localIndex + 1) / (sideCount + 1), halfSize);
        clusterPoints.push({ ...point, side, localIndex });

        const cluster = clusters[clusterIndex];
        cluster.forEach((group, stitchIndex) => {
          const offset = (stitchIndex - (cluster.length - 1) / 2) * CLUSTER_SPACING;

          positionedGroups.push({
            id: group.id,
            round: group.round,
            order: group.order,
            operation: group.operation,
            role: group.role,
            countsAsStitch: group.countsAsStitch,
            centerX: point.x + point.tangentX * offset,
            centerY: point.y + point.tangentY * offset,
            rotation: (side * Math.PI) / 2,
            orientation: "horizontal",
            stitches: group.stitches,
          });
        });

        clusterIndex++;
      }
    });

    gaps.forEach((gap) => {
      const before = clusterPoints[gap.afterCluster];
      const next = clusterPoints[(gap.afterCluster + 1) % clusterPoints.length];
      const isCorner = before && next && before.side !== next.side;
      const corner = isCorner ? cornerAfterSide(before.side, halfSize) : null;
      const diagonalScale = Math.SQRT1_2;
      const anchor = isCorner && corner
        ? {
            ...corner,
            tangentX: (before.tangentX + next.tangentX) * diagonalScale,
            tangentY: (before.tangentY + next.tangentY) * diagonalScale,
            normalX: (before.normalX + next.normalX) * diagonalScale,
            normalY: (before.normalY + next.normalY) * diagonalScale,
          }
        : {
            x: (before.x + next.x) / 2,
            y: (before.y + next.y) / 2,
            tangentX: before.tangentX,
            tangentY: before.tangentY,
            normalX: before.normalX,
            normalY: before.normalY,
          };

      gap.groups.forEach((group, chainIndex) => {
        const progress = (chainIndex + 1) / (gap.groups.length + 1);
        const tangentOffset =
          (chainIndex - (gap.groups.length - 1) / 2) * CLUSTER_SPACING;
        const outwardOffset = isCorner
          ? 0
          : Math.sin(progress * Math.PI) * 12;

        positionedGroups.push({
          id: group.id,
          round: group.round,
          order: group.order,
          operation: group.operation,
          role: group.role,
          countsAsStitch: group.countsAsStitch,
          centerX:
            anchor.x +
            anchor.tangentX * tangentOffset +
            anchor.normalX * outwardOffset,
          centerY:
            anchor.y +
            anchor.tangentY * tangentOffset +
            anchor.normalY * outwardOffset,
          rotation: Math.atan2(anchor.tangentY, anchor.tangentX),
          orientation: "horizontal",
          stitches: group.stitches,
        });
      });
    });

    turningChains.forEach((group, index) => {
      const progress = (index + 1) / turningChains.length;
      const tangentOffset =
        (index - (turningChains.length - 1) / 2) * CLUSTER_SPACING;
      const outwardOffset = Math.sin(progress * Math.PI) * 12;
      const diagonal = Math.SQRT1_2;

      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX:
          CENTER_X - halfSize + tangentOffset * diagonal - outwardOffset * diagonal,
        centerY:
          CENTER_Y - halfSize - tangentOffset * diagonal - outwardOffset * diagonal,
        rotation: -Math.PI / 4,
        orientation: "horizontal",
        stitches: group.stitches,
      });
    });

    joinGroups.forEach((group, index) => {
      positionedGroups.push({
        id: group.id,
        round: group.round,
        order: group.order,
        operation: group.operation,
        role: group.role,
        countsAsStitch: group.countsAsStitch,
        centerX: CENTER_X - halfSize + index * 10,
        centerY: CENTER_Y - halfSize,
        rotation: 0,
        orientation: "horizontal",
        stitches: group.stitches,
      });
    });
  });

  return explodeGroups(positionedGroups);
}
