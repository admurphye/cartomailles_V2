import type { DetectedPatternType, ImportedSection, ImportedPatternType } from "./types";

const SIGNALS: Record<Exclude<ImportedPatternType, "unknown">, RegExp[]> = {
  circular: [/cercle magique|magic ring|travailler en tours?|\bt(?:ou)?r\s*\d+/i],
  flat: [/tourner|rang suivant|cha[iî]nette de d[ée]part/i],
  granny: [/granny|african flower|coins?|groupes? de brides|esp(?:ace)?[- ](?:de )?ml/i],
  triangular: [/triangulaire|demi[- ]carr[ée]|maille centrale|augmentation au centre/i],
};

export function detectPatternType(section: ImportedSection): DetectedPatternType {
  const scores = Object.entries(SIGNALS).map(([type, patterns]) => ({
    type: type as Exclude<ImportedPatternType, "unknown">,
    score: patterns.reduce((score, pattern) => score + (pattern.test(`${section.title}\n${section.sourceText}`) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  if (!scores[0] || scores[0].score === 0 || scores[0].score === scores[1]?.score) return { type: "unknown", confidence: 0.3 };
  return { type: scores[0].type, confidence: Math.min(0.95, 0.55 + scores[0].score * 0.15) };
}
