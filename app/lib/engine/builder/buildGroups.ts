import { CrochetPattern } from "../model/CrochetPattern";
import { Stitch } from "../model/Stitch";
import { StitchGroup } from "../model/StitchGroup";

export function buildGroups(pattern: CrochetPattern): StitchGroup[] {

  const groups: StitchGroup[] = [];

  let stitchId = 1;
  let groupId = 1;

  for (const round of pattern.rounds) {

    let order = 1;

    for (const instruction of round.instructions) {

      for (let repeat = 0; repeat < instruction.count; repeat++) {

        const stitches: Stitch[] = [];

        for (let i = 0; i < instruction.produces; i++) {

          stitches.push({

            id: String(stitchId++),

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

        groups.push({

          id: String(groupId++),

          round: round.number,

          order: order - 1,

          operation: instruction.operation,
          role: instruction.role,
          countsAsStitch: instruction.countsAsStitch,

          stitches,

          parentIds: [],

        });

      }

    }

  }

  return groups;

}
