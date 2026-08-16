export type DiagramAnnotation =
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
    }
  | {
      id: string;
      type: "arrow";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string;
      strokeWidth: number;
    };

export function isDiagramAnnotations(value: unknown): value is DiagramAnnotation[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const annotation = item as Record<string, unknown>;
    const common = typeof annotation.id === "string" && typeof annotation.color === "string";

    if (annotation.type === "text") {
      return common && typeof annotation.x === "number" && typeof annotation.y === "number" &&
        typeof annotation.text === "string" && typeof annotation.fontSize === "number";
    }

    return annotation.type === "arrow" && common &&
      typeof annotation.startX === "number" && typeof annotation.startY === "number" &&
      typeof annotation.endX === "number" && typeof annotation.endY === "number" &&
      typeof annotation.strokeWidth === "number";
  });
}
