"use client";

import Image from "next/image";
import { useState } from "react";
import {
  FilePlus2,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  Settings,
  CircleHelp,
} from "lucide-react";

import IconButton from "@/app/components/ui/IconButton";
import { colors } from "@/app/theme/colors";
import { spacing } from "@/app/theme/spacing";
import { shadows } from "@/app/theme/shadows";
import HelpModal from "@/app/components/dialogs/HelpModal";
import Input from "@/app/components/ui/Input";

type AppHeaderProps = {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportPDF: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  projectName: string;
  setProjectName: (value: string) => void;
};

export default function AppHeader({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  projectName,
  setProjectName,
}: AppHeaderProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleExport = (exportProject: () => void) => {
    setIsExportMenuOpen(false);
    exportProject();
  };

  return (
    <header
      style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        boxShadow: shadows.card,
      }}
    >
      {/* Ligne supérieure */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${spacing.md}px ${spacing.xl}px`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <Image
    src="/logo-cartomailles-v5.png"
    alt="Cartomailles"
    width={48}
    height={48}
/>

          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: colors.text,
              }}
            >
              Cartomailles
            </div>

            <div
              style={{
                width: 240,
                marginTop: 2,
              }}
            >
              <Input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Nom du projet"
                ariaLabel="Nom du projet"
                style={{
                  padding: "4px 8px",
                  fontSize: 13,
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <IconButton
  icon={<Settings size={18} />}
  onClick={() => {}}
  label="Paramètres"
/>

<IconButton
    icon={<CircleHelp size={18} />}
    onClick={() => setIsHelpOpen(true)}
    label="Aide"
/>
        </div>
      </div>

      {/* Barre d'outils */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.xl}px`,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <IconButton
  icon={<FilePlus2 size={18} />}
  onClick={onNewProject}
  label="Nouveau projet"
/>

        <IconButton
          icon={<FolderOpen size={18} />}
          onClick={onOpenProject}
          label="Ouvrir un projet"
        />

        <IconButton
          icon={<Save size={18} />}
          onClick={onSaveProject}
          label="Enregistrer le projet"
        />

        <div style={{ position: "relative" }}>
          <IconButton
            icon={<Download size={18} />}
            onClick={() => setIsExportMenuOpen((isOpen) => !isOpen)}
            label="Exporter le diagramme"
          />

          {isExportMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 46,
                left: 0,
                zIndex: 10,
                minWidth: 150,
                padding: spacing.xs,
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                boxShadow: shadows.card,
              }}
            >
              <button
                onClick={() => handleExport(onExportPNG)}
                style={{
                  width: "100%",
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  textAlign: "left",
                  color: colors.text,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                Exporter en PNG
              </button>
              <button
                onClick={() => handleExport(onExportSVG)}
                style={{
                  width: "100%",
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  textAlign: "left",
                  color: colors.text,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                Exporter en SVG
              </button>
              <button
                onClick={() => handleExport(onExportPDF)}
                style={{
                  width: "100%",
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  textAlign: "left",
                  color: colors.text,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                Exporter en PDF
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            width: 1,
            height: 24,
            background: colors.border,
            marginInline: spacing.sm,
          }}
        />

        <IconButton
          icon={<Undo2 size={18} />}
          onClick={onUndo}
          label="Annuler"
          disabled={!canUndo}
        />

        <IconButton
          icon={<Redo2 size={18} />}
          onClick={onRedo}
          label="Rétablir"
          disabled={!canRedo}
        />
        
      </div>
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </header>
  );
}
