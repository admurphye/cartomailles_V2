import { Stitch } from "./Stitch";
import { Link } from "./Link";

export interface Diagram {
  stitches: Stitch[];
  links: Link[];
}