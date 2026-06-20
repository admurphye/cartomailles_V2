"use client";

import * as htmlToImage from "html-to-image";
import { useState } from "react";
import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { drawSymbol } from "./lib/drawSymbol";
import { parsePattern } from "./lib/parser";


const cardStyle = {
  padding: "15px",
  border: "1px solid #333",
  borderRadius: "12px",
  background: "#111",
};
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

  const exportPNG = async () => {
  const node = document.getElementById(
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
const exportSVG = () => {
  const svg =
    document.querySelector("svg");

  if (!svg) return;

  const serializer =
    new XMLSerializer();

  const source =
    serializer.serializeToString(svg);

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
    </div>

<div style={cardStyle}>
<h3>📊 Résumé</h3>
       <p>
  🪄 Premier rang : {firstRoundCount}
</p>

<p>
  🔄 Tours : {roundCounts.length}
</p>

<p>
  🧵 Mailles finales :
  {" "}
  {roundCounts.length > 0
    ? roundCounts[roundCounts.length - 1]
    : 0}
</p>

<hr
  style={{
    borderColor: "#333",
    margin: "10px 0",
  }}
/>

<pre
  style={{
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#ddd",
  }}
>
  {analysis}
</pre>
      </div>
</div>
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

  {/* Barre du haut */}
  <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  }}
>
  <h3>
      📊 Diagramme {diagramType === "flat" ? "plat" : "circulaire"}
    </h3>

  <div
    style={{
      display: "flex",
      alignItems: "center",
  }}
>
  <button
    onClick={() => setZoom((z) => z + 0.1)}
  >
    ➕
  </button>

  <button
    onClick={() =>
      setZoom((z) => Math.max(0.5, z - 0.1))
    }
  >
    ➖
  </button>

  <span
    style={{
      color: "#aaa",
      marginRight: "10px",
    }}
  >
    {Math.round(zoom * 100)}%
  </span>
   <button
  onClick={exportPNG}
  style={{
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#1a1a1a",
    color: "white",
    cursor: "pointer",
  }}
>
  📸 PNG
</button>
 <button
  onClick={exportSVG}
  style={{
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#1a1a1a",
    color: "white",
    cursor: "pointer",
  }}
>
  SVG
  </button>
    <button
  style={{
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#1a1a1a",
    color: "white",
    cursor: "pointer",
  }}
>
  PDF
</button>
  </div>
</div>

 {/* Zone exportable */}
  <div
  id="diagram-container"
  style={{
    transform: `scale(${zoom})`,
    transformOrigin: "top center",
  }}
>

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
              rowIndex * 40
            )}
          </g>
        ))}
      </g>
    ))}
  </svg>
)}


{diagramType === "circular" && (
      <>

      <svg width={700} height={700}>
       {roundSymbols.map((_, ringIndex) => {

  if (hasMR && ringIndex === 0) {
    return null;
  }

  const radius =
  hasMR
    ? 20 + ringIndex * 50
    : 45 + ringIndex * 50;

  return (
    <g key={`guide-${ringIndex}`}>
      <circle
        cx={350}
        cy={350}
        r={radius}
        fill="none"
        stroke="#555"
      />
    </g>
  );
})}
{hasMR && (
  <>
    <circle
      cx={350}
      cy={350}
      r={10}
      fill="none"
      stroke="white"
      strokeWidth="2"
    />

    <text
      x={350}
      y={354}
      textAnchor="middle"
      fill="white"
      fontSize="10"
      fontWeight="bold"
    >
      MR
    </text>
  </>
)}
  {roundSymbols.map((round, ringIndex) => {
    const radius =
  hasMR
    ? 25 + ringIndex * 50
    : 45 + ringIndex * 50;
    return round.map((symbol, index) => {
      const angle =
        (index / round.length) * Math.PI * 2;

      const centerX = 350;
      const centerY = 350;
      const x =
      centerX + Math.cos(angle) * radius;

       const y =
      centerY + Math.sin(angle) * radius;

      return (
  <g key={`${ringIndex}-${index}`}>
    {drawSymbol(
      symbol,
      x - 20,
      y - 20,
      "white"
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

     </div>  {/* conteneur flex principal */}
       </main>
  );
}