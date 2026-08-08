import { InstructionOperation, InstructionRole } from "./Instruction";

export type StitchType =
  | "mr"
  | "ch"
  | "slst"
  | "sc"
  | "hdc"
  | "dc"
  | "tr"
  | "dtr";

export interface Stitch {
  id: string;

  type: StitchType;

  operation: InstructionOperation;
  role: InstructionRole;
  countsAsStitch: boolean;
  
  round: number;

  order: number;

  x: number;
  y: number;

  parents: string[];
  children: string[];

  selected: boolean;
  locked: boolean;
}
