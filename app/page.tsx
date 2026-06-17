"use client";

import { useState } from "react";
import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { drawSymbol } from "./lib/drawSymbol";
import { parsePattern } from "./lib/parser";

export default function Home() {
  const [pattern, setPattern] = useState("");
  const [diagramType, setDiagramType] =
  useState("circular");
  const [analysis, setAnalysis] = useState("");
  const [firstRoundCount, setFirstRoundCount] = useState(6);
  const [roundCounts, setRoundCounts] = useState<number[]>([]);
  const [roundSymbols, setRoundSymbols] =  useState<string[][]>([]);

  const [cells, setCells] = useState<(string | null)[][]>([]);

  const generateFromText = () => {
        const lines = pattern
  .split("\n")
  .filter(line => line.trim() !== "");

  const result = parsePattern(pattern);
  
  setRoundCounts(result.counts);
  setAnalysis(result.analysis);
  setCells(result.cells);
  setRoundSymbols(result.roundSymbols);

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
      <h1>Créateur de diagrammes crochet 🧶</h1>
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
<div 
  style={{ 
    width: "350px",
    padding: "20px",
    border: "1px solid #333",
    borderRadius: "12px",
    background: "#111",
  }}
>
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
 <h2>Points reconnus</h2>

  <details>
  <summary>Points reconnus</summary>

  <ul>
    {Object.entries(CROCHET_SYMBOLS).map(
      ([key, value]) => (
        <li key={key}>
          {key} - {value.name} ({value.code})
        </li>
      )
    )}
  </ul>
</details>
      <textarea
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
       rows={10}
  style={{
    width: "100%",
    resize: "vertical",
}}
        placeholder={`Rang 1 : 6 mailles serrées
Rang 2 : 6 augmentations
Rang 3 : 2 mailles serrées, 1 augmentation x6`}
      />

      <br />
      <br />

      <button
  onClick={generateFromText}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  }}
>
  Générer le diagramme
</button>
       <p>Premier rang : {firstRoundCount}</p>
       <p>Rangs : {roundCounts.join(" - ")}</p>

      <pre>{analysis}</pre>
</div>
<div
  style={{
    flex: 1,
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "20px",
    background: "#111",
    overflow: "auto",
  }}
>
  {diagramType === "flat" && (
      <svg width={800} height={800}> 
        {cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <g key={`${rowIndex}-${colIndex}`}>
              <rect
                x={colIndex * 40}
                y={rowIndex * 40}
                width={40}
                height={40}
                fill="white"
                stroke="black"
              />

  {drawSymbol(
  cell,
  colIndex * 40,
  rowIndex * 40
)}
            </g>
          ))
        )}
        </svg>
)}
{diagramType === "circular" && (
      <>
     <h3>Aperçu circulaire</h3>

      <svg width={700} height={700}>
        {roundSymbols.map((_, ringIndex) => {
  const radius = 35 + ringIndex * 50;

  return (
  
      <circle
      key={`guide-${ringIndex}`}
      cx={250}
      cy={250}
      r={radius}
      fill="none"
      stroke="#555"
    />
  );
})}

<circle
  cx={250}
  cy={250}
  r={20}
  fill="none"
  stroke="white"
  strokeWidth="2"
/>

<text
  x={250}
  y={255}
  textAnchor="middle"
  fill="white"
  fontSize="16"
  fontWeight="bold"
>
  MR
</text>
  {roundSymbols.map((round, ringIndex) => {
    const radius = 60 + ringIndex * 50;

    return round.map((symbol, index) => {
      const angle =
        (index / round.length) * Math.PI * 2;

      const centerX = 250;
      const centerY = 250;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

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

     </div>  {/* conteneur flex principal */}
       </main>
  );
}