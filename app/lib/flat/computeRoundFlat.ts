import { ParsedLine } from "../parseLine";
import { Stitch } from "../types";
import { CROCHET_SYMBOLS } from "../crochetSymbols";

export type RoundResult = {
  stitchCount: number;
  symbols: string[];
  stitches: Stitch[];
};

export function computeRoundFlat(
  parsed: ParsedLine
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

  for (let i = 0; i < instruction.count; i++) {

    symbols.push(symbol.code);

    stitches.push({
      symbol: symbol.code,
      parents: [],
      produces: symbol.produces,
      consumes: symbol.consumes,
    });

  }

  continue;
}
switch (instruction.type) {

case "aug":

  stitchesPerRepeat += instruction.count * symbol.produces;

  for (let i = 0; i < instruction.count; i++) {

    symbols.push(symbol.code);

    stitches.push({
      symbol: symbol.code,
      parents: [],
      consumes: symbol.consumes,
      produces: symbol.produces,
    });

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

    stitches.push({
      symbol: symbol.code,
      parents: [],
      consumes: symbol.consumes,
      produces: symbol.produces,
    });

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