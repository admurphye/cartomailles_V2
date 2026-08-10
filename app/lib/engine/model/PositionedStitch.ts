import { Stitch } from "./Stitch";

export interface PositionedStitch extends Stitch {
  x: number;
  y: number;

  offsetX?: number;
  offsetY?: number;
  rotation?: number;
}
