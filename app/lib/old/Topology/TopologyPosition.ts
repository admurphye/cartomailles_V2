import { Stitch } from "../types";

export type TopologyNode = Stitch & {
  row: number;
  index: number;
  children: number[];
};

export function buildTopology(
  rounds: Stitch[][]
): TopologyNode[][] {

  const topology: TopologyNode[][] = [];

  // Création des nœuds

  rounds.forEach((round, row) => {

    topology[row] = round.map(
      (stitch, index) => ({
        ...stitch,
        row,
        index,
        children: [],
      })
    );

  });

  // Construction des enfants

  for (
    let row = 1;
    row < topology.length;
    row++
  ) {

    topology[row].forEach(node => {

      node.parents.forEach(parentIndex => {

        topology[row - 1][parentIndex]
          ?.children.push(node.index);

      });

    });

  }

  return topology;

}