import { Ban, Hand, LocateFixed, Move, MousePointer2, TextCursorInput, ZoomIn, ZoomOut } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import IconButton from "@/app/components/ui/IconButton";
import { Tool } from "@/app/lib/engine/model/Tool";
import { colors } from "@/app/theme/colors";

interface DiagramToolbarProps {
  diagramType: "circular" | "flat" | "granny";
  setDiagramType: (type: "circular" | "flat" | "granny") => void;
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
  zoom,
  setZoom,
}: DiagramToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b pb-3">
      <div className="flex items-center gap-2" role="toolbar" aria-label="Outils du diagramme">
        <IconButton
          icon={<ZoomIn />}
          label="Zoom avant"
          onClick={() => setZoom((value) => Math.min(4, Number((value + 0.1).toFixed(1))))}
        />
        <IconButton
          icon={<ZoomOut />}
          label="Zoom arrière"
          onClick={() => setZoom((value) => Math.max(0.2, Number((value - 0.1).toFixed(1))))}
        />
        <output
          className="min-w-14 text-center text-sm tabular-nums"
          aria-label={`Niveau de zoom : ${Math.round(zoom * 100)} %`}
          aria-live="polite"
        >
          {Math.round(zoom * 100)} %
        </output>
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
        <IconButton icon={<TextCursorInput />} active={tool === "text"} onClick={() => setTool("text")} label="Ajouter une annotation" />
        <IconButton icon={<MousePointer2 />} active={tool === "arrow"} onClick={() => setTool("arrow")} label="Ajouter une flèche" />
        <IconButton
          icon={<LocateFixed />}
          onClick={resetView}
          label="Réinitialiser la vue"
        />
      </div>

      <div
        className="flex overflow-hidden rounded-lg"
        style={{ border: `1px solid ${colors.border}` }}
        role="group"
        aria-label="Type de diagramme"
      >
        {([
          ["circular", "⭕ Circulaire"],
          ["flat", "📏 Plat"],
          ["granny", "◻ Granny"],
        ] as const).map(([type, label]) => (
          <button
            key={type}
            type="button"
            aria-pressed={diagramType === type}
            onClick={() => setDiagramType(type)}
            style={{
              backgroundColor: diagramType === type ? colors.primary : colors.surface,
              color: colors.text,
            }}
            className="px-3 py-2 text-sm transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
