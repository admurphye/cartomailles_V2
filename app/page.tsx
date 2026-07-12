"use client";

import { useState } from "react";
import Image from "next/image";

import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { exportPNG } from "./lib/exportPNG";
import { exportSVG } from "./lib/exportSVG";
import { exportPDF } from "./lib/exportPDF";
import { saveProject } from "./lib/saveProject";
import { openProject } from "./lib/openProject";

import { parsePatternFlat } from "./lib/flat/parsePatternFlat";
import { parsePatternCircular } from "./lib/circular/parsePatternCircular";

import { Stitch } from "./lib/types";

import DiagramToolbar from "./components/DiagramToolbar";
import SummaryPanel from "./components/SummaryPanel";
import CircularDiagram from "./components/CircularDiagram";
import FlatDiagram from "./components/FlatDiagram";

import PreferencesPanel from "./components/panels/PreferencesPanel";
import SymbolsPanel from "./components/panels/SymbolsPanel";
import ProjectPanel from "./components/panels/ProjectPanel";
import PatternPanel from "./components/panels/PatternPanel";

import { colors } from "./theme/colors";

const SYMBOL_LABELS: Record<string, string> =
  Object.values(CROCHET_SYMBOLS).reduce(
    (acc, item) => {
      acc[item.code] = item.name;
      return acc;
    },
    {} as Record<string, string>
  );

const cardStyle = {
  padding: "15px",
  border: `1px solid ${colors.border}`,
  borderRadius: "18px",
  background: colors.surface,
};

export default function Home() {

  const [pattern, setPattern] = useState("");

  const [diagramType, setDiagramType] =
    useState("circular");

  const [analysis, setAnalysis] =
    useState("");

  const [firstRoundCount, setFirstRoundCount] =
    useState(0);

  const [roundCounts, setRoundCounts] =
    useState<number[]>([]);

  const [cells, setCells] =
    useState<(string | null)[][]>([]);

  const [zoom, setZoom] =
    useState(1);

  const [hasMR, setHasMR] =
    useState(false);

  const [projectName, setProjectName] =
    useState("");

  const [exportMode, setExportMode] =
    useState(false);

  const [roundStitches, setRoundStitches] =
    useState<Stitch[][]>([]);

  const [roundSymbols, setRoundSymbols] =
    useState<string[][]>([]);

// =====================================================
// ANALYSE DU PATRON
// =====================================================

const loadPattern = (
  patternText: string,
  type: string
) => {

  const lines = patternText
    .split("\n")
    .filter(line => line.trim() !== "");

  const result =
    type === "flat"
      ? parsePatternFlat(patternText)
      : parsePatternCircular(patternText);

  setRoundCounts(result.counts);
  setAnalysis(result.analysis);
  setCells(result.cells);
  setRoundSymbols(result.roundSymbols);
  setRoundStitches(result.roundStitches);
  setHasMR(result.hasMR);

  const firstLineWithNumber =
    lines.find(line => /\d/.test(line));

  if (firstLineWithNumber) {

    const firstNumbers =
      firstLineWithNumber.match(/\d+/g);

    if (firstNumbers) {

      const firstRound =
        firstNumbers.length > 1
          ? Number(firstNumbers[1])
          : Number(firstNumbers[0]);

      setFirstRoundCount(firstRound);

    } else {

      setFirstRoundCount(0);

    }

  } else {

    setFirstRoundCount(0);

  }

};

// =====================================================
// GÉNÉRATION
// =====================================================

const generateFromText = () => {

  loadPattern(
    pattern,
    diagramType
  );

};

// =====================================================
// EXPORTS
// =====================================================

const handleExportPNG = () => {

  exportPNG();

};

const handleExportSVG = () => {

  exportSVG(setExportMode);

};

const handleExportPDF = () => {

  exportPDF(
    projectName,
    firstRoundCount,
    roundCounts,
    pattern,
    roundSymbols,
    hasMR,
    SYMBOL_LABELS,
    setExportMode
  );

};

// =====================================================
// SAUVEGARDE
// =====================================================

const handleSaveProject = () => {

  saveProject({
    projectName,
    pattern,
    diagramType,
  });

};

const handleOpenProject = () => {

  openProject((data) => {

    const newPattern =
      data.pattern ?? "";

    const newType =
      data.diagramType ?? "circular";

    setProjectName(
      data.projectName ?? ""
    );

    setPattern(newPattern);

    setDiagramType(newType);

    loadPattern(
      newPattern,
      newType
    );

  });

};

