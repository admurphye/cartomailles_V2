export function expandRepeats(text: string): string {

  let result = "";
  let i = 0;

  while (i < text.length) {

    // Pas un groupe
    if (text[i] !== "(") {
      result += text[i];
      i++;
      continue;
    }

    // Recherche de la parenthèse fermante correspondante
    let level = 1;
    let end = i + 1;

    while (end < text.length && level > 0) {

      if (text[end] === "(") level++;
      if (text[end] === ")") level--;

      end++;
    }

    const content = text.slice(i + 1, end - 1);

    // Lire ce qu'il y a après la parenthèse
    const rest = text.slice(end);

    const match = rest.match(/^\s*x\s*(\d+)/i);

    if (!match) {
      result += "(" + content + ")";
      i = end;
      continue;
    }

    const repeat = Number(match[1]);

    for (let r = 0; r < repeat; r++) {
      result += content;

      if (r < repeat - 1) {
        result += ", ";
      }
    }

    i = end + match[0].length;
  }

  return result;
}