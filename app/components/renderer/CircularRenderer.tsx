import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import { drawCrochetSymbol } from "./drawCrochetSymbol";
import { colors } from "@/app/theme/colors";
import { useRef, useState, type RefObject } from "react";
import { Tool } from "@/app/lib/engine/model/Tool";
import { usePreferences } from "../preferences/PreferencesContext";

interface Props {
  stitches: PositionedStitch[];
  links: Link[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  diagramRef: RefObject<SVGSVGElement | null>;
  showRoundLabels?: boolean;
  showRoundGuides?: boolean;
  tool: Tool;
  onMoveStitch: (stitchId: string, offsetX: number, offsetY: number) => void;
}

export default function CircularRenderer({
  stitches,
  selectedId,
  onSelect,
  diagramRef,
  showRoundLabels = false,
  showRoundGuides = true,
  tool,
  onMoveStitch,
}: Props) {
  const { preferences } = usePreferences();
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  const getDiagramPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const bounds = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    return {
      x: viewBox.x + (event.clientX - bounds.left) * viewBox.width / bounds.width,
      y: viewBox.y + (event.clientY - bounds.top) * viewBox.height / bounds.height,
    };
  };

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

  const roundLabels = showRoundLabels && preferences.showRowNumbers
    ? [...new Set(stitches.map((stitch) => stitch.round))].map((round) => {
        const roundStitches = stitches.filter(
          (stitch) => stitch.round === round
        );
        const minRoundX = Math.min(
          ...roundStitches.map((stitch) => stitch.x)
        );
        const maxRoundX = Math.max(
          ...roundStitches.map((stitch) => stitch.x)
        );
        const averageRoundY =
          roundStitches.reduce((total, stitch) => total + stitch.y, 0) /
          roundStitches.length;
        const isRightToLeft = round % 2 === 0;
        const textAnchor: "start" | "end" = isRightToLeft
          ? "start"
          : "end";

        return {
          round,
          x: isRightToLeft ? maxRoundX + 20 : minRoundX - 20,
          y: averageRoundY + 5,
          textAnchor,
        };
      })
    : [];

  const roundGuides = showRoundGuides
    ? [...new Set(stitches.map((stitch) => stitch.round))].flatMap((round) => {
        const roundStitches = stitches.filter(
          (stitch) =>
            stitch.round === round &&
            stitch.role !== "turningChain" &&
            stitch.role !== "magicRing"
        );

        if (roundStitches.length === 0) {
          return [];
        }

        const radius =
          roundStitches.reduce(
            (total, stitch) =>
              total + Math.hypot(stitch.x - 350, stitch.y - 350),
            0
          ) / roundStitches.length;

        return [{ round, radius }];
      })
    : [];

  return (
    <svg
      ref={diagramRef}
      width="100%"
      height="100%"
      viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={(event) => {
        if (!dragging) return;

        const point = getDiagramPoint(event);
        const deltaX = point.x - dragging.startX;
        const deltaY = point.y - dragging.startY;

        if (Math.hypot(deltaX, deltaY) > 1) {
          dragMovedRef.current = true;
        }

        onMoveStitch(
          dragging.id,
          dragging.offsetX + deltaX,
          dragging.offsetY + deltaY
        );
      }}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      {roundGuides.map((guide) => (
        <circle
          key={guide.round}
          cx={350}
          cy={350}
          r={guide.radius}
          fill="none"
          stroke={colors.grid}
          strokeWidth={1}
        />
      ))}

      {roundLabels.map((label) => (
        <text
          key={label.round}
          x={label.x}
          y={label.y}
          textAnchor={label.textAnchor}
          fill={colors.rowOdd}
          fontSize={14}
          fontWeight={700}
        >
          R{label.round}
        </text>
      ))}

      {stitches.map((stitch) => {

        const symbolColor =
          stitch.round % 2 === 0
            ? preferences.evenSymbolColor
            : preferences.oddSymbolColor;

        return (
          <g
            key={stitch.id}
            onClick={() => {
              if (dragMovedRef.current) {
                dragMovedRef.current = false;
                return;
              }

              if (tool === "moveStitch") return;
              onSelect(selectedId === stitch.id ? null : stitch.id);
            }}
            onPointerDown={(event) => {
              const canDrag =
                tool === "moveStitch" ||
                (tool === "select" && selectedId === stitch.id);

              if (!canDrag) return;

              event.stopPropagation();
              dragMovedRef.current = false;
              onSelect(stitch.id);
              const svg = diagramRef.current;

              if (!svg) return;

              const bounds = svg.getBoundingClientRect();
              const viewBox = svg.viewBox.baseVal;
              const startX = viewBox.x +
                (event.clientX - bounds.left) * viewBox.width / bounds.width;
              const startY = viewBox.y +
                (event.clientY - bounds.top) * viewBox.height / bounds.height;

              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging({
                id: stitch.id,
                startX,
                startY,
                offsetX: stitch.offsetX ?? 0,
                offsetY: stitch.offsetY ?? 0,
              });
            }}
            style={{
              cursor:
                tool === "moveStitch" ||
                (tool === "select" && selectedId === stitch.id)
                  ? dragging?.id === stitch.id
                    ? "grabbing"
                    : "grab"
                  : "pointer",
            }}
          >
            <g
              className="crochet-symbol"
              style={{ "--symbol-stroke-width": preferences.strokeWidth } as React.CSSProperties}
              transform={`translate(${stitch.x} ${stitch.y}) scale(${preferences.symbolSize}) translate(${-stitch.x} ${-stitch.y})`}
            >
              {drawCrochetSymbol(
                stitch.type,
                stitch.operation,
                stitch.x,
                stitch.y,
                symbolColor,
                stitch.rotation ?? 0,
                stitch.groupSize
              )}
            </g>

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
