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
    const match = clean.match(/(\d+)\s*([a-z]+)/);

    if (!match) continue;

    instructions.push({
      count: parseInt(match[1]),
      type: match[2],
    });

  }

  return {
    instructions,
    repeat,
  };

}