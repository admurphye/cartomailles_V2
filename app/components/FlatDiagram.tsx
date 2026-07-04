import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";
import { colors } from "@/app/theme/colors";
import {layoutFlat,ROW_SPACING,} from "../lib/flat/layoutFlat";

type FlatDiagramProps = {
  roundStitches: Stitch[][];
};

export default function FlatDiagram({
  roundStitches,
}: FlatDiagramProps) {

  console.log("roundStitches", roundStitches);
  
  const positioned =
  layoutFlat(roundStitches);
console.log("POSITIONED", positioned);
console.log(positioned);
  return (
    <svg width={800} height={800}>

      {positioned.map((row, rowIndex) => (
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

          {row.map((stitch, stitchIndex) => (
            <g key={`${rowIndex}-${stitchIndex}`}>

              {drawSymbol(
                stitch.symbol,
               50 + stitch.x,
                stitch.y,
                rowIndex % 2 === 0
                  ? colors.text
                  : colors.primary,
                0
              )}

            </g>
          ))}

        </g>
      ))}

    </svg>
  );
}