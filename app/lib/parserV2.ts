import { parseLine } from "./parseLine";
import { computeRound } from "./computeRound";
import { buildLinks } from "./buildLinks";
import { Stitch } from "./types";

export function parsePatternV2(pattern: string) {

  const lines = pattern
    .split("\n")
    .filter(line => line.trim() !== "");

  const counts: number[] = [];
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

 const round = computeRound(parsed);

counts.push(round.stitchCount);

let stitches = round.stitches;

if (roundStitches.length > 0) {
  stitches = buildLinks(
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
  roundStitches,
  hasMR,
};

}