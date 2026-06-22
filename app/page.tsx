"use client";

import * as htmlToImage from "html-to-image";
import { useState } from "react";
import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { drawSymbol } from "./lib/drawSymbol";
import { parsePattern } from "./lib/parser";
import { jsPDF } from "jspdf";
import DiagramToolbar from "./components/DiagramToolbar";
import SummaryPanel from "./components/SummaryPanel";

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
  const svgSize = 700;

const centerX = svgSize / 2;
const centerY = svgSize / 2;
  const [projectName, setProjectName] =  useState("");
// =====================================================
// EXPORT PNG
// =====================================================
  const [exportMode, setExportMode] = useState(false);

  const exportPNG = async () => {

    await new Promise(resolve =>
    setTimeout(resolve, 100)
  );

  const node =
    document.getElementById(
      "diagram-container"
    );

  if (!node) return;

  const dataUrl =
    await htmlToImage.toPng(node);

  const link =
    document.createElement("a");

  link.download =
    "diagramme-crochet.png";

  link.href = dataUrl;

  link.click();
 };

 // =====================================================
// EXPORT SVG
// =====================================================
const exportSVG = async () => {
  setExportMode(true);

await new Promise(resolve =>
  setTimeout(resolve, 100)
);
  const svg =
    document.querySelector("svg");

  if (!svg) return;

  const serializer =
    new XMLSerializer();

  const source =
    serializer.serializeToString(svg);
    setExportMode(false);

  const blob = new Blob(
    [source],
    {
      type: "image/svg+xml;charset=utf-8",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "diagramme-crochet.svg";

  link.click();

  URL.revokeObjectURL(url);
  
};

// =====================================================
// EXPORT PDF
// =====================================================
const exportPDF = async () => {

  setExportMode(true);

  await new Promise(resolve =>
    setTimeout(resolve, 100)
  );

  const node =
    document.getElementById(
      "diagram-container"
    );

  if (!node) return;

  const dataUrl =
    await htmlToImage.toPng(node);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

const usedSymbols = new Set<string>();

roundSymbols.forEach((round) => {
  round.forEach((symbol) => {
    usedSymbols.add(symbol);
  });
});
if (hasMR) {
  usedSymbols.add("MR");
}

pdf.setFontSize(20);

pdf.text(
  projectName || "Diagramme Crochet",
  105,
  15
);
pdf.setFontSize(10);

pdf.text(
  `Premier rang : ${firstRoundCount}`,
  10,
  25
);

pdf.text(
  `Nombre de rangs : ${roundCounts.length}`,
  10,
  32
);

pdf.text(
  `Mailles finales : ${
    roundCounts.length > 0
      ? roundCounts[roundCounts.length - 1]
      : 0
  }`,
  10,
  39
);
  pdf.addImage(
    dataUrl,
    "PNG",
    25,
    50,
    150,
    150
  );
let y = 230;

pdf.setFontSize(14);
pdf.text("Résumé des rangs", 10, y);

y += 8;

pdf.setFontSize(10);

roundCounts.forEach((count, index) => {
  pdf.text(
    `Rang ${index + 1} : ${count} mailles`,
    10,
    y
  );

  y += 6;
});
  y += 10;

pdf.setFontSize(14);
pdf.text("Patron", 10, y);

y += 8;

pdf.setFontSize(10);

const lines = pattern.split("\n");

lines.forEach((line) => {

  if (y > 280) {
    pdf.addPage();
    y = 20;
  }

  pdf.text(line, 10, y);
  y += 6;
});
y += 10;

if (y > 250) {
  pdf.addPage();
  y = 20;
}

pdf.setFontSize(14);
pdf.text("Légende", 10, y);

y += 8;

pdf.setFontSize(10);

Array.from(usedSymbols).forEach((symbol) => {

  const label =
    SYMBOL_LABELS[symbol] || symbol;

  pdf.text(
    `${symbol} = ${label}`,
    10,
    y
  );

  y += 6;
});

console.log("roundSymbols", roundSymbols);

console.log(
  "usedSymbols",
  Array.from(usedSymbols)
);
  pdf.save(
  `${projectName || "diagramme"}.pdf`
);

  setExportMode(false);
};
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
  
  setRoundCounts(result.counts);
  setAnalysis(result.analysis);
  setCells(result.cells);
  setRoundSymbols(result.roundSymbols);
  setHasMR(result.hasMR);
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

  return (
    <main
  style={{
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
  }}
>
      <h1
  style={{
    marginBottom: "20px",
    fontSize: "32px",
  }}
>
  🧶 Créateur de diagrammes crochet
</h1>

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
  <h3>⚙️ Paramètres</h3>

<div style={cardStyle}>

  <label>
    Type de diagramme :
  </label>

  <select
    value={diagramType}
    onChange={(e) =>
      setDiagramType(e.target.value)
    }
    style={{
      marginLeft: "10px",
      padding: "5px"
    }}
  >
    <option value="circular">
      Circulaire
    </option>

    <option value="flat">
      Plat
    </option>
  </select>
</div>

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
  marginBottom: "15px"
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
  exportSVG={exportSVG}
  exportPDF={exportPDF}
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
  <svg width={800} height={800}>
    {cells.map((row, rowIndex) => (
      <g key={rowIndex}>
        <text
          x={10}
          y={rowIndex * 40 + 25}
          fill="white"
          fontSize="16"
          fontWeight="bold"
        >
          {rowIndex + 1}
        </text>

        {row.map((cell, colIndex) => (
          <g key={`${rowIndex}-${colIndex}`}>
            <rect
              x={50 + colIndex * 40}
              y={rowIndex * 40}
              width={40}
              height={40}
              fill="white"
              stroke="black"
            />

            {drawSymbol(
               cell,
                50 + colIndex * 40,
             rowIndex * 40,
             "black",
              0
              )}
          </g>
        ))}
      </g>
    ))}
  </svg>
)}

{/* =====================================================
    DIAGRAMME CIRCULAIRE
===================================================== */}
{diagramType === "circular" && (
      <>

      <svg
  width={svgSize}
  height={svgSize}
>
  {/* Cercles guides des rangs */}
       {roundSymbols.map((_, ringIndex) => {

  if (hasMR && ringIndex === 0) {
    return null;
  }

const maxRadius = 300;

const step =
  maxRadius / Math.max(roundSymbols.length, 1);

const radius =
  hasMR
    ? 20 + ringIndex * step
    : 45 + ringIndex * step;

  return (
    <g key={`guide-${ringIndex}`}>
      <circle
       cx={centerX}
       cy={centerY}
        r={radius}
        fill="none"
        stroke="#555"
      />
    </g>
  );
})}
{/* Cercle magique */}
{hasMR && (
  <>
    <circle
      cx={centerX}
      cy={centerY}
      r={10}
      fill="none"
      stroke={exportMode ? "black" : "white"}
      strokeWidth="2"
    />

    <text
      x={centerX}
      y={centerY + 4}
      textAnchor="middle"
      fill={exportMode ? "black" : "white"}
      fontSize="10"
      fontWeight="bold"
    >
      MR
    </text>
  </>
)}
{/* Symboles crochet */}
{roundSymbols.map((round, ringIndex) => {
 const maxRadius = 300;

const step =
  maxRadius / Math.max(roundSymbols.length, 1);

const radius =
  hasMR
    ? 20 + ringIndex * step
    : 45 + ringIndex * step;

  return round.map((symbol, index) => {
    const angle =
      (index / round.length) * Math.PI * 2;

    const x =
      centerX + Math.cos(angle) * radius;

    const y =
      centerY + Math.sin(angle) * radius;

    return (
      <g key={`${ringIndex}-${index}`}>
    {drawSymbol(
  symbol,
  x - 20,
  y - 12,
  exportMode ? "black" : "white",
  angle
)}
  </g>
);
    });
  })}
</svg>
  </>
      )}
   </div>  {/* colonne droite */}
   </div>
   
       </main>
  );
}