import { Stitch } from "./types";
import { findSymbolInfo } from "./findSymbol";
import { parseRound } from "./parseRound";

const ROWS = 20;
const COLS = 20;

export function parsePattern(pattern: string) {
  let hasMR = false;

  const cells = Array.from(
    { length: ROWS },
    () => Array(COLS).fill(null)
  );

  const lines = pattern
    .split("\n")
    .filter((line) => line.trim() !== "");

  const counts: number[] = [];
  let analysis = "";

  const roundSymbols: string[][] = [];
  const roundStitches: Stitch[][] = [];

  lines.forEach((line, index) => {
    const text = line.toLowerCase();

    if (
      text.includes("mr") ||
      text.includes("cercle magique")
    ) {
      hasMR = true;
    }

    const repeatMatch = text.match(
      /(\d+)\s*mailles?\s*serrées?.*?1\s*augmentation.*?x(\d+)/
    );

    // =====================================================
    // CAS GÉNÉRAL
    // =====================================================
  const parsed = parseRound(text);
console.log("PARSED =", parsed);
const symbol = parsed.symbol;
const actualCount = parsed.actualCount;
const producedCount = parsed.producedCount;

const symbolInfo = findSymbolInfo(text);

const symbols: string[] = [];
const stitches: Stitch[] = [];

const previousRound =
  roundStitches[index - 1];

let parentIndex = 0;
let childrenCreated = 0;

for (let i = 0; i < actualCount; i++) {

  cells[index][i] = symbol;
  symbols.push(symbol);

  let parents: number[] = [];

 if (index > 0 && previousRound) {

  const consumes =
    symbolInfo?.consumes || 1;

  if (consumes === 2) {

    parents = [
      parentIndex,
      parentIndex + 1,
    ];

    parentIndex += 2;

  } else {

    parents = [parentIndex];

    childrenCreated++;

    const maxChildren =
      previousRound[parentIndex]
        ?.produces || 1;

    if (childrenCreated >= maxChildren) {

      parentIndex++;
      childrenCreated = 0;

    }
  }
}

  stitches.push({
    symbol,
    parents,
    produces:
      symbolInfo?.produces || 1,
      consumes:
  symbolInfo?.consumes || 1,
  });

}

roundSymbols.push(symbols);
roundStitches.push(stitches);
counts.push(producedCount);

analysis +=
  `Rang ${index + 1} : ${producedCount} mailles\n`;
  });

  return {
    lines,
    counts,
    analysis,
    cells,
    roundSymbols,
    roundStitches,
    hasMR,
  };
}