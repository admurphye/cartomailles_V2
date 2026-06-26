"use client";

import { useState } from "react";
import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { drawSymbol } from "./lib/drawSymbol";
import { parsePattern } from "./lib/parser";
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

const SYMBOL_LABELS: Record<string, string> =
  Object.values(CROCHET_SYMBOLS)
    .reduce((acc, item) => {

      acc[item.code] = item.name;

      return acc;
    }, {} as Record<string, string>);

const cardStyle = {
  padding: "15px",
  border: "1px solid #333",
  borderRadius: "12px",
  background: "#111",
};
// =====================================================
// ÉTATS DE L'APPLICATION
// =====================================================
export default function Home() {
  const [pattern, setPattern] = useState("");
  const [diagramType, setDiagramType] =
  useState("circular");
  const [analysis, setAnalysis] = useState("");
  const [firstRoundCount, setFirstRoundCount] = useState(6);
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

  const result = parsePattern(pattern);

  console.log("result", result);
  console.log("roundStitches", result.roundStitches);

  setRoundCounts(result.counts);
  setAnalysis(result.analysis);
  setCells(result.cells);
  setRoundSymbols(result.roundSymbols);
  setHasMR(result.hasMR);
  setRoundStitches(result.roundStitches);
  
//console.log(result);
    
    if (lines.length > 0) {
  const firstNumbers = lines[0].match(/\d+/g);

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
    const result = parsePattern(
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
  }}
>
     
  <Image
  src="/logo-cartomailles.png"
  alt="Cartomailles"
  width={420}
  height={120}
  priority
/>

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
    PANNEAU DE CONFIGURATION
===================================================== */}
  <Card
    title="Préférences"
    subtitle="Choisissez la forme du diagramme."
    icon={<span>⚙️</span>}
>
  <label
    style={{
      display: "block",
      marginBottom: 10,
      fontWeight: 500,
    }}
  >
    Type
  </label>

  <select
    value={diagramType}
    onChange={(e) => setDiagramType(e.target.value)}
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #494152",
      background: "#1F1B22",
      color: "#F8F5F2",
      fontSize: 15,
      outline: "none",
    }}
  >
    <option value="circular">
      Circulaire
    </option>

    <option value="flat">
      Plat
    </option>
  </select>
</Card>

<div style={cardStyle}>

<h3>📚 Bibliothèque des symboles</h3>
 <details>
     <ul>
    {Object.entries(CROCHET_SYMBOLS).map(
      ([key, value]) => (
        <li key={key}>
          {key} - {value.name} ({value.code})
        </li>
      )
    )}
  </ul>
  <summary>Afficher les symboles</summary>
</details>
</div>
<div style={cardStyle}>

{/* =====================================================
    SAISIE DU PATRON
===================================================== */}
<div style={cardStyle}>
  <h3>📁 Projet</h3>

  <input
    type="text"
    value={projectName}
    onChange={(e) =>
      setProjectName(e.target.value)
    }
    placeholder="Nom du projet"
    style={{
      width: "100%",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #333",
      background: "#0f0f0f",
      color: "white",
    }}
  />
</div>

<h3>📝 Patron</h3>
<p
  style={{
    fontSize: "14px",
    color: "#999",
    marginTop: "-5px",
    marginBottom: "10px",
  }}
>
  Colle ou écris ton patron crochet
</p>
      <textarea
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
       rows={10}
 style={{
  width: "100%",
  minHeight: "220px",
  background: "#0f0f0f",
  color: "white",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "12px",
  resize: "vertical",
  fontSize: "15px",
}}
        placeholder={`Exemple :

Cercle magique
6 mailles serrées
6 augmentations
2 mailles serrées, 1 augmentation x6
3 mailles serrées, 1 augmentation x6
`}
      />

      <br />
      <br />
<p
 style={{
  width: "100%",
  minHeight: "220px",
  marginBottom: "15px",
  background: "#0f0f0f",
  color: "white",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "12px",
  resize: "vertical",
  fontSize: "15px",

}}
>
  {pattern
    .split("\n")
    .filter(line => line.trim() !== "")
    .length}
  {" "}ligne(s)
</p>
<button
  onClick={generateFromText}
  style={{
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#8b5cf6",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(139,92,246,0.4)",
  }}
>
  ✨ Générer le diagramme
</button>
    </div> {/* fin carte patron */}
</div> {/* fin colonne gauche */}

<div
  style={{
    flex: 1,
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "20px",
    background: "#111",
    overflow: "auto",
    boxShadow: "0 0 20px rgba(139, 92, 246, 0.15)",
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
/>
)}
{/* =====================================================
    DIAGRAMME CIRCULAIRE
===================================================== */}
{diagramType === "circular" && (
      <CircularDiagram
        roundSymbols={roundSymbols}
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