import { findSymbolInfo } from "./findSymbol";

export type ParsedRound = {
  symbol: string;
  actualCount: number;
  producedCount: number;
};

export function parseRound(line: string): ParsedRound {

 const text = line.toLowerCase();

const symbolInfo = findSymbolInfo(text);

// Cas : 2 ms, 1 aug x6
const repeatMatch = text.match(
  /(\d+)\s*\w+.*?(\d+)\s*aug.*?x\s*(\d+)/
);
console.log(text);
console.log(repeatMatch);
if (repeatMatch && symbolInfo?.code === "V") {
  const stitches = parseInt(repeatMatch[1]);
  const aug = parseInt(repeatMatch[2]);
  const repeat = parseInt(repeatMatch[3]);

  const produced =
    (stitches + aug * 2) * repeat;

  return {
    symbol: symbolInfo.code,
    actualCount: produced,
    producedCount: produced,
  };
}

// Cas simple
const numbers = text.match(/\d+/g);

const count =
  numbers && numbers.length > 0
    ? parseInt(numbers[0])
    : 0;

return {
  symbol: symbolInfo?.code || "",
  actualCount: count,
  producedCount:
    count * (symbolInfo?.produces || 1),
};
}