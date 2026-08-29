import { StitchType } from "./Stitch";

export type InstructionRole =
  | "normal"
  | "foundationChain"
  | "turningChain"
  | "sameParent"
  | "chainSpace"
  | "chainSpaceTarget"
  | "freeChain"
  | "magicRing"
  | "join"
  | "colorChange"
  | "marker";

export type InstructionOperation =
  | "normal"
  | "increase"
  | "decrease";

export interface Instruction {
  type: StitchType;

  // Nombre d'instructions identiques
  count: number;

  // Mailles consommées dans le rang précédent
  consumes: number;

  // Mailles produites
  produces: number;

  role: InstructionRole;

  countsAsStitch: boolean;

  operation: InstructionOperation;

  round: number;

  target?: {
    type: "chainSpace";
    chainCount?: number;
    index?: number;
  };
}
