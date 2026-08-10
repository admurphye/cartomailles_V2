import PatternPanel from "../panels/PatternPanel";
import DiagramPanel from "../renderer/DiagramPanel";
import PropertiesPanel from "../panels/PropertiesPanel";
import { Tool } from "@/app/lib/engine/model/Tool";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import { StitchAdjustments } from "@/app/lib/engine/model/StitchAdjustments";
import type { RefObject } from "react";
import { ParseIssue } from "@/app/lib/engine/model/ParseIssue";
import { StitchType } from "@/app/lib/engine/model/Stitch";

type WorkspaceProps = {
   adjustments: StitchAdjustments;

  setAdjustments: React.Dispatch<
    React.SetStateAction<StitchAdjustments>
  >;

  pattern: string;
  setPattern: (value: string) => void;
  issues: ParseIssue[];

  tool: Tool;
  setTool: (tool: Tool) => void;

  stitches: PositionedStitch[];
  links: Link[];

  selected: PositionedStitch | null;

  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeStitchType: (type: StitchType) => void;
  onUpdateStitchPosition: (stitchId: string, offsetX: number, offsetY: number) => void;
  onResetStitchPosition: (stitchId: string) => void;

  diagramType: "circular" | "flat" | "granny";
setDiagramType: (
  value: "circular" | "flat" | "granny"
) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
};

export default function Workspace({
  pattern,
  setPattern,
  issues,

  diagramType,
  setDiagramType,

  tool,
  setTool,

  stitches,
  links,
  selected,
  selectedId,
  onSelect,
  onChangeStitchType,
  onUpdateStitchPosition,
  onResetStitchPosition,
  adjustments,
  setAdjustments,
  diagramRef,
}: WorkspaceProps) {

  return (
    <main
      style={{
        flex: 1,
        minHeight: 0,
        padding: 20,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px minmax(700px, 1fr) 320px",
          alignItems: "stretch",
          gap: 20,
          height: "100%",
          minHeight: 0,
        }}
      >
        <PatternPanel
          pattern={pattern}
          setPattern={setPattern}
          issues={issues}
        />
<DiagramPanel
  diagramType={diagramType}
  setDiagramType={setDiagramType}

  tool={tool}
  setTool={setTool}

  stitches={stitches}
  links={links}
  selectedId={selectedId}
  onSelect={onSelect}
  diagramRef={diagramRef}
  onMoveStitch={onUpdateStitchPosition}
/>

        <PropertiesPanel
          selected={selected}
          onChangeType={onChangeStitchType}
          onUpdatePosition={onUpdateStitchPosition}
          onResetPosition={onResetStitchPosition}
        />
      </div>
    </main>
  );
}
