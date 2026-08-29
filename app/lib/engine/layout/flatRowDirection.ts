import type { CrochetGraph } from "../model/CrochetGraph";

export type FlatRowDirection = "ltr" | "rtl";

const directionAppliedGraphs = new WeakSet<CrochetGraph>();

export function flatRowDirection(round: number): FlatRowDirection {
  return round % 2 === 0 ? "rtl" : "ltr";
}

/**
 * Adapte les parents logiques au sens de travail d'un rang plat. Les IDs des
 * mailles restent stables ; seuls les liens inter-rangs sont remappés.
 */
export function applyFlatRowDirections(graph: CrochetGraph): CrochetGraph {
  if (directionAppliedGraphs.has(graph)) return graph;

  const stitchById = new Map(graph.stitches.map((stitch) => [stitch.id, stitch]));
  const parentsByRound = new Map<number, typeof graph.stitches>();

  for (const round of graph.rounds) {
    parentsByRound.set(
      round.number,
      graph.stitches
        .filter((stitch) =>
          stitch.round === round.number &&
          stitch.role !== "magicRing" &&
          stitch.countsAsStitch
        )
        .sort((a, b) => a.order - b.order)
    );
  }

  const directedGraph = {
    ...graph,
    links: graph.links.map((link) => {
      if (link.type === "chain") return link;
      const child = stitchById.get(link.to);
      const parent = stitchById.get(link.from);
      if (
        !child ||
        !parent ||
        flatRowDirection(child.round) === flatRowDirection(parent.round)
      ) {
        return link;
      }

      const parents = child.role === "chainSpaceTarget"
        ? graph.stitches
            .filter((stitch) =>
              stitch.round === parent.round && stitch.role === "chainSpace"
            )
            .sort((a, b) => a.order - b.order)
        : parentsByRound.get(parent.round) ?? [];
      const parentIndex = parents.findIndex((candidate) => candidate.id === parent.id);
      const mirroredParent = parentIndex >= 0
        ? parents[parents.length - 1 - parentIndex]
        : undefined;

      return mirroredParent ? { ...link, from: mirroredParent.id } : link;
    }),
  };

  directionAppliedGraphs.add(directedGraph);
  return directedGraph;
}
