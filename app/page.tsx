"use client";

import BetaPage from "./beta/page";
import PasswordGate from "./components/PasswordGate";
import Image from "next/image";
import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";

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
import HelpModal from "./components/HelpModal";

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

  
  const [helpOpen, setHelpOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

    const PASSWORD = "Cartomailles2026";

const [authorized, setAuthorized] = useState(false);
const [password, setPassword] = useState("");

useEffect(() => {
  if (localStorage.getItem("cartomailles-auth") === "ok") {
    setAuthorized(true);
  }
}, []);
function checkPassword() {
  if (password === PASSWORD) {
    localStorage.setItem("cartomailles-auth", "ok");
    setAuthorized(true);
  } else {
    alert("Mot de passe incorrect.");
  }
}
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
if (!showEditor) {
  return (
    <BetaPage
      onNewProject={() => setShowEditor(true)}
      onOpenProject={() => {
        handleOpenProject();
        setShowEditor(true);
      }}
    />
  );
}
if (!authorized) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#231D29]">
      <div className="bg-[#2C2433] p-8 rounded-2xl shadow-xl border border-pink-500 w-[380px]">

        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Accès bêta Cartomailles
        </h2>

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") checkPassword();
          }}
          className="w-full rounded-lg bg-[#1F1A24] border border-pink-400 px-4 py-3 text-white outline-none"
        />

        <button
          onClick={checkPassword}
          className="w-full mt-5 rounded-lg bg-[#D98CA8] hover:bg-[#E8A4BD] text-white font-semibold py-3 transition"
        >
          Entrer
        </button>

      </div>
    </div>
  );
}
return (
  <PasswordGate>

    <main
      style={{
        padding: "20px",
        maxWidth: "1400px",
        margin: "0 auto",
        background: colors.background,
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >

 
        {/* ==========================
            COLONNE GAUCHE
        ========================== */}

        <div
          style={{
            width: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Image
              src="/logo-cartomailles-v5.png"
              alt="Cartomailles"
              width={190}
              height={190}
              priority
            />
          </div>

<button
  onClick={() => setHelpOpen(true)}
  className="w-full flex items-center justify-center gap-2
             rounded-xl border border-[#6b3b63]
             bg-[#2c2435]
             hover:bg-pink-700/20
             px-4 py-3
             text-white
             transition"
>
  <span>📖 Guide d'utilisation</span>
</button>

          <PreferencesPanel
            diagramType={diagramType}
            setDiagramType={setDiagramType}
          />

          <SymbolsPanel />

          <div style={cardStyle}>
            <ProjectPanel
              projectName={projectName}
              setProjectName={setProjectName}
            />
          </div>

          <div style={cardStyle}>
            <PatternPanel
              pattern={pattern}
              setPattern={setPattern}
              generateFromText={generateFromText}
            />
          </div>
        </div>

        {/* ==========================
            COLONNE DROITE
        ========================== */}

        <div
          style={{
            flex: 1,
            borderRadius: "12px",
            padding: "20px",
            background: colors.workspace,
            overflow: "auto",
            border: `1px solid ${colors.border}`,
          }}
        >
          <SummaryPanel
            firstRoundCount={firstRoundCount}
            roundCounts={roundCounts}
            analysis={analysis}
          />

          <DiagramToolbar
            diagramType={diagramType}
            zoom={zoom}
            setZoom={setZoom}
            exportPNG={handleExportPNG}
            exportSVG={handleExportSVG}
            exportPDF={handleExportPDF}
            openProject={handleOpenProject}
            saveProject={handleSaveProject}
          />

          <div
            id="diagram-container"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            {diagramType === "flat" && (
              <FlatDiagram
                roundStitches={roundStitches}
                exportMode={exportMode}
              />
            )}

            {diagramType === "circular" && (
              <CircularDiagram
                roundStitches={roundStitches}
                hasMR={hasMR}
                exportMode={exportMode}
              />
            )}
          </div>
        </div>
      </div>
      <HelpModal
  isOpen={helpOpen}
  onClose={() => setHelpOpen(false)}
/>
        </main>

  </PasswordGate>
);

}
