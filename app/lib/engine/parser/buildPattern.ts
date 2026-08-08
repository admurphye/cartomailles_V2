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

    return {
        rounds: [...rounds.values()],
    };

}