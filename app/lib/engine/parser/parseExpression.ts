import { StitchType } from "../model/Stitch";
import { InstructionOperation } from "../model/Instruction";

export interface ParsedExpression {
  type: StitchType;
  operation: InstructionOperation;
  consumes: number;
  produces: number;
}

const STITCH_MAP: Record<string, StitchType> = {
  // Français
  ms: "sc",
  db: "hdc",
  b: "dc",
  br: "dc",
  brav: "fpdc",
  br_av: "fpdc",
  brar: "bpdc",
  br_ar: "bpdc",
  tb: "tr",
  ml: "ch",
  mc: "slst",
  cm: "mr",
  mr: "mr",

  // Anglais
  sc: "sc",
  hdc: "hdc",
  dc: "dc",
  fpdc: "fpdc",
  bpdc: "bpdc",
  tr: "tr",
  ch: "ch",
  slst: "slst",
};

export function parseExpression(
  expression: string
): ParsedExpression | null {

  if (!expression) {
    return null;
  }

  expression = expression.trim().toLowerCase();

  const operationMatch = expression.match(
  /^(aug|augmentation|inc|increase|dim|diminution|dec|decrease)\((.+)\)$/
);

if (operationMatch) {
  const [, op, stitchText] = operationMatch;

  const stitch = STITCH_MAP[
  stitchText.trim().toLowerCase()
];

  if (!stitch) {
    return null;
  }

  const isIncrease =
    op === "aug" ||
    op === "augmentation" ||
    op === "inc" ||
    op === "increase";

  return {
    type: stitch,
    operation: isIncrease ? "increase" : "decrease",
    consumes: isIncrease ? 1 : 2,
    produces: isIncrease ? 2 : 1,
  };
}
  const stitch = STITCH_MAP[expression];

  if (stitch) {
    return {
      type: stitch,
      operation: "normal",
      consumes: stitch === "mr" || stitch === "ch" ? 0 : 1,
      produces: 1,
    };
  }

  return null;
}
