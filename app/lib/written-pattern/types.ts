/** Provenance du texte avant interprétation. */
export type WrittenPatternSourceKind = "manual" | "pdf-text" | "ocr";

export type WrittenPatternRowKind = "row" | "round";

export type WrittenPatternIssueSeverity = "warning" | "error";

/**
 * Problème rattaché au texte source ou à sa traduction Cartomailles.
 * Les offsets sont optionnels car une erreur du moteur ne désigne pas encore
 * nécessairement une portion précise du texte écrit.
 */
export interface WrittenPatternIssue {
  code: string;
  message: string;
  severity: WrittenPatternIssueSeverity;
  sourceStart?: number;
  sourceEnd?: number;
}

export type WrittenPatternInterpretationKind =
  | "stitch"
  | "repeat"
  | "skip"
  | "manual"
  | "unresolved";

/** Une unité lisible de l'interprétation présentée à l'utilisatrice. */
export interface WrittenPatternInterpretationItem {
  id: string;
  kind: WrittenPatternInterpretationKind;
  sourceText: string;
  description: string;
  /** Fragment de notation moteur, absent lorsque l'élément reste incompris. */
  cartomaillesText?: string;
  issues: WrittenPatternIssue[];
}

/**
 * La validation est volontairement explicite et distincte de la confiance de
 * l'analyse automatique. Seule l'utilisatrice peut faire passer un rang à
 * l'état `validated`.
 */
export type WrittenPatternReview =
  | { status: "pending" }
  | { status: "needs-correction" }
  | { status: "validated"; validatedAt: string };

export interface WrittenPatternRow {
  id: string;
  kind: WrittenPatternRowKind;
  number: number;
  /** Texte du rang conservé et modifiable, sans normalisation destructive. */
  sourceText: string;
  /** Interprétation structurée et lisible du texte source. */
  interpretation: WrittenPatternInterpretationItem[];
  /** Ligne complète destinée à parsePattern, par exemple `R2 6 ms`. */
  cartomaillesText: string;
  issues: WrittenPatternIssue[];
  review: WrittenPatternReview;
}

export interface WrittenPatternDocument {
  sourceKind: WrittenPatternSourceKind;
  /** Texte intégral conservé pour permettre correction et nouvelle analyse. */
  sourceText: string;
  rows: WrittenPatternRow[];
}
