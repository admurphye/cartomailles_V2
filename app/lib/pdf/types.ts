export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedPdf = {
  fullText: string;
  pages: ExtractedPdfPage[];
};

export type DetectedHeading = { id: string; title: string; normalizedTitle: string; level: number; pageNumber: number; lineIndex: number; documentIndex: number };

export type ExtractedPatternRow = { type: "row" | "round"; number: number; originalText: string; expectedCount?: number; pageNumber: number; sourceLabel: string; sourceNumber: number; documentIndex: number };

export type ImportedAbbreviation = {
  source: string;
  description: string;
  mappedType?: string;
  confidence: number;
};

export type ImportedPatternType = "circular" | "flat" | "granny" | "triangular" | "unknown";

export type ImportedSection = {
  id: string;
  title: string;
  sourceText: string;
  pageStart?: number;
  pageEnd?: number;
  rowCount?: number;
  level?: number;
  parentId?: string;
  rows?: ExtractedPatternRow[];
};

export type ImportedRow = {
  number: number;
  pageNumber?: number;
  expectedCount?: number;
  direction?: "left-to-right" | "right-to-left";
  originalText: string;
  normalizedText: string;
  status: "ok" | "warning" | "unsupported";
  warnings: string[];
  confidence: number;
};

export type DetectedPatternType = {
  type: ImportedPatternType;
  confidence: number;
};

export type ImportedPatternSize = {
  id: string;
  label: string;
  index: number;
};
