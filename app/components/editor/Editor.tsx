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
import { Instruction } from "@/app/lib/engine/model/Instruction";
import { StitchType } from "@/app/lib/engine/model/Stitch";
import { usePreferences } from "../preferences/PreferencesContext";

type ProjectState = Pick<
  CartomaillesProject,
  "projectName" | "pattern" | "diagramType"
>;

type HistoryEntry = Pick<ProjectState, "pattern" | "diagramType">;

const STITCH_CODES: Record<StitchType, string> = {
  mr: "mr",
  ch: "ml",
  slst: "mc",
  sc: "ms",
  hdc: "db",
  dc: "br",
  fpdc: "brAV",
  bpdc: "brAR",
  tr: "tb",
  dtr: "dbr",
};

type PatternItem = {
  type: StitchType;
  operation: Instruction["operation"];
};

function formatRound(
  roundNumber: number,
  instructions: Instruction[],
  selectedOrder: number,
  selectedRound: number,
  nextType: StitchType
) {
  const items: PatternItem[] = [];
  let order = 1;

  instructions.forEach((instruction) => {
    for (let repeat = 0; repeat < instruction.count; repeat++) {
      if (instruction.operation !== "normal") {
        items.push({
          type: instruction.type,
          operation: instruction.operation,
        });
        order += instruction.produces;
        continue;
      }

      for (let output = 0; output < instruction.produces; output++) {
        items.push({
          type:
            roundNumber === selectedRound &&
            order === selectedOrder
              ? nextType
              : instruction.type,
          operation: instruction.operation,
        });
        order++;
      }
    }
  });

  const groups: PatternItem[][] = [];

  items.forEach((item) => {
    const previousGroup = groups.at(-1);
    const previousItem = previousGroup?.[0];

    if (
      previousItem &&
      previousItem.type === item.type &&
      previousItem.operation === item.operation
    ) {
      previousGroup.push(item);
      return;
    }

    groups.push([item]);
  });

  return groups.map((group) => {
    const { type, operation } = group[0];
    const code = STITCH_CODES[type];

    if (operation === "increase") {
      return `${group.length} aug(${code})`;
    }

    if (operation === "decrease") {
      return `${group.length} dim(${code})`;
    }

    return `${group.length} ${code}`;
  }).join(" ");
}

function isProjectState(value: unknown): value is ProjectState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const project = value as Record<string, unknown>;

  const hasValidCoreFields =
    typeof project.projectName === "string" &&
    typeof project.pattern === "string" &&
    (project.diagramType === "circular" ||
      project.diagramType === "flat" ||
      project.diagramType === "granny");

  if (!hasValidCoreFields) {
    return false;
  }

  const isLegacyProject =
    project.format === undefined && project.version === undefined;

  const isCurrentProject =
    project.format === "cartomailles" && project.version === 1;

  return isLegacyProject || isCurrentProject;
}

function isStitchAdjustments(value: unknown): value is StitchAdjustments {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.values(value).every((adjustment) => {
    if (typeof adjustment !== "object" || adjustment === null) {
      return false;
    }

    const entry = adjustment as Record<string, unknown>;
    return (
      typeof entry.stitchId === "string" &&
      typeof entry.offsetX === "number" &&
      typeof entry.offsetY === "number"
    );
  });
}

export default function Editor() {
  const { preferences } = usePreferences();
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
    useState<"circular" | "flat" | "granny">(preferences.defaultDiagramType);

  const [tool, setTool] =
    useState<Tool>("select");

  const {
    graph,
    positioned,
    selected,
  } = useCrochetEngine(
    pattern,
    selectedId,
    diagramType,
    adjustments
  );

  const handleNewProject = () => {
    setProjectName("Projet sans titre");
    setPattern("");
    setDiagramType(preferences.defaultDiagramType);
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

  const handleDiagramTypeChange = (value: "circular" | "flat" | "granny") => {
    if (value === diagramType) {
      return;
    }

    saveHistoryEntry();
    setDiagramType(value);
  };

  const handleChangeStitchType = (nextType: StitchType) => {
    if (!selected || selected.operation !== "normal" || selected.type === nextType) {
      return;
    }

    const nextPattern = graph.rounds
      .map((round) =>
        formatRound(
          round.number,
          round.instructions,
          selected.order,
          selected.round,
          nextType
        )
      )
      .join("\n");

    saveHistoryEntry();
    setPattern(nextPattern);
  };

  const handleUpdateStitchPosition = (
    stitchId: string,
    offsetX: number,
    offsetY: number
  ) => {
    setAdjustments((current) => ({
      ...current,
      [stitchId]: { stitchId, offsetX, offsetY },
    }));
  };

  const handleResetStitchPosition = (stitchId: string) => {
    setAdjustments((current) => {
      const remaining = { ...current };
      delete remaining[stitchId];
      return remaining;
    });
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
      adjustments,
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
      setAdjustments(
        isStitchAdjustments(
          (data as Record<string, unknown>).adjustments
        )
          ? (data as Record<string, unknown>).adjustments as StitchAdjustments
          : {}
      );
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
      canUndo={undoHistory.length > 0}
      canRedo={redoHistory.length > 0}
      projectName={projectName}
      setProjectName={setProjectName}
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
        onChangeStitchType={handleChangeStitchType}
        onUpdateStitchPosition={handleUpdateStitchPosition}
        onResetStitchPosition={handleResetStitchPosition}

        diagramRef={diagramRef}
      />
    </MainLayout>
  );
}
