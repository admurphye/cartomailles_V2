import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";
import { layoutCircular } from "../lib/circular/layoutCircular";

type CircularDiagramProps = {
  roundStitches: Stitch[][];
  hasMR: boolean;
  exportMode: boolean;
};

export default function CircularDiagram({
  roundStitches,
  hasMR,
  exportMode,
}: CircularDiagramProps) {

  const svgSize = 700;

  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const positioned = layoutCircular(roundStitches);

  return (
    <svg
      width={svgSize}
      height={svgSize}
    >

     {/* Cercles guides */}
{positioned.map((round, ringIndex) => {

  if (hasMR && ringIndex === 0) {
    return null;
  }

  if (round.length === 0) {
    return null;
  }

  return (
    <circle
      key={ringIndex}
      cx={centerX}
      cy={centerY}
      r={round[0].radius}
      fill="none"
      stroke="#555"
    />
  );

})}

{/* Cercle magique */}
{hasMR && (
  <>
    <circle
      cx={centerX}
      cy={centerY}
      r={12}
      fill="none"
      stroke={exportMode ? "black" : "white"}
      strokeWidth="2"
    />

    <text
      x={centerX}
      y={centerY + 4}
      textAnchor="middle"
      fill={exportMode ? "black" : "white"}
      fontSize="9"
      fontWeight="bold"
    >
      MR
    </text>
  </>
)}
{/* Symboles crochet */}
{positioned.map((round, ringIndex) => (

  round.map((stitch, index) => {

    const symbolColor = exportMode
      ? "black"
      : ringIndex % 2 === 0
        ? "white"
        : "#D98CA8";

    return (
      <g key={`${ringIndex}-${index}`}>
        {drawSymbol(
          stitch.symbol,
          stitch.x - 20,
          stitch.y - 12,
          symbolColor,
          (stitch.rotation * 180) / Math.PI + 90
        )}
      </g>
    );

  })

))}
    </svg>
  );
}