"use client";

import { useMemo } from "react";
import { layoutCircularGroups } from "@/app/lib/engine/layout/layoutCircularGroups";
import { parsePattern } from "../lib/engine/parser/parsePattern";
import { layoutFlatGroups } from "../lib/engine/layout/layoutFlatGroups";

export function useCrochetEngine(
  pattern: string,
  selectedId: string | null,
  diagramType: "circular" | "flat"
) {
  
 const graph = useMemo(() => {

  const result = parsePattern(pattern);

  return result;
}, [pattern]);

  const positioned = useMemo(() => {
 if (diagramType === "flat") {
    return layoutFlatGroups(graph);
}

return layoutCircularGroups(graph);
}, [graph, diagramType]);

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