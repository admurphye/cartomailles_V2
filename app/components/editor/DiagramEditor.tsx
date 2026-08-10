import CircularRenderer from "../renderer/CircularRenderer";
import FlatRenderer from "../renderer/FlatRenderer";
import GrannyRenderer from "../renderer/GrannyRenderer";
import { Tool } from "@/app/lib/engine/model/Tool";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import type { RefObject } from "react";

type Props = {
  diagramType: "circular" | "flat" | "granny";
  stitches: PositionedStitch[];
  links: Link[];
  tool: Tool;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
  onMoveStitch: (stitchId: string, offsetX: number, offsetY: number) => void;
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
}: Props) {

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {diagramType === "flat" ? (
        <FlatRenderer
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
