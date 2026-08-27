import { StitchType } from "../model/Stitch";
import { InstructionOperation, InstructionRole } from "../model/Instruction";

export interface ParsedExpression {
  type: StitchType;
  operation: InstructionOperation;
  consumes: number;
  produces: number;
  role?: InstructionRole;
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
  tbr: "tr",
  dbr: "dtr",
  ml: "ch",
  mc: "slst",
  cm: "mr",
  mr: "mr",
  popcorn: "popcorn",
  pop: "popcorn",

  // Anglais
  sc: "sc",
  hdc: "hdc",
  dc: "dc",
  fpdc: "fpdc",
  bpdc: "bpdc",
  tr: "tr",
  dtr: "dtr",
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

  const sameParentMatch = expression.match(/^(ms|db|br|dbr|tb|tbr|brav|brar)_same_parent$/);

  if (sameParentMatch) {
    return {
      type: STITCH_MAP[sameParentMatch[1]],
      operation: "normal",
      consumes: 1,
      produces: 1,
      role: "sameParent",
    };
  }

  const sameStitchMatch = expression.match(/^same_(\d+)_(ms|db|br|dbr|tb|tbr)$/);

  if (sameStitchMatch) {
    const stitch = STITCH_MAP[sameStitchMatch[2]];
    const count = Number(sameStitchMatch[1]);

    if (!stitch || count < 1) return null;

    return {
      type: stitch,
      operation: count > 1 ? "increase" : "normal",
      consumes: 1,
      produces: count,
    };
  }

  if (expression === "2be") {
    expression = "aug(br)";
  }

  if (expression === "3be" || expression === "triple_dc_increase") {
    return {
      type: "dc",
      operation: "increase",
      consumes: 1,
      produces: 3,
    };
  }

  const tripleIncreaseMatch = expression.match(/^triple_(hdc|dtr|tr)_increase$/);

  if (tripleIncreaseMatch) {
    return {
      type: tripleIncreaseMatch[1] as StitchType,
      operation: "decrease",
      consumes: 3,
      produces: 1,
    };
  }

  if (expression === "skip") {
    return {
      // Aucun point n'est créé : le type ne sera jamais rendu.
      type: "sc",
      operation: "normal",
      consumes: 1,
      produces: 0,
    };
  }

  if (expression === "cluster5_fpdc") {
    return {
      type: "fpdc",
      operation: "decrease",
      consumes: 5,
      produces: 1,
    };
  }

  const fanMatch = expression.match(/^fan_(5|6|9)_dc$/);

  if (fanMatch) {
    return {
      type: "dc",
      operation: "increase",
      consumes: 1,
      produces: Number(fanMatch[1]),
    };
  }

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
