import React from "react";

import {
  Map,
  ZoomIn,
  ZoomOut,
  Image,
  FileImage,
  FileText,
  FolderOpen,
  Save,
} from "lucide-react";

import ToolbarButton from "@/app/components/ui/ToolbarButton";
import IconButton from "@/app/components/ui/IconButton";
import PanelTitle from "@/app/components/ui/PanelTitle";
import { colors } from "@/app/theme/colors";
import { spacing } from "@/app/theme/spacing";

type DiagramToolbarProps = {
  diagramType: string;
  zoom: number;
  setZoom: React.Dispatch<
    React.SetStateAction<number>
  >;
  exportPNG: () => void;
  exportSVG: () => void;
  exportPDF: () => void;
  saveProject: () => void;
  openProject: () => void;
};

export default function DiagramToolbar({
  diagramType,
  zoom,
  setZoom,
  exportPNG,
  exportSVG,
  exportPDF,
  openProject,
  saveProject,
}: DiagramToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.lg,
      }}
    >
      <PanelTitle
        title={`Diagramme ${
          diagramType === "flat"
            ? "plat"
            : "circulaire"
        }`}
        icon={<Map />}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <IconButton
          icon={<ZoomIn color={colors.secondary} />}
          onClick={() =>
            setZoom((z) => z + 0.1)
          }
        />

        <IconButton
          icon={<ZoomOut color={colors.secondary} />}
          onClick={() =>
            setZoom((z) =>
              Math.max(0.5, z - 0.1)
            )
          }
        />

        <span
          style={{
            color: colors.textSecondary,
            minWidth: 55,
            textAlign: "center",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <ToolbarButton
          icon={<Image color={colors.secondary} />}
          onClick={exportPNG}
        >
          PNG
        </ToolbarButton>

        <ToolbarButton
          icon={<FileImage color={colors.secondary} />}
          onClick={exportSVG}
        >
          SVG
        </ToolbarButton>

        <ToolbarButton
          icon={<FileText color={colors.secondary} />}
          onClick={exportPDF}
        >
          PDF
        </ToolbarButton>

        <ToolbarButton
          icon={<FolderOpen color={colors.secondary} />}
          onClick={openProject}
        >
          Ouvrir
        </ToolbarButton>

        <ToolbarButton
          icon={<Save color={colors.secondary} />}
          onClick={saveProject}
        >
          Sauvegarder
        </ToolbarButton>
      </div>
    </div>
  );
}