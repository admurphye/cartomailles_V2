import { Instruction } from "./Instruction";

export interface Round {
  number: number;

  instructions: Instruction[];
}