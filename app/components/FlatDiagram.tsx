import { drawSymbol } from "../lib/drawSymbol";

type FlatDiagramProps = {
  cells: (string | null)[][];
};

export default function FlatDiagram({
  cells,
}: FlatDiagramProps) {

  return (
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
  );
}