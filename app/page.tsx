"use client";

import { useState } from "react";

const ROWS = 20;
const COLS = 20;

export default function Home() {

  const [pattern, setPattern] = useState("");

  const [selectedTool, setSelectedTool] = useState<string | null>("X");

  const [cells, setCells] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );

  const handleClick = (row: number, col: number) => {
    const updated = [...cells];
    updated[row][col] = selectedTool;
    setCells(updated);
  };

  const generateFromText = () => {

  const updated = Array.from(
    { length: ROWS },
    () => Array(COLS).fill(null)
  );

  if (pattern.includes("maille serrée")) {
    updated[0][0] = "X";
  }

  setCells(updated);
};
  return (
    <main style={{ padding: "20px" }}>

      <h1>Créateur de diagrammes crochet 🧶</h1>

      <textarea
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        placeholder="Tape ton modèle ici"
        rows={5}
        cols={40}
      />
      <p>{pattern}</p>
    <button onClick={generateFromText}>
  Générer
</button>
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <button onClick={() => setSelectedTool("○")}>
          Maille en l’air
        </button>

        <button onClick={() => setSelectedTool("X")}>
          Maille serrée
        </button>

        <button onClick={() => setSelectedTool("T")}>
          Bride
        </button>

        <button onClick={() => setSelectedTool("/")}>
          Demi-bride
        </button>

        <button onClick={() => setSelectedTool("V")}>
          Augmentation
        </button>

        <button onClick={() => setSelectedTool(null)}>
          Effaceur
        </button>
      </div>

      <svg width={800} height={800}>
        {cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <g
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleClick(rowIndex, colIndex)}
              style={{ cursor: "pointer" }}
            >
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