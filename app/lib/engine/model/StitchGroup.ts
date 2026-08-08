import { Stitch } from "./Stitch";
import {
  InstructionOperation,
  InstructionRole,
} from "./Instruction";

export interface StitchGroup {
  id: string;

  round: number;

  order: number;

  operation: InstructionOperation;
  role: InstructionRole;
  countsAsStitch: boolean;

  stitches: Stitch[];

  parentIds: string[];
}
