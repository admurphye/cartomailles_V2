import { Stitch } from "./types";

export function buildLinks(
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

    // Augmentation (2 mailles issues du même parent)
    if (stitch.symbol === "V") {

      parents = [parentIndex];

      childOfCurrentParent++;

      if (childOfCurrentParent === 2) {
        parentIndex++;
        childOfCurrentParent = 0;
      }

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