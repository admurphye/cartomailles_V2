import { Round } from "./Round";
import { Stitch } from "./Stitch";
import { Link } from "./Link";
import { StitchGroup } from "./StitchGroup";
import { ParseIssue } from "./ParseIssue";

export interface CrochetGraph {

  rounds: Round[];

  groups: StitchGroup[];

  stitches: Stitch[];

  links: Link[];

  issues: ParseIssue[];

}
