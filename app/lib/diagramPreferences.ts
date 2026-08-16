export type DiagramType = "circular" | "flat" | "granny";

export type DiagramPreferences = {
  symbolSize: number;
  strokeWidth: number;
  flatSpacing: number;
  circularSpacing: number;
  grannySpacing: number;
  showRowNumbers: boolean;
  oddSymbolColor: string;
  evenSymbolColor: string;
  defaultDiagramType: DiagramType;
};

export const DEFAULT_DIAGRAM_PREFERENCES: DiagramPreferences = {
  symbolSize: 1,
  strokeWidth: 2,
  flatSpacing: 55,
  circularSpacing: 40,
  grannySpacing: 62,
  showRowNumbers: true,
  oddSymbolColor: "#2F2F35",
  evenSymbolColor: "#C05A90",
  defaultDiagramType: "circular",
};
