import { parsePattern } from "../engine/parser/parsePattern";
import type { ImportedRow } from "./types";

const UNSUPPORTED = /\b(?:conditional_repeat|picot|marqueur|jusqu['’]?à)\b/i;

export function validateImportedPattern(rows: ImportedRow[]): ImportedRow[] {
  return rows.map((row) => {
    const graph = parsePattern(row.normalizedText);
    const warnings = graph.issues.map((issue) => issue.message);
    if (UNSUPPORTED.test(row.normalizedText)) warnings.push("Cette instruction dépend d'une construction qui n'est pas encore prise en charge.");
    const status = warnings.length === 0 ? "ok" : UNSUPPORTED.test(row.normalizedText) ? "unsupported" : "warning";
    return { ...row, status, warnings, confidence: status === "ok" ? Math.max(row.confidence, 0.9) : Math.min(row.confidence, status === "unsupported" ? 0.35 : 0.65) };
  });
}
