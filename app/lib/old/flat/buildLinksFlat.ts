import { Stitch } from "../types";
import { CROCHET_SYMBOLS } from "../../../components/renderer/crochetSymbols";

export function buildLinksFlat(
  previous: Stitch[],
  current: Stitch[]
): Stitch[] {

  let parentIndex = 0;

  return current.map((stitch) => {
const definition = getSymbolDefinition(stitch.symbol);

if (definition && !definition.needsParent) {
  return {
    ...stitch,
    parents: [],
  };
}

     const parents: number[] = [];

    for (
      let i = 0;
      i < stitch.consumes;
      i++
    ) {

      parents.push(parentIndex + i);

    }

    parentIndex += stitch.consumes;

    return {
      ...stitch,
      parents,
    };

  });

}