"use client";

import { useState } from "react";
import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { drawSymbol } from "./lib/drawSymbol";
import DiagramToolbar from "./components/DiagramToolbar";
import SummaryPanel from "./components/SummaryPanel";
import CircularDiagram from "./components/CircularDiagram";
import { exportPNG } from "./lib/exportPNG";
import { exportSVG } from "./lib/exportSVG";
import { exportPDF } from "./lib/exportPDF";
import FlatDiagram from "./components/FlatDiagram";
import { saveProject } from "./lib/saveProject";
import { openProject } from "./lib/openProject";
import { Stitch } from "./lib/types";
import Card from "@/app/components/ui/Card";
import Image from "next/image";
import { colors } from "./theme/colors";
import Input from "@/app/components/ui/Input";
import TextArea from "@/app/components/ui/TextArea";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import Select from "@/app/components/ui/Select";
import PreferencesPanel from "@/app/components/panels/PreferencesPanel";
import SymbolsPanel from "@/app/components/panels/SymbolsPanel";
import ProjectPanel from "@/app/components/panels/ProjectPanel";
import PatternPanel from "@/app/components/panels/PatternPanel";
import { parsePatternFlat } from "./lib/flat/parsePatternFlat";
import { parsePatternCircular } from "./lib/circular/parsePatternCircular";

const SYMBOL_LABELS: Record<string, string> =
  Object.values(CROCHET_SYMBOLS)
    .reduce((acc, item) => {

      acc[item.code] = item.name;

      return acc;
    }, {} as Record<string, string>);

const cardStyle = {
  padding: "15px",
  border: `1px solid ${colors.border}`,
  borderRadius: "18px",
  background: colors.surface,
};
// =====================================================
// ÉTATS DE L'APPLICATION
// =====================================================
export default function Home() {
  const [pattern, setPattern] = useState("");
  const [diagramType, setDiagramType] =
  useState("circular");
  const [analysis, setAnalysis] = useState("");
 const [firstRoundCount, setFirstRoundCount] = useState<number>(0);
  const [roundCounts, setRoundCounts] = useState<number[]>([]);
  const [roundSymbols, setRoundSymbols] =  useState<string[][]>([]);
  const [cells, setCells] = useState<(string | null)[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [hasMR, setHasMR] = useState(false);
  const [projectName, setProjectName] =  useState("");
  const [exportMode, setExportMode] = useState(false);
  const [roundStitches, setRoundStitches] =  useState<Stitch[][]>([]);
// =====================================================
// ANALYSE DU PATRON ET GÉNÉRATION DU DIAGRAMME
// =====================================================
  const generateFromText = () => {
        const lines = pattern
  .split("\n")
  .filter(line => line.trim() !== ""
);
setHasMR(
  pattern.toLowerCase().includes("mr") ||
  pattern.toLowerCase().includes("cercle magique")
);

let result;

if (diagramType === "flat") {
  result = parsePatternFlat(pattern);
} else {
  result = parsePatternCircular(pattern);
}

  console.log("result", result);
  console.log("roundStitches", result.roundStitches);

  setRoundCounts(result.counts);
  setAnalysis(result.analysis);
  setCells(result.cells);
  setRoundSymbols(result.roundSymbols);
  setHasMR(result.hasMR);
  setRoundStitches(result.roundStitches);
  
//console.log(result);
    
   const firstLineWithNumber = lines.find(line => /\d/.test(line));

if (firstLineWithNumber) {

  const firstNumbers = firstLineWithNumber.match(/\d+/g);

  if (firstNumbers) {

    const value =
      firstNumbers.length > 1
        ? parseInt(firstNumbers[1])
        : parseInt(firstNumbers[0]);

    setFirstRoundCount(value);

  }

}
  };
const handleExportPDF = () =>
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

const handleExportSVG = () => exportSVG(setExportMode);

const handleSaveProject = () => {

  saveProject({
    projectName,
    pattern,
    diagramType,
  });
};

const handleOpenProject = () => {

  openProject((data) => {

    setProjectName(
      data.projectName || ""
    );

    setPattern(
      data.pattern || ""
    );

    setDiagramType(
      data.diagramType || "circular"
    );

    // Régénération automatique
    const result = parsePatternV2(
      data.pattern || ""
    );

    setRoundCounts(result.counts);
    setAnalysis(result.analysis);
    setCells(result.cells);
    setRoundSymbols(result.roundSymbols);
    setHasMR(result.hasMR);
  });
};


  return (
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
<div
  style={{
    width: "350px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  }}
>

{/* =====================================================
    TITRE ET LOGO
===================================================== */}
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
  {/* =====================================================
    PANNEAU DE CONFIGURATION
===================================================== */}
  
 <PreferencesPanel
  diagramType={diagramType}
  setDiagramType={setDiagramType}
/>

<SymbolsPanel />


{/* =====================================================
    SAISIE DU PATRON
===================================================== */}
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
</div> {/* fin colonne gauche */}

<div
  style={{
    flex: 1,
    border: "1px solid #333",
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
  exportPNG={exportPNG}
  exportSVG={handleExportSVG}
  exportPDF={handleExportPDF}
  openProject={handleOpenProject}
  saveProject={handleSaveProject}
/>

{/* Zone exportable */}
<div
  id="diagram-container"
  style={{
    transform: `scale(${zoom})`,
    transformOrigin: "top center",
  }}
>  
{/* =====================================================
    DIAGRAMME PLAT
===================================================== */}
 {diagramType === "flat" && (
<FlatDiagram
  roundStitches={roundStitches}
  exportMode={exportMode}
/>
)}
{/* =====================================================
    DIAGRAMME CIRCULAIRE
===================================================== */}
{diagramType === "circular" && (
     <CircularDiagram
    roundStitches={roundStitches}
        hasMR={hasMR}
        exportMode={exportMode}
      />
)}
  
</div> {/* diagram-container */}

</div> {/* colonne droite */}

</div> {/* conteneur principal flex */}
</main>
  );
}