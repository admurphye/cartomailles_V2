import { CROCHET_SYMBOLS } from "./crochetSymbols";

export function findSymbol(text: string) {
  const lowerText = text.toLowerCase();

  for (const symbol of Object.values(CROCHET_SYMBOLS)) {
    for (const alias of symbol.aliases) {
      if (lowerText.includes(alias.toLowerCase())) {
        return symbol.code;
      }
    }
  }

  return "";
}