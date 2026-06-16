"use client";

import { useState } from "react";

const ROWS = 20;
const COLS = 20;

export default function Home() {
  const [pattern, setPattern] = useState("");
  const [analysis, setAnalysis] = useState("");

  const [cells, setCells] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );

  const generateFromText = () => {
    const updated = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(null)
    );

    const lines = pattern.split("\n");

    lines.forEach((line, rowIndex) => {
      const text = line.toLowerCase();

      const match = text.match(/\d+/);
      const count = match ? parseInt(match[0]) : 0;

      let symbol = "";
      if (
      text.includes("1 maille serrée") &&
      text.includes("1 augmentation") &&
      text.includes("x6")
      ) {

  for (let i = 0; i < 12; i++) {
    updated[rowIndex][i] = i % 2 === 0 ? "X" : "V";
  }

  return;
         }
      if (
        text.includes("maille serrée") ||
        text.includes("mailles serrées")
      ) {
        symbol = "X";
      } else if (
        text.includes("bride") ||
        text.includes("brides")
      ) {
        symbol = "T";
      } else if (
        text.includes("augmentation") ||
        text.includes("augmentations")
      ) {
        symbol = "V";
      }

      for (let i = 0; i < count; i++) {
        updated[rowIndex][i] = symbol;
      }
    });

    setCells(updated);
    setAnalysis(`${lines.length} ligne(s) analysée(s)`);
  };

  return (
    <main style={{ padding: "20px" }}>
      <h1>Créateur de diagrammes crochet 🧶</h1>

      <textarea
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        placeholder="Exemple :
6 mailles serrées
12 brides
6 augmentations"
        rows={6}
        cols={40}
      />

      <br />
      <br />

      <button onClick={generateFromText}>
        Générer
      </button>

      <p>{analysis}</p>

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

              {cell && (
                <text
                  x={colIndex * 40 + 20}
                  y={rowIndex * 40 + 25}
                  textAnchor="middle"
                  fontSize="20"
                >
                  {cell}
                </text>
              )}
            </g>
          ))
        )}
      </svg>
    </main>
  );
}