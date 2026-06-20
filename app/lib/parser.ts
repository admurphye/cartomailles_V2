import { findSymbol } from "./findSymbol";
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
    .filter(line => line.trim() !== "");

  const counts: number[] = [];
  let analysis = "";

  const roundSymbols: string[][] = [];

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
   if (repeatMatch) {
  const nbMs = parseInt(repeatMatch[1]);
  const repetitions = parseInt(repeatMatch[2]);

  let col = 0;
  const symbols: string[] = [];

for (let r = 0; r < repetitions; r++) {
  for (let m = 0; m < nbMs; m++) {
    cells[index][col] = "X";
    symbols.push("X");
    col++;
  }

  cells[index][col] = "V";
  symbols.push("V");
  col++;
}

  const totalMailles =
    (nbMs + 1) * repetitions;

  counts.push(totalMailles);
  roundSymbols.push(symbols);

  analysis +=
    `Rang ${index + 1} : ${totalMailles} mailles\n`;

  return;
}
const numbers = text.match(/\d+/g);

const count =
  numbers && numbers.length > 0
    ? parseInt(numbers[0])
    : 0;

const symbol = findSymbol(text);

let actualCount = count;
if (
  text.includes("augmentation") ||
  text.includes("augmentations") ||
  text.includes("aug")
) {
  actualCount = count * 2;
}
const symbols: string[] = [];

for (let i = 0; i < actualCount; i++) {
  cells[index][i] = symbol;
  symbols.push(symbol);
}

roundSymbols.push(symbols);
counts.push(actualCount);

analysis +=
  `Rang ${index + 1} : ${actualCount} mailles\n`;
  });

 return {
  lines,
  counts,
  analysis,
  cells,
  roundSymbols,
  hasMR
};
}