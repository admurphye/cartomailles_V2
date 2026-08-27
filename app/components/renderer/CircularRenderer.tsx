import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Link } from "@/app/lib/engine/model/Link";
import { drawCrochetSymbol } from "./drawCrochetSymbol";
import { colors } from "@/app/theme/colors";
import { useRef, useState, type RefObject } from "react";
import { Tool } from "@/app/lib/engine/model/Tool";
import { usePreferences } from "../preferences/PreferencesContext";
import { DiagramAnnotation } from "@/app/lib/annotations";
import AnnotationLayer from "./AnnotationLayer";

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
  annotations: DiagramAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (annotation: DiagramAnnotation) => void;
  onUpdateAnnotation: (annotation: DiagramAnnotation) => void;
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
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
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
  const [draftArrow, setDraftArrow] = useState<Extract<DiagramAnnotation, { type: "arrow" }> | null>(null);

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

  if (annotations.length > 0) {
    const annotationXs = annotations.flatMap((annotation) => annotation.type === "text"
      ? [annotation.x, annotation.x + Math.max(20, annotation.text.length * annotation.fontSize * 0.62)]
      : [annotation.startX, annotation.endX]);
    const annotationYs = annotations.flatMap((annotation) => annotation.type === "text"
      ? [annotation.y - annotation.fontSize, annotation.y]
      : [annotation.startY, annotation.endY]);

    minX = Math.min(minX, ...annotationXs.map((value) => value - PADDING));
    maxX = Math.max(maxX, ...annotationXs.map((value) => value + PADDING));
    minY = Math.min(minY, ...annotationYs.map((value) => value - PADDING));
    maxY = Math.max(maxY, ...annotationYs.map((value) => value + PADDING));
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
        if (draftArrow) {
          const point = getDiagramPoint(event);
          setDraftArrow({ ...draftArrow, endX: point.x, endY: point.y });
          return;
        }
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
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget && tool !== "text" && tool !== "arrow") return;
        const point = getDiagramPoint(event);
        onSelect(null);
        onSelectAnnotation(null);

        if (tool === "text") {
          const value = window.prompt("Texte de l’annotation :");
          if (value?.trim()) {
            onAddAnnotation({ id: crypto.randomUUID(), type: "text", x: point.x, y: point.y, text: value.trim(), color: "#27232d", fontSize: 18 });
          }
        } else if (tool === "arrow") {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDraftArrow({ id: crypto.randomUUID(), type: "arrow", startX: point.x, startY: point.y, endX: point.x, endY: point.y, color: "#27232d", strokeWidth: 2 });
        }
      }}
      onPointerUp={() => {
        setDragging(null);
        if (draftArrow) {
          if (Math.hypot(draftArrow.endX - draftArrow.startX, draftArrow.endY - draftArrow.startY) > 5) onAddAnnotation(draftArrow);
          setDraftArrow(null);
        }
      }}
      onPointerCancel={() => { setDragging(null); setDraftArrow(null); }}
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
              data-stitch-type={stitch.type}
              data-stitch-operation={stitch.operation}
              data-stitch-round={stitch.round}
              data-stitch-order={stitch.order}
              data-stitch-role={stitch.role}
              data-stitch-group-size={stitch.groupSize ?? 1}
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
      <AnnotationLayer
        annotations={draftArrow ? [...annotations, draftArrow] : annotations}
        selectedId={selectedAnnotationId}
        onSelect={(id) => { onSelectAnnotation(id); if (id) onSelect(null); }}
        onUpdate={onUpdateAnnotation}
      />
    </svg>
  );
}
