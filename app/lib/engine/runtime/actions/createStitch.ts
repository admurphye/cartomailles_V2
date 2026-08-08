import { Stitch } from "../../model/Stitch";
import { StitchType } from "../../model/Stitch";

let nextId = 1;

export function createStitch(
  type: StitchType,
  round: number,
  order: number
): Stitch {

  return {
    id: String(nextId++),

    type,
    operation: "normal",
    role: "normal",
    countsAsStitch: true,

    round,
    order,

    x: 0,
    y: 0,

    parents: [],
    children: [],

    selected: false,
    locked: false,
  };

}
