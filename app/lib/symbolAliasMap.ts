import { CROCHET_SYMBOLS } from "./crochetSymbols";

export const SYMBOL_ALIAS_MAP: Record<string, string> = {};

for (const key in CROCHET_SYMBOLS) {

  const symbol = CROCHET_SYMBOLS[key];

  // La clé officielle
  SYMBOL_ALIAS_MAP[key.toLowerCase()] = key;

  // Tous les alias
  for (const alias of symbol.aliases) {
    SYMBOL_ALIAS_MAP[alias.toLowerCase()] = key;
  }
}