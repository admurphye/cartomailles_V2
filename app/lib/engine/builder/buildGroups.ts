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

        // Les instructions de saut déplacent seulement le curseur des parents.
        // Elles ne correspondent à aucun groupe visible dans le diagramme.
        if (instruction.produces === 0) {
          continue;
        }

        const stitches: Stitch[] = [];

        for (let i = 0; i < instruction.produces; i++) {

          stitches.push({

            id: String(stitchId++),

            type: instruction.type,

            operation: instruction.role === "chainSpaceTarget"
              ? "normal"
              : instruction.operation,
            groupSize: Math.max(instruction.consumes, instruction.produces),
            role: instruction.role,
            countsAsStitch: instruction.role === "turningChain"
              ? instruction.countsAsStitch &&
                repeat === instruction.count - 1 && i === instruction.produces - 1
              : instruction.countsAsStitch,
            chainCountsAsStitch: instruction.chainCountsAsStitch,
            chainRepresents: instruction.chainRepresents,

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
          countsAsStitch: instruction.role === "turningChain"
            ? instruction.countsAsStitch && repeat === instruction.count - 1
            : instruction.countsAsStitch,
          chainCountsAsStitch: instruction.chainCountsAsStitch,
          chainRepresents: instruction.chainRepresents,

          stitches,

          parentIds: [],

        });

      }

    }

  }

  return groups;

}
