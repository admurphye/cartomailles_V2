import {
  CROCHET_SYMBOLS,
  CrochetSymbol,
} from "./crochetSymbols";

export function findSymbolInfo(
  text: string
): CrochetSymbol | null {

  const lowerText =
    text.toLowerCase();

  const symbols = Object.values(
    CROCHET_SYMBOLS
  ).sort((a, b) => {

    const longestA =
      Math.max(
        ...a.aliases.map(
          alias => alias.length
        )
      );

    const longestB =
      Math.max(
        ...b.aliases.map(
          alias => alias.length
        )
      );

    return longestB - longestA;
  });

  for (const symbol of symbols) {

    for (const alias of symbol.aliases) {

      if (
        lowerText.includes(
          alias.toLowerCase()
        )
      ) {

        console.log(
          text,
          "=>",
          alias,
          "=>",
          symbol.code
        );

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