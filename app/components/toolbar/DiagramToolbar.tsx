import { colors } from "@/app/theme/colors";
import {
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import IconButton from "@/app/components/ui/IconButton";
import { Tool } from "@/app/lib/engine/model/Tool";
import { Hand, Ban } from "lucide-react";
import {Move,} from "lucide-react";

interface DiagramToolbarProps {
  diagramType: "circular" | "flat";
  setDiagramType: (type: "circular" | "flat") => void;
  resetView: () => void;
  tool: Tool;
  setTool: (tool: Tool) => void;
  zoom: number;
setZoom: Dispatch<SetStateAction<number>>;
}

export default function DiagramToolbar({
  diagramType,
  setDiagramType,
  resetView,
  tool,
  setTool, 
  setZoom,
}: DiagramToolbarProps) {

  return (
    <div className="flex items-center justify-between border-b pb-3">

      <div className="flex items-center gap-2">

        <IconButton
          icon={<ZoomIn />}
          label="Zoom avant"
          onClick={() =>
  setZoom((z) => Math.min(4, z + 0.1))
}
        />

        <IconButton
          icon={<ZoomOut />}
          label="Zoom arrière"
          onClick={() =>
  setZoom((z) => Math.max(0.2, z - 0.1))
}
        />

       <IconButton
    icon={<Ban />}
    active={tool === "select"}
    onClick={() => setTool("select")}
    label="Sélectionner"
/>

<IconButton
    icon={<Hand />}
    active={tool === "pan"}
    onClick={() => setTool("pan")}
    label="Déplacer la vue"
/>
<IconButton
  icon={<Move />}
  active={tool === "moveStitch"}
  onClick={() => setTool("moveStitch")}
  label="Déplacer une maille"
/>
<IconButton
    icon={<LocateFixed />}
    onClick={resetView}
    label="Réinitialiser la vue"
/>
        </div>

     <div
  className="flex overflow-hidden rounded-lg"
  style={{ border: `1px solid ${colors.border}` }}
>
  <button
    onClick={() => setDiagramType("circular")}
    style={{
      backgroundColor:
        diagramType === "circular" ? colors.primary : colors.surface,
      color: colors.text,
    }}
    className="px-3 py-2 text-sm transition-colors"
  >
    ⭕ Circulaire
  </button>

  <button
    onClick={() => setDiagramType("flat")}
    style={{
      backgroundColor:
        diagramType === "flat" ? colors.primary : colors.surface,
      color: colors.text,
    }}
    className="px-3 py-2 text-sm transition-colors"
  >
    📏 Plat
  </button>
    </div>
     </div>
  );
}
