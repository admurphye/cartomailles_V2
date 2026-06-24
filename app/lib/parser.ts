import { Stitch } from "./types";
import { findSymbolInfo } from "./findSymbol";

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
   const numbers = text.match(/\d+/g);

const count =
  numbers && numbers.length > 0
    ? parseInt(numbers[0])
    : 0;

const symbolInfo =
  findSymbolInfo(text);

const symbol =
  symbolInfo?.code || "";

const actualCount = count;

const producedCount =
  count * (symbolInfo?.produces || 1);

const symbols: string[] = [];
const stitches: Stitch[] = [];

for (let i = 0; i < actualCount; i++) {

  cells[index][i] = symbol;
  symbols.push(symbol);

  stitches.push({
    symbol,
    parents:
      index === 0
        ? []
        : [i],
    produces:
      symbolInfo?.produces || 1,
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