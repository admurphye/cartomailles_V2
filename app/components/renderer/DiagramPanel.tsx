import Card from "@/app/components/ui/Card";
import DiagramToolbar from "../toolbar/DiagramToolbar";
import { Tool } from "@/app/lib/engine/model/Tool";
import DiagramEditor from "../editor/DiagramEditor";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import DiagramCanvas from "./DiagramCanvas";
import { ScanSearch } from "lucide-react";
import { colors } from "@/app/theme/colors";
import { useState } from "react";
import type { RefObject } from "react";

type Props = {
  diagramType: "circular" | "flat";
  setDiagramType: (
    value: "circular" | "flat"
  ) => void;
tool: Tool;
setTool: (tool: Tool) => void;
  stitches: PositionedStitch[];
  links: Link[];

  selectedId: string | null;
  onSelect: (id: string | null) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
  onMoveStitch: (stitchId: string, offsetX: number, offsetY: number) => void;
};

export default function DiagramPanel({
  diagramType,
  setDiagramType,
  tool,
  setTool,
  stitches,
  links,
  selectedId,
  onSelect,
  diagramRef,
  onMoveStitch,
}: Props) {

  const [zoom, setZoom] = useState(1);

  const [offset, setOffset] = useState({
  x: 0,
  y: 0,
});

  return (
    <Card
      title="Diagramme"
      icon={<ScanSearch size={18} />}
      style={{
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
     <DiagramToolbar
  diagramType={diagramType}
  setDiagramType={setDiagramType}
  tool={tool}
  setTool={setTool}
  zoom={zoom}
  setZoom={setZoom}
  resetView={() => {
  setZoom(1);
  setOffset({
    x: 0,
    y: 0,
  });
}}
/>

      <div
        className="mt-4 rounded-xl border overflow-hidden"
        style={{
          backgroundColor: colors.canvas,
          background: "#ffffff",
          flex: 1,
          minHeight: 0,
        }}
      >
       <DiagramCanvas
  zoom={zoom}
  setZoom={setZoom}
  tool={tool}
  offset={offset}
  setOffset={setOffset}
>

  <DiagramEditor
    diagramType={diagramType}
    tool={tool}
    stitches={stitches}
    links={links}
    selectedId={selectedId}
    onSelect={onSelect}
    diagramRef={diagramRef}
    onMoveStitch={onMoveStitch}
  />

</DiagramCanvas>
      </div>
    </Card>
  );
}
