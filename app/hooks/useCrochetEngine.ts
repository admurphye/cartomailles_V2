"use client";

import { useMemo } from "react";
import { layoutCircularGroups } from "@/app/lib/engine/layout/layoutCircularGroups";
import { parsePattern } from "../lib/engine/parser/parsePattern";
import { layoutFlatGroups } from "../lib/engine/layout/layoutFlatGroups";
import { StitchAdjustments } from "@/app/lib/engine/model/StitchAdjustments";

export function useCrochetEngine(
  pattern: string,
  selectedId: string | null,
  diagramType: "circular" | "flat",
  adjustments: StitchAdjustments
) {
  
 const graph = useMemo(() => {

  const result = parsePattern(pattern);

  return result;
}, [pattern]);

  const positioned = useMemo(() => {
    const layout = diagramType === "flat"
      ? layoutFlatGroups(graph)
      : layoutCircularGroups(graph);

    return layout.map((stitch) => {
      const adjustment = adjustments[stitch.id];

      if (!adjustment) {
        return stitch;
      }

      return {
        ...stitch,
        x: stitch.x + adjustment.offsetX,
        y: stitch.y + adjustment.offsetY,
        offsetX: adjustment.offsetX,
        offsetY: adjustment.offsetY,
      };
    });
  }, [graph, diagramType, adjustments]);

  const selected = useMemo(
    () =>
      positioned.find(
        (stitch) => stitch.id === selectedId
      ) ?? null,
    [positioned, selectedId]
  );

  return {
    graph,
    positioned,
    selected,
  };
}
