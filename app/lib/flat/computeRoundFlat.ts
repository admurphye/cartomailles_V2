import { Stitch } from "../types";
import { CROCHET_SYMBOLS } from "../crochetSymbols";
import type { ChainRole } from "../crochetTypes";
import { Instruction, ParsedLine } from "../parseLine";

function createStitch(
  symbol: (typeof CROCHET_SYMBOLS)[keyof typeof CROCHET_SYMBOLS],
  options: Partial<Stitch> = {}
): Stitch {
  return {
    symbol: symbol.code,
    parents: [],
    produces: symbol.produces,
    consumes: symbol.consumes,
    ...options,
  };
}

function createStitches(
  instruction: Instruction,
  instructions: Instruction[],
  instructionIndex: number,
  symbol: (typeof CROCHET_SYMBOLS)[keyof typeof CROCHET_SYMBOLS],
  roundNumber: number
): Stitch[] {

  const stitches: Stitch[] = [];

  // Maille de montée
  if (instruction.role === "turning") {

    for (let i = 0; i < instruction.count; i++) {

      stitches.push(
        createStitch(symbol, {
    role: instruction.role,
})
      );

    }

    return stitches;

  }

  // Cas général
  for (let i = 0; i < instruction.count; i++) {

    stitches.push(createStitch(symbol));

  }

  return stitches;
}

export type RoundResult = {
  stitchCount: number;
  symbols: string[];
  stitches: Stitch[];
};

export function computeRoundFlat(
  parsed: ParsedLine,
  roundNumber: number
): RoundResult {

  let stitchesPerRepeat = 0;

  const symbols: string[] = [];
  const stitches: Stitch[] = [];

  for (const instruction of parsed.instructions) {
const symbol = CROCHET_SYMBOLS[instruction.type];

if (!symbol) {
  console.warn(`Symbole inconnu : ${instruction.type}`);
  continue;
}
// Tous les symboles "simples"
if (
  instruction.type !== "aug" &&
  instruction.type !== "dim"
) {

  stitchesPerRepeat += instruction.count * symbol.produces;

  const created = createStitches(
  instruction,
  parsed.instructions,
  parsed.instructions.indexOf(instruction),
  symbol,
  roundNumber
);

symbols.push(...created.map(s => s.symbol));

stitches.push(...created);
  continue;
}
switch (instruction.type) {

case "aug":

  stitchesPerRepeat += instruction.count * symbol.produces;

  for (let i = 0; i < instruction.count; i++) {

    symbols.push(symbol.code);

    stitches.push(createStitch(symbol));

  }

  break;

case "dim":

  stitchesPerRepeat +=
    instruction.count * symbol.produces;

  for (
    let i = 0;
    i < instruction.count;
    i++
  ) {

    symbols.push(symbol.code);

    stitches.push(createStitch(symbol));

  }

  break;

   }

  }
  const stitchCount =
    stitchesPerRepeat * parsed.repeat;

 const finalSymbols: string[] = [];
const finalStitches: Stitch[] = [];

for (let i = 0; i < parsed.repeat; i++) {

  finalSymbols.push(...symbols);

  finalStitches.push(
    ...stitches.map(stitch => ({
      ...stitch,
      parents: [],
    }))
  );

}

 return {

  stitchCount,

  symbols: finalSymbols,

  stitches: finalStitches,

};

}