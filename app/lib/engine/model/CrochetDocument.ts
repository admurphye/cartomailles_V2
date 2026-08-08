import { Stitch } from "./Stitch";
import { Link } from "./Link";

export interface CrochetDocument {
  id: string;
  name: string;

  stitches: Stitch[];
  links: Link[];
}