import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import { drawCrochetSymbol } from "./drawCrochetSymbol";
import { colors } from "@/app/theme/colors";
import type { RefObject } from "react";

interface Props {
  stitches: PositionedStitch[];
  links: Link[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
}

export default function CircularRenderer({
  stitches,
  links,
  selectedId,
  onSelect,
  diagramRef,
}: Props) {

  // --------------------------------------------------
  // CALCUL AUTOMATIQUE DE LA ZONE DU DIAGRAMME
  // --------------------------------------------------

  const PADDING = 40;

  let minX = 0;
  let maxX = 700;
  let minY = 0;
  let maxY = 700;

  if (stitches.length > 0) {
    const xs = stitches.map((stitch) => stitch.x);
    const ys = stitches.map((stitch) => stitch.y);

    minX = Math.min(...xs) - PADDING;
    maxX = Math.max(...xs) + PADDING;
    minY = Math.min(...ys) - PADDING;
    maxY = Math.max(...ys) + PADDING;
  }

  const viewBoxWidth = Math.max(100, maxX - minX);
  const viewBoxHeight = Math.max(100, maxY - minY);

  return (
    <svg
      ref={diagramRef}
      width="100%"
      height="100%"
      viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {stitches.map((stitch) => {

        const symbolColor =
          stitch.round % 2 === 0
            ? colors.rowEven
            : colors.rowOdd;

        return (
          <g
            key={stitch.id}
            onClick={() => onSelect(stitch.id)}
            style={{ cursor: "pointer" }}
          >
            {drawCrochetSymbol(
              stitch.type,
              stitch.operation,
              stitch.x,
              stitch.y,
              symbolColor
            )}

            {selectedId === stitch.id && (
              <circle
                cx={stitch.x}
                cy={stitch.y}
                r={14}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
