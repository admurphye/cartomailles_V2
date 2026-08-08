import { useRef, useState } from "react";
import { Tool } from "@/app/lib/engine/model/Tool";
import MainLayout from "../layout/MainLayout";
import Workspace from "../workspace/Workspace";
import { StitchAdjustments } from "@/app/lib/engine/model/StitchAdjustments";
import { useCrochetEngine } from "@/app/hooks/useCrochetEngine";
import {
  saveProject,
  type CartomaillesProject,
} from "@/app/lib/saveProject";
import { openProject } from "@/app/lib/openProject";
import { exportPNG } from "@/app/components/renderer/exports/exportPNG";
import { exportSVG } from "@/app/components/renderer/exports/exportSVG";
import { exportPDF } from "@/app/components/renderer/exports/exportPDF";

type ProjectState = Pick<
  CartomaillesProject,
  "projectName" | "pattern" | "diagramType"
>;

type HistoryEntry = Pick<ProjectState, "pattern" | "diagramType">;

function isProjectState(value: unknown): value is ProjectState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const project = value as Record<string, unknown>;

  const hasValidCoreFields =
    typeof project.projectName === "string" &&
    typeof project.pattern === "string" &&
    (project.diagramType === "circular" || project.diagramType === "flat");

  if (!hasValidCoreFields) {
    return false;
  }

  const isLegacyProject =
    project.format === undefined && project.version === undefined;

  const isCurrentProject =
    project.format === "cartomailles" && project.version === 1;

  return isLegacyProject || isCurrentProject;
}

export default function Editor() {
  const diagramRef = useRef<SVGSVGElement>(null);

  const [projectName, setProjectName] =
    useState("Projet sans titre");

  const [pattern, setPattern] = useState("");

  const [undoHistory, setUndoHistory] = useState<HistoryEntry[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistoryEntry[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [adjustments, setAdjustments] =
    useState<StitchAdjustments>({});

  const [diagramType, setDiagramType] =
    useState<"circular" | "flat">("circular");

  const [tool, setTool] =
    useState<Tool>("select");

  const {
    graph,
    positioned,
    selected,
  } = useCrochetEngine(
    pattern,
    selectedId,
    diagramType
  );

  const handleNewProject = () => {
    setProjectName("Projet sans titre");
    setPattern("");
    setSelectedId(null);
    setAdjustments({});
    setUndoHistory([]);
    setRedoHistory([]);
  };

  const saveHistoryEntry = () => {
    setUndoHistory((history) => [
      ...history,
      { pattern, diagramType },
    ]);
    setRedoHistory([]);
  };

  const handlePatternChange = (value: string) => {
    if (value === pattern) {
      return;
    }

    saveHistoryEntry();
    setPattern(value);
  };

  const handleDiagramTypeChange = (value: "circular" | "flat") => {
    if (value === diagramType) {
      return;
    }

    saveHistoryEntry();
    setDiagramType(value);
  };

  const handleUndo = () => {
    const previousEntry = undoHistory.at(-1);

    if (!previousEntry) {
      return;
    }

    setUndoHistory((history) => history.slice(0, -1));
    setRedoHistory((history) => [
      { pattern, diagramType },
      ...history,
    ]);
    setPattern(previousEntry.pattern);
    setDiagramType(previousEntry.diagramType);
    setSelectedId(null);
  };

  const handleRedo = () => {
    const nextEntry = redoHistory[0];

    if (!nextEntry) {
      return;
    }

    setRedoHistory((history) => history.slice(1));
    setUndoHistory((history) => [
      ...history,
      { pattern, diagramType },
    ]);
    setPattern(nextEntry.pattern);
    setDiagramType(nextEntry.diagramType);
    setSelectedId(null);
  };

  const handleSaveProject = () => {
    saveProject({
      format: "cartomailles",
      version: 1,
      projectName,
      pattern,
      diagramType,
    });
  };

  const handleOpenProject = () => {
    openProject((data) => {
      if (!isProjectState(data)) {
        return;
      }

      setProjectName(data.projectName);
      setPattern(data.pattern);
      setDiagramType(data.diagramType);
      setSelectedId(null);
      setUndoHistory([]);
      setRedoHistory([]);
    });
  };

  const handleExportPNG = () => {
    if (diagramRef.current) {
      void exportPNG(diagramRef.current, projectName);
    }
  };

  const handleExportSVG = () => {
    if (diagramRef.current) {
      exportSVG(diagramRef.current, projectName);
    }
  };

  const handleExportPDF = () => {
    if (diagramRef.current) {
      void exportPDF(diagramRef.current, projectName, pattern);
    }
  };

  return (
    <MainLayout
      onNewProject={handleNewProject}
      onOpenProject={handleOpenProject}
      onSaveProject={handleSaveProject}
      onExportPNG={handleExportPNG}
      onExportSVG={handleExportSVG}
      onExportPDF={handleExportPDF}
      onUndo={handleUndo}
      onRedo={handleRedo}
    >
      <Workspace
        pattern={pattern}
        setPattern={handlePatternChange}
        issues={graph.issues}

        diagramType={diagramType}
        setDiagramType={handleDiagramTypeChange}

        tool={tool}
        setTool={setTool}

        stitches={positioned}
        links={graph.links}

        selected={selected}
        selectedId={selectedId}
        onSelect={setSelectedId}

        adjustments={adjustments}
        setAdjustments={setAdjustments}
        diagramRef={diagramRef}
      />
    </MainLayout>
  );
}
