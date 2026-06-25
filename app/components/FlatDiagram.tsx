import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";
import { layoutFlat } from "../lib/layoutEngine";

type FlatDiagramProps = {
  roundStitches: Stitch[][];
};

export default function FlatDiagram({
  roundStitches,
}: FlatDiagramProps) {

  console.log("roundStitches", roundStitches);
  
  const positioned =
  layoutFlat(roundStitches);

console.log(positioned);
  return (
    <svg width={800} height={800}>

      {positioned.map((row, rowIndex) => (
        <g key={rowIndex}>

          <text
            x={10}
            y={rowIndex * 60 + 25}
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
                "#ffffff",
                0
              )}

            </g>
          ))}

        </g>
      ))}

    </svg>
  );
}