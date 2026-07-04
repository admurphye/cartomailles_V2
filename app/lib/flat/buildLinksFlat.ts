import { Stitch } from "../types";

export function buildLinksFlat(
  previous: Stitch[],
  current: Stitch[]
): Stitch[] {

  let parentIndex = 0;
  let childOfCurrentParent = 0;

  return current.map((stitch) => {

    let parents: number[] = [];

    // Diminution
    if (stitch.consumes === 2) {

      parents = [parentIndex, parentIndex + 1];
      parentIndex += 2;

      return {
        ...stitch,
        parents,
      };

    }

   // Augmentation
if (stitch.produces === 2) {

  parents = [parentIndex];

  parentIndex++;

  return {
    ...stitch,
    parents,
  };

}

    // Cas normal
    parents = [parentIndex];
    parentIndex++;

    return {
      ...stitch,
      parents,
    };

  });

}