import { CrochetPattern } from "../model/CrochetPattern";
import { CrochetGraph } from "../model/CrochetGraph";
import { buildGroups } from "./buildGroups";
import { buildStitches } from "./buildStitches";
import { buildLinks } from "./buildLinks";

export function buildGraph(pattern: CrochetPattern): CrochetGraph {

  const groups = buildGroups(pattern);

  const stitches = buildStitches(pattern);

  const links = buildLinks(pattern, stitches);

  return {
    rounds: pattern.rounds,
    groups,
    stitches,
    links,
    issues: [],
  };
}
