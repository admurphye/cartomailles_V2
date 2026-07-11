import { parseLine } from "../parseLine";
import { buildLinksCircular } from "./buildLinksCircular";
import { computeRoundCircular } from "./computeRoundCircular";
import { Stitch } from "../types";

export function parsePatternCircular(pattern: string) {

  const lines = pattern
    .split("\n")
    .filter(line => line.trim() !== "");

  const counts: number[] = [];
  const roundSymbols: string[][] = [];
  let analysis = "";
  let hasMR = false;

  const roundStitches: Stitch[][] = [];

  for (const line of lines) {

    const text = line.toLowerCase();

    if (
      text.includes("mr") ||
      text.includes("cercle magique")
    ) {
      hasMR = true;
      continue;
    }

    const parsed = parseLine(text);

 const round = computeRoundCircular(parsed);

counts.push(round.stitchCount);

roundSymbols.push(round.symbols);

let stitches = round.stitches;

if (roundStitches.length > 0) {
  stitches = buildLinksCircular(
    roundStitches[roundStitches.length - 1],
    stitches
  );
}

roundStitches.push(stitches);

console.table(
  stitches.map((s, i) => ({
    index: i,
    symbol: s.symbol,
    parents: s.parents.join(","),
    consumes: s.consumes,
  }))
);

analysis +=
  `Rang ${counts.length} : ${round.stitchCount} mailles\n`;

  }

  return {

    lines,

    counts,

    analysis,

    cells: [],

    roundSymbols,

    roundStitches,

    hasMR,

  };

}