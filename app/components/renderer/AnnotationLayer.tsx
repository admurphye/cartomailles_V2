import { useRef, useState } from "react";
import { DiagramAnnotation } from "@/app/lib/annotations";
import { colors } from "@/app/theme/colors";

type Props = {
  annotations: DiagramAnnotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (annotation: DiagramAnnotation) => void;
};

function svgPoint(event: React.PointerEvent<SVGGElement>) {
  const svg = event.currentTarget.ownerSVGElement!;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM()!.inverse());
}

export default function AnnotationLayer({ annotations, selectedId, onSelect, onUpdate }: Props) {
  const [drag, setDrag] = useState<{ id: string; handle: "all" | "start" | "end"; x: number; y: number; original: DiagramAnnotation } | null>(null);
  const moved = useRef(false);

  const beginDrag = (event: React.PointerEvent<SVGGElement>, annotation: DiagramAnnotation, handle: "all" | "start" | "end" = "all") => {
    event.stopPropagation();
    const point = svgPoint(event);
    moved.current = false;
    onSelect(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id: annotation.id, handle, x: point.x, y: point.y, original: annotation });
  };

  const move = (event: React.PointerEvent<SVGGElement>) => {
    if (!drag) return;
    const point = svgPoint(event);
    const dx = point.x - drag.x;
    const dy = point.y - drag.y;
    moved.current ||= Math.hypot(dx, dy) > 1;
    const original = drag.original;

    if (original.type === "text") {
      onUpdate({ ...original, x: original.x + dx, y: original.y + dy });
    } else if (drag.handle === "start") {
      onUpdate({ ...original, startX: original.startX + dx, startY: original.startY + dy });
    } else if (drag.handle === "end") {
      onUpdate({ ...original, endX: original.endX + dx, endY: original.endY + dy });
    } else {
      onUpdate({ ...original, startX: original.startX + dx, startY: original.startY + dy, endX: original.endX + dx, endY: original.endY + dy });
    }
  };

  return (
    <g className="diagram-annotations" onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
      <defs>
        <marker id="annotation-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
        </marker>
      </defs>
      {annotations.map((annotation) => {
        const selected = selectedId === annotation.id;
        if (annotation.type === "text") {
          return (
            <g key={annotation.id} onPointerDown={(event) => beginDrag(event, annotation)} style={{ cursor: "move" }}>
              <text x={annotation.x} y={annotation.y} fill={annotation.color} fontSize={annotation.fontSize}>{annotation.text}</text>
              {selected && <rect x={annotation.x - 4} y={annotation.y - annotation.fontSize} width={Math.max(20, annotation.text.length * annotation.fontSize * 0.62) + 8} height={annotation.fontSize + 8} fill="none" stroke={colors.primary} strokeWidth="1" strokeDasharray="3 2" />}
            </g>
          );
        }

        return (
          <g key={annotation.id} onPointerDown={(event) => beginDrag(event, annotation)} style={{ cursor: "move" }}>
            <line x1={annotation.startX} y1={annotation.startY} x2={annotation.endX} y2={annotation.endY} stroke="transparent" strokeWidth={Math.max(12, annotation.strokeWidth)} />
            <line x1={annotation.startX} y1={annotation.startY} x2={annotation.endX} y2={annotation.endY} stroke={annotation.color} strokeWidth={annotation.strokeWidth} markerEnd="url(#annotation-arrowhead)" />
            {selected && <>
              <circle cx={annotation.startX} cy={annotation.startY} r="5" fill="white" stroke={colors.primary} strokeWidth="2" onPointerDown={(event) => beginDrag(event, annotation, "start")} style={{ cursor: "crosshair" }} />
              <circle cx={annotation.endX} cy={annotation.endY} r="5" fill="white" stroke={colors.primary} strokeWidth="2" onPointerDown={(event) => beginDrag(event, annotation, "end")} style={{ cursor: "crosshair" }} />
            </>}
          </g>
        );
      })}
    </g>
  );
}
