import { Instruction } from "./parseLine";

export function analyzeChainRoles(
  instructions: Instruction[],
  roundNumber: number
): Instruction[] {
  return instructions.map((instruction, index) => {
    // On ne traite que les mailles en l'air
    if (instruction.type !== "ml") {
      return instruction;
    }

    let role: Instruction["role"] = "free";

    // Chaînette de départ
    if (
      roundNumber === 1 &&
      instructions.every((i) => i.type === "ml")
    ) {
      role = "foundation";
    }

    // Maille de montée
    else if (
      roundNumber > 1 &&
      index === 0
    ) {
      role = "turning";
    }

    // Arceau
    else if (
      index > 0 &&
      index < instructions.length - 1
    ) {
      role = "chainSpace";
    }

    return {
      ...instruction,
      role,
    };
  });
}