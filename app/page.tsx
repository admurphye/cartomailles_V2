"use client";

import { useState } from "react";
import { CROCHET_SYMBOLS } from "./lib/crochetSymbols";
import { drawSymbol } from "./lib/drawSymbol";
import { parsePattern } from "./lib/parser";

export default function Home() {
  const [pattern, setPattern] = useState("");
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
    <main style={{ padding: "20px" }}>
      <h1>Créateur de diagrammes crochet 🧶</h1>

 <h2>Points reconnus</h2>

    <ul>
      {Object.entries(CROCHET_SYMBOLS).map(
        ([key, value]) => (
          <li key={key}>
            {key} - {value.name} ({value.code})
          </li>
        )
      )}
    </ul>
      <textarea
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        rows={8}
        cols={50}
        placeholder={`Rang 1 : 6 mailles serrées
Rang 2 : 6 augmentations
Rang 3 : 2 mailles serrées, 1 augmentation x6`}
      />

      <br />
      <br />

      <button onClick={generateFromText}>
        Générer
      </button>
       <p>Premier rang : {firstRoundCount}</p>
       <p>Rangs : {roundCounts.join(" - ")}</p>
      <pre>{analysis}</pre>

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

      <h3>Aperçu circulaire</h3>

      <svg width={700} height={700}>
        {roundSymbols.map((_, ringIndex) => {
  const radius = 60 + ringIndex * 50;

  return (
    <circle
      key={`guide-${ringIndex}`}
      cx={350}
      cy={350}
      r={radius}
      fill="none"
      stroke="#555"
    />
  );
})}
  {roundSymbols.map((round, ringIndex) => {
    const radius = 60 + ringIndex * 50;

    return round.map((symbol, index) => {
      const angle =
        (index / round.length) * Math.PI * 2;

      const centerX = 350;
      const centerY = 350;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      return (
        <text
          key={`${ringIndex}-${index}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="bold"
          fill="white"
        >
          {symbol}
        </text>
      );
    });
  })}
</svg>
    </main>
  );
}