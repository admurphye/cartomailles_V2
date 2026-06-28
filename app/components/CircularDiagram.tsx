import { drawSymbol } from "../lib/drawSymbol";
import { Stitch } from "../lib/types";
import { buildTopology } from "../lib/topology/buildTopology";
import { layoutCircularV2 } from "../lib/layout/layoutCircularV2";

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

 const topology =
  buildTopology(roundStitches);

const positioned =
  layoutCircularV2(topology);

  const svgSize = 700;

  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  const maxRadius = 280;

  const step =
    maxRadius /
    Math.max(positioned.length, 1);

  return (
    <svg
      width={svgSize}
      height={svgSize}
    >

      {/* Cercles guides */}

      {positioned.map((_, ringIndex) => {

        if (hasMR && ringIndex === 0) {
          return null;
        }

        const radius =
          hasMR
            ? 40 + ringIndex * step
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

      {/* Cercle magique */}

      {hasMR && (
        <>
          <circle
            cx={centerX}
            cy={centerY}
            r={10}
            fill="none"
            stroke={
              exportMode
                ? "black"
                : "white"
            }
            strokeWidth="2"
          />

          <text
            x={centerX}
            y={centerY + 4}
            textAnchor="middle"
            fill={
              exportMode
                ? "black"
                : "white"
            }
            fontSize="10"
            fontWeight="bold"
          >
            MR
          </text>
        </>
      )}

      {/* Symboles */}

      {positioned.map((row, rowIndex) => (

        <g key={rowIndex}>

          {row.map((stitch, stitchIndex) => (

            <g
              key={`${rowIndex}-${stitchIndex}`}
            >

              {drawSymbol(
                stitch.symbol,
                stitch.x - 20,
                stitch.y - 12,
                exportMode
                  ? "black"
                  : "white",
                0
              )}

            </g>

          ))}

        </g>

      ))}

    </svg>
  );

}