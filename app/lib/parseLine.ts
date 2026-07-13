import { SYMBOL_ALIAS_MAP } from "./symbolAliasMap";

export type Instruction = {
  type: string;
  count: number;
};

export type ParsedLine = {
  instructions: Instruction[];
  repeat: number;
};
function expandRepeats(text: string): string {

  return text.replace(
    /(\d+)\s*x\s*\((.*?)\)/gi,
    (_, repeat, content) => {

      return Array(Number(repeat))
        .fill(content.trim())
        .join(" ");

    }
  );
}
export function parseLine(line: string): ParsedLine {

  let text = line.toLowerCase();

  text = expandRepeats(text);

  const normalized = text.replace(
    /(\d+\s+[a-z0-9]+)\s+(?=\d+\s+[a-z0-9]+)/gi,
    "$1,"
  );

  const parts = normalized.split(",");
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

const cleanedType = rawType.replace(/\s*x\s*\d+$/i, "").trim();

const type = SYMBOL_ALIAS_MAP[cleanedType];

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