"use client";

import { useMemo } from "react";
import { layoutCircularGroups } from "@/app/lib/engine/layout/layoutCircularGroups";
import { parsePattern } from "../lib/engine/parser/parsePattern";
import { layoutFlatGroups } from "../lib/engine/layout/layoutFlatGroups";
import { layoutGrannyGroups } from "../lib/engine/layout/layoutGrannyGroups";
import { StitchAdjustments } from "@/app/lib/engine/model/StitchAdjustments";
import { usePreferences } from "@/app/components/preferences/PreferencesContext";
import { preparePatternForEngine } from "@/app/lib/written-pattern/preparePatternForEngine";
import { applyFlatRowDirections } from "@/app/lib/engine/layout/flatRowDirection";

export function useCrochetEngine(
  pattern: string,
  selectedId: string | null,
  diagramType: "circular" | "flat" | "granny",
  adjustments: StitchAdjustments
) {
  const { preferences } = usePreferences();
  
 const parsedGraph = useMemo(() => {
  const prepared = preparePatternForEngine(pattern);
  const result = parsePattern(prepared.notation);

  return {
    ...result,
    issues: [...prepared.issues, ...result.issues],
  };
 }, [pattern]);

  const graph = useMemo(
    () => diagramType === "flat" ? applyFlatRowDirections(parsedGraph) : parsedGraph,
    [parsedGraph, diagramType]
  );

  const positioned = useMemo(() => {
    const layout = diagramType === "flat"
      ? layoutFlatGroups(graph, preferences.flatSpacing)
      : diagramType === "granny"
        ? layoutGrannyGroups(graph, preferences.grannySpacing)
        : layoutCircularGroups(graph, preferences.circularSpacing);

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
  }, [graph, diagramType, adjustments, preferences.flatSpacing, preferences.circularSpacing, preferences.grannySpacing]);

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
