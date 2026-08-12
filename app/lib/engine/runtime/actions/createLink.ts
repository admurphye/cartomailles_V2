import { Link } from "../../model/Link";
import { Stitch } from "../../model/Stitch";

export function createLink(
  parent: Stitch,
  child: Stitch
): Link {

  parent.children.push(child.id);
  child.parents.push(parent.id);

  return {
    id: `${parent.id}-${child.id}`,
    from: parent.id,
    to: child.id,
    type: "normal",
  };

}
