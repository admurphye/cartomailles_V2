import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";
import { colors } from "@/app/theme/colors";
import {
  layoutFlat,
} from "../lib/flat/layoutFlat";

type FlatDiagramProps = {
  roundStitches: Stitch[][];
  exportMode: boolean;
};
export default function FlatDiagram({
  roundStitches,
  exportMode,
}: FlatDiagramProps) {

  const positioned = layoutFlat(roundStitches);

  // Affichage du bas vers le haut
  const displayedRows = positioned;

  return (
   <svg
  id="diagramme-flat"
  width={800}
  height={800}
  viewBox="0 0 800 800"
>

      {displayedRows.map((row, displayIndex) => {

       const originalRow = displayIndex;

        const y =
          row.length > 0 ? row[0].y : 0;

        return (

          <g key={originalRow}>

            <text
              x={10}
              y={y + 5}
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {originalRow + 1}
            </text>

            {row.map((stitch, stitchIndex) => (

              <g key={`${originalRow}-${stitchIndex}`}>

                {drawSymbol(
                  stitch.symbol,
                  50 + stitch.x,
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
  );
}