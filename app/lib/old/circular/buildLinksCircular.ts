import { Stitch } from "../types";

export function buildLinksCircular(
  previous: Stitch[],
  current: Stitch[]
): Stitch[] {

  let parentIndex = 0;
  let childrenCreated = 0;

  return current.map((stitch) => {

    let parents: number[] = [];

    // ==========================
    // Diminution
    // ==========================

    if (stitch.consumes === 2) {

      parents = [
        parentIndex,
        parentIndex + 1,
      ];

      parentIndex += 2;

      return {
        ...stitch,
        parents,
      };

    }

    // ==========================
    // Cas général
    // ==========================

    parents = [parentIndex];

    childrenCreated++;

    const maxChildren =
      previous[parentIndex]?.produces || 1;

    if (childrenCreated >= maxChildren) {

      parentIndex++;
      childrenCreated = 0;

    }

    return {

      ...stitch,

      parents,

    };

  });

}