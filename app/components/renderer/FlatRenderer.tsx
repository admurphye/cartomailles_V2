import CircularRenderer from "./CircularRenderer";

import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import type { RefObject } from "react";

type Props = {
  stitches: PositionedStitch[];
  links: Link[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
};

export default function FlatRenderer(props: Props) {
  return <CircularRenderer {...props} />;
}
