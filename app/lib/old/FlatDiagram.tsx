import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";
import { colors } from "@/app/theme/colors";
import {layoutFlatV2} from "../lib/flat/layoutFlatV2";

type FlatDiagramProps = {
  roundStitches: Stitch[][];
  exportMode: boolean;
};
export default function FlatDiagram({
  roundStitches,
  exportMode,
}: FlatDiagramProps) {
  
if (roundStitches[1]) {
  console.table(
    roundStitches[1].map(s => ({
      symbol: s.symbol,
      parents: s.parents,
    }))
  );
}

console.log(
  roundStitches.map((r, i) => ({
    row: i,
    count: r.length,
    first: r[0]?.symbol,
    last: r[r.length - 1]?.symbol,
  }))
);


  const positioned = layoutFlatV2(roundStitches);

const maxStitches = Math.max(
  ...roundStitches.map(row => row.length),
  1
);

const svgWidth = Math.max(
  800,
  maxStitches * 50 + 150
);

const LEFT_MARGIN = 120;

  // Affichage du bas vers le haut
  const displayedRows = positioned;

  return (

<div className="overflow-x-auto">

<svg
  id="diagramme-flat"
  width={svgWidth}
  height={800}
  viewBox={`0 0 ${svgWidth} 800`}
>

      {displayedRows.map((row, displayIndex) => {

       const originalRow = displayIndex;

        const y =
          row.length > 0 ? row[0].y : 0;

        return (

          <g key={originalRow}>

          <text
              x={0}
              y={y + 5}
              fill="white"
              fontSize="16"
              fontWeight="bold"
              textAnchor="start"
            >
              {originalRow + 1}
            </text>

            {row.map((stitch, stitchIndex) => (

              <g key={`${originalRow}-${stitchIndex}`}>

                {drawSymbol(
                  stitch.symbol,
                  LEFT_MARGIN + stitch.x,
                  stitch.y,
                  exportMode
  ? "#000000"
  : originalRow % 2 === 0
    ? colors.text
    : colors.primary
                  
                )}

              </g>

            ))}

          </g>

        );

      })}

    </svg>

</div>

);
}