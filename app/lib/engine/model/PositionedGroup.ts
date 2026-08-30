import { PositionedStitch } from "./PositionedStitch";
import {
  InstructionOperation,
  InstructionRole,
} from "./Instruction";

export interface PositionedGroup {

  id: string;

  round: number;

  order: number;

  operation: InstructionOperation;
  role: InstructionRole;
  countsAsStitch: boolean;
  chainCountsAsStitch?: boolean;
  chainRepresents?: PositionedStitch["type"];

  centerX: number;

  centerY: number;

  rotation: number;

  orientation: "horizontal" | "radial";

  stitchSpacing?: number;

  stitches: PositionedStitch[];

}
