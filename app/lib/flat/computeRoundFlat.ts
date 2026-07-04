import { ParsedLine } from "../parseLine";
import { Stitch } from "../types";

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

    switch (instruction.type) {

      case "ms":

        stitchesPerRepeat += instruction.count;

        for (let i = 0; i < instruction.count; i++) {
          symbols.push("X");
          stitches.push({
            symbol: "X",
            parents: [],
            produces: 1,
            consumes: 1,
            });
        }

        break;

      case "br":

        stitchesPerRepeat += instruction.count;

        for (let i = 0; i < instruction.count; i++) {
          symbols.push("T");
          stitches.push({
            symbol: "T",
            parents: [],
            produces: 1,
            consumes: 1,
            });
        }

        break;

      case "db":

        stitchesPerRepeat += instruction.count;

        for (let i = 0; i < instruction.count; i++) {
          symbols.push("DB");
          stitches.push({
            symbol: "DB",
            parents: [],
            produces: 1,
            consumes: 1,
            });
        }

        break;

      case "mc":

        stitchesPerRepeat += instruction.count;

        for (let i = 0; i < instruction.count; i++) {
          symbols.push("MC");
          stitches.push({
            symbol: "MC",
            parents: [],
            produces: 1,
            consumes: 1,
            });
        }

        break;

      case "ml":

        stitchesPerRepeat += instruction.count;

        for (let i = 0; i < instruction.count; i++) {
          symbols.push("ML");
          stitches.push({
            symbol: "ML",
            parents: [],
            produces: 1,
            consumes: 1,
            });
        }

        break;

   case "aug":

  // Le rang produit 2 mailles par augmentation
  stitchesPerRepeat += instruction.count * 2;

  for (let i = 0; i < instruction.count; i++) {

    symbols.push("AUG");

    stitches.push({
      symbol: "AUG",
      parents: [],
      consumes: 1,
      produces: 2,
    });

  }

  break;

      case "dim":

        stitchesPerRepeat += instruction.count;

        for (let i = 0; i < instruction.count; i++) {
         symbols.push("DIM");

            stitches.push({
            symbol: "DIM",
            parents: [],
            produces: 1,
            consumes: 2,
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