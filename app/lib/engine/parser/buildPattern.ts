import { CrochetPattern } from "../model/CrochetPattern";
import { Instruction } from "../model/Instruction";
import { Round } from "../model/Round";

export function buildPattern(instructions: Instruction[]): CrochetPattern {

    const rounds = new Map<number, Round>();

    for (const instruction of instructions) {

        if (!rounds.has(instruction.round)) {
            rounds.set(instruction.round, {
                number: instruction.round,
                instructions: [],
            });
        }

        rounds.get(instruction.round)!.instructions.push(instruction);
    }

    const builtRounds = [...rounds.values()];

    for (let index = 1; index < builtRounds.length; index++) {
      const previous = builtRounds[index - 1];
      const current = builtRounds[index];
      const availableParents = previous.instructions.reduce(
        (total, instruction) => total +
          (instruction.countsAsStitch ? instruction.count * instruction.produces : 0),
        0
      );
      const consumedByWorkedStitches = current.instructions.reduce(
        (total, instruction) => total +
          (instruction.role === "turningChain" || instruction.role === "sameParent"
            ? 0
            : instruction.count * instruction.consumes),
        0
      );

      current.instructions
        .filter((instruction) => instruction.role === "turningChain")
        .forEach((instruction) => {
          instruction.countsAsStitch = consumedByWorkedStitches < availableParents;
        });
    }

    return { rounds: builtRounds };

}
