import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";

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

  return (
    <svg
      width={svgSize}
      height={svgSize}
    >

      {/* Cercles guides */}

      {roundStitches.map((_, ringIndex) => {

        if (hasMR && ringIndex === 0) {
          return null;
        }

        const maxRadius = 300;

        const step =
          maxRadius /
          Math.max(roundStitches.length, 1);

        const radius =
          hasMR
            ? 20 + ringIndex * step
            : 45 + ringIndex * step;

        return (
          <circle
            key={ringIndex}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#555"
          />
        );
      })}
{/* Cercles guides des rangs */}
       {roundStitches.map((_, ringIndex) => {

  if (hasMR && ringIndex === 0) {
    return null;
  }

const maxRadius = 300;

const step =
  maxRadius / Math.max(roundStitches.length, 1);

const radius =
  hasMR
    ? 20 + ringIndex * step
    : 45 + ringIndex * step;

  return (
    <g key={`guide-${ringIndex}`}>
      <circle
       cx={centerX}
       cy={centerY}
        r={radius}
        fill="none"
        stroke="#555"
      />
    </g>
  );
})}
{/* Cercle magique */}
{hasMR && (
  <>
    <circle
      cx={centerX}
      cy={centerY}
      r={10}
      fill="none"
      stroke={exportMode ? "black" : "white"}
      strokeWidth="2"
    />

    <text
      x={centerX}
      y={centerY + 4}
      textAnchor="middle"
      fill={exportMode ? "black" : "white"}
      fontSize="10"
      fontWeight="bold"
    >
      MR
    </text>
  </>
)}
{/* Symboles crochet */}
{roundStitches.map((round, ringIndex) => {
 const maxRadius = 300;

const step =
  maxRadius / Math.max(roundStitches.length, 1);

const radius =
  hasMR
    ? 20 + ringIndex * step
    : 45 + ringIndex * step;

  return round.map((stitch, index) => {
    const angle =
      (index / round.length) * Math.PI * 2;

    const x =
      centerX + Math.cos(angle) * radius;

    const y =
      centerY + Math.sin(angle) * radius;

    return (
      <g key={`${ringIndex}-${index}`}>
    {drawSymbol(
  stitch.symbol,
  x - 20,
  y - 12,
  exportMode ? "black" : "white",
  angle
)}
  </g>
);
    });
  })}
    </svg>
  );
}