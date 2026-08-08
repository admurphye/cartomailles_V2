import { StitchType } from "./Stitch";

export interface StitchDefinition {
  type: StitchType;

  consumes: number;
  produces: number;

  isChain: boolean;
}