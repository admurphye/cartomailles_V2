import { CrochetCursor } from "./CrochetCursor";
import { Stitch } from "../model/Stitch";
import { Link } from "../model/Link";

export class CrochetEngine {
  public cursor: CrochetCursor = {
    round: 1,
    parentIndex: 0,
    childIndex: 0,
  };

  public stitches: Stitch[] = [];

  public links: Link[] = [];
}
