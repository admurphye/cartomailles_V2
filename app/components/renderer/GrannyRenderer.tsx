import CircularRenderer from "./CircularRenderer";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import type { RefObject } from "react";
import { Tool } from "@/app/lib/engine/model/Tool";
import { DiagramAnnotation } from "@/app/lib/annotations";

type Props = {
  stitches: PositionedStitch[];
  links: Link[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
  tool: Tool;
  onMoveStitch: (stitchId: string, offsetX: number, offsetY: number) => void;
  annotations: DiagramAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (annotation: DiagramAnnotation) => void;
  onUpdateAnnotation: (annotation: DiagramAnnotation) => void;
};

export default function GrannyRenderer(props: Props) {
  return (
    <CircularRenderer
      {...props}
      showRoundLabels={false}
      showRoundGuides={false}
    />
  );
}
