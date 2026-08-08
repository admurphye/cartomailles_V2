import { Token } from "../model/Token";

export function tokenize(pattern: string): Token[] {

  // On protège les expressions fonction(...)
  pattern = pattern.replace(
    /\b(aug|augmentation|inc|increase|dim|diminution|dec|decrease)\(([^)]+)\)/gi,
    (_, fn, arg) => `${fn}§${arg}§`
  );

  const tokens = pattern
    .replace(/\r/g, "")
    .replace(/\n/g, " EOL ")
    .replace(/,/g, " , ")
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(/\s+/)
    .filter(Boolean)
    .map(value => ({
      value: value.replace(/§([^§]+)§/, "($1)")
    }));

  return tokens;
}