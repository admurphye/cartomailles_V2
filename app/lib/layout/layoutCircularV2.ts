import { TopologyNode } from "../topology/buildTopology";
import { TopologyPosition } from "../topology/TopologyPosition";

const CENTER_X = 350;
const CENTER_Y = 350;

const FIRST_RADIUS = 40;
const MAX_RADIUS = 280;

// Écart entre deux enfants d'une augmentation (10°)
const CHILD_SPREAD = Math.PI / 18;

export function layoutCircularV2(
  topology: TopologyNode[][]
): TopologyPosition[][] {

  const positioned: TopologyPosition[][] = [];

  const step =
    MAX_RADIUS /
    Math.max(topology.length, 1);

  for (let row = 0; row < topology.length; row++) {

    const radius =
      FIRST_RADIUS + row * step;

    positioned[row] = [];

    // =====================================
    // Premier rang
    // =====================================

    if (row === 0) {

      topology[row].forEach((node, index) => {

        const angle =
          (index / topology[row].length) *
          Math.PI *
          2;

        positioned[row].push({

          ...node,

          angle,

          radius,

          x:
            CENTER_X +
            Math.cos(angle) * radius,

          y:
            CENTER_Y +
            Math.sin(angle) * radius,

        });

      });

      continue;

    }

    // =====================================
    // Rangs suivants
    // =====================================
const childrenByParent = new Map<number, number[]>();

topology[row].forEach((node, childIndex) => {

  node.parents.forEach(parent => {

    if (!childrenByParent.has(parent)) {
      childrenByParent.set(parent, []);
    }

    childrenByParent.get(parent)!.push(childIndex);

  });

});
    topology[row].forEach((node) => {

      let angle = 0;

      // Cas diminution
      if (node.parents.length === 2) {

        const p1 =
          positioned[row - 1][node.parents[0]];

        const p2 =
          positioned[row - 1][node.parents[1]];

        angle =
          (p1.angle + p2.angle) / 2;

      }

      // Cas normal
      else {

  const parentIndex = node.parents[0];

  const parent =
    positioned[row - 1][parentIndex];

  angle = parent.angle;

  const brothers =
    childrenByParent.get(parentIndex);

  if (
    brothers &&
    brothers.length === 2
  ) {

    if (brothers[0] === positioned[row].length) {

      angle -= CHILD_SPREAD;

    } else {

      angle += CHILD_SPREAD;

    }
  }
}

      positioned[row].push({

        ...node,

        angle,

        radius,

        x:
          CENTER_X +
          Math.cos(angle) * radius,

        y:
          CENTER_Y +
          Math.sin(angle) * radius,

      });

    });

  }

  return positioned;

}