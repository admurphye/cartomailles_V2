import { CrochetPattern } from "../model/CrochetPattern";
import { Stitch } from "../model/Stitch";
import { Link } from "../model/Link";

import { linkRound } from "./links/linkRound";

export function buildLinks(
  pattern: CrochetPattern,
  stitches: Stitch[]
): Link[] {

  const links: Link[] = [];

  linkRound(pattern, stitches, links);

  return links;
}