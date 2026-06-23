import {
  CROCHET_SYMBOLS,
  CrochetSymbol,
} from "./crochetSymbols";

export function findSymbolInfo(
  text: string
): CrochetSymbol | null {

  const lowerText = text.toLowerCase();

  for (const symbol of Object.values(CROCHET_SYMBOLS)) {

    for (const alias of symbol.aliases) {

      if (
        lowerText.includes(
          alias.toLowerCase()
        )
      ) {
        return symbol;
      }
    }
  }

  return null;
}

export function findSymbol(
  text: string
) {
  const symbol =
    findSymbolInfo(text);

  return symbol
    ? symbol.code
    : "";
}