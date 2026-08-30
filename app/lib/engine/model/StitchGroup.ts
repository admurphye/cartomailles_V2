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
  chainCountsAsStitch?: boolean;
  chainRepresents?: Stitch["type"];

  stitches: Stitch[];

  parentIds: string[];
}
