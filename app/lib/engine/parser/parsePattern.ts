import { CrochetGraph } from "../model/CrochetGraph";
import { tokenize } from "./tokenize";
import { parseTokens } from "./parseTokens";
import { buildPattern } from "./buildPattern";
import { buildGraph } from "../builder/buildGraph";
import { normalizePattern } from "./normalizePattern";
import { expandRepeats } from "./expandRepeats";

export function parsePattern(pattern: string): CrochetGraph {

  const normalized =
  normalizePattern(pattern);

const expanded =
  expandRepeats(normalized);

const tokens =
  tokenize(expanded);

  const { instructions, issues } = parseTokens(tokens);

  const crochetPattern = buildPattern(instructions);

  return {
    ...buildGraph(crochetPattern),
    issues,
  };
}
