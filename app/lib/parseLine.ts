import { SYMBOL_ALIAS_MAP } from "./symbolAliasMap";

export type Instruction = {
  type: string;
  count: number;
};

export type ParsedLine = {
  instructions: Instruction[];
  repeat: number;
};

export function parseLine(line: string): ParsedLine {

  const text = line.toLowerCase();

  const parts = text.split(",");

  const instructions: Instruction[] = [];

  let repeat = 1;

  for (const part of parts) {

    const clean = part.trim();

    // répétition
    const repeatMatch = clean.match(/x\s*(\d+)/);

    if (repeatMatch) {
      repeat = parseInt(repeatMatch[1]);
    }

    // quantité + type
    const match = clean.match(/^(\d+)\s*(.+)$/);

    if (!match) continue;

    const rawType = match[2]
  .trim()
  .toLowerCase();

const type = SYMBOL_ALIAS_MAP[rawType];

if (!type) {
  console.warn(`Symbole inconnu : ${rawType}`);
  continue;
}

instructions.push({
  count: parseInt(match[1]),
  type,
});

  }

  return {
    instructions,
    repeat,
  };

}