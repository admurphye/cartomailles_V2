import { CrochetPattern } from "../model/CrochetPattern";
import { Stitch } from "../model/Stitch";

export function buildStitches(pattern: CrochetPattern): Stitch[] {

  const stitches: Stitch[] = [];

  let id = 1;

  for (const round of pattern.rounds) {

    let order = 1;

    for (const instruction of round.instructions) {

      for (let i = 0; i < instruction.count; i++) {

        for (let j = 0; j < instruction.produces; j++) {

         stitches.push({
  id: String(id++),

  type: instruction.type,

  operation: instruction.operation,
  groupSize: instruction.produces,
  role: instruction.role,
  countsAsStitch: instruction.countsAsStitch,

  round: round.number,

  order: order++,

  x: 0,
  y: 0,

  parents: [],
  children: [],

  selected: false,
  locked: false,
});

        }

      }

    }

  }

  return stitches;
}
