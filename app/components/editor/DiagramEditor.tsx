import CircularRenderer from "../renderer/CircularRenderer";
import FlatRenderer from "../renderer/FlatRenderer";
import GrannyRenderer from "../renderer/GrannyRenderer";
import { Tool } from "@/app/lib/engine/model/Tool";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import type { RefObject } from "react";
import { DiagramAnnotation } from "@/app/lib/annotations";

type Props = {
  diagramType: "circular" | "flat" | "granny";
  stitches: PositionedStitch[];
  links: Link[];
  tool: Tool;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
  onMoveStitch: (stitchId: string, offsetX: number, offsetY: number) => void;
  annotations: DiagramAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (annotation: DiagramAnnotation) => void;
  onUpdateAnnotation: (annotation: DiagramAnnotation) => void;
};

export default function DiagramEditor({
  diagramType,
  tool,
  stitches,
  links,
  selectedId,
  onSelect,
  diagramRef,
  onMoveStitch,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
}: Props) {

  const annotationProps = { annotations, selectedAnnotationId, onSelectAnnotation, onAddAnnotation, onUpdateAnnotation };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {diagramType === "flat" ? (
        <FlatRenderer
          {...annotationProps}
          stitches={stitches}
          links={links}
          selectedId={selectedId}
          onSelect={onSelect}
          diagramRef={diagramRef}
          onMoveStitch={onMoveStitch}
          tool={tool}
        />
      ) : diagramType === "granny" ? (
        <GrannyRenderer
          {...annotationProps}
          stitches={stitches}
          links={links}
          selectedId={selectedId}
          onSelect={onSelect}
          diagramRef={diagramRef}
          onMoveStitch={onMoveStitch}
          tool={tool}
        />
      ) : (
        <CircularRenderer
          {...annotationProps}
          stitches={stitches}
          links={links}
          selectedId={selectedId}
          onSelect={onSelect}
          diagramRef={diagramRef}
          onMoveStitch={onMoveStitch}
          tool={tool}
        />
      )}
    </div>
  );
}
