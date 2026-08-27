import { parsePattern } from "../engine/parser/parsePattern";
import { interpretWrittenPatternRow } from "./interpretRow";
import { hasBlockingIssues, isWrittenPatternRowReady } from "./model";
import type { WrittenPatternIssue, WrittenPatternRow } from "./types";

const ANALYSIS_ISSUES = new Set([
  "unresolved-instruction",
  "empty-repeat",
  "engine-parse-error",
  "empty-cartomailles-notation",
  "row-number-mismatch",
]);

function structuralIssues(row: WrittenPatternRow): WrittenPatternIssue[] {
  return row.issues.filter((issue) => !ANALYSIS_ISSUES.has(issue.code));
}

export function reanalyzeWrittenPatternRow(
  row: WrittenPatternRow,
  sourceText: string
): WrittenPatternRow {
  return interpretWrittenPatternRow({
    ...row,
    sourceText,
    interpretation: [],
    cartomaillesText: "",
    issues: structuralIssues(row),
    review: { status: "pending" },
  });
}

export function applyManualCartomaillesCorrection(
  row: WrittenPatternRow,
  cartomaillesText: string
): WrittenPatternRow {
  const notation = cartomaillesText.trim();
  const issues = structuralIssues(row);

  if (!notation) {
    issues.push({
      code: "empty-cartomailles-notation",
      message: "La notation Cartomailles du rang est vide.",
      severity: "error",
    });
  } else {
    const graph = parsePattern(notation);
    graph.issues.forEach((issue) => issues.push({
      code: "engine-parse-error",
      message: issue.message,
      severity: "error",
    }));
    if (
      graph.rounds.length !== 1 ||
      graph.rounds[0]?.number !== row.number
    ) {
      issues.push({
        code: "row-number-mismatch",
        message: `La notation doit décrire uniquement R${row.number}.`,
        severity: "error",
      });
    }
  }

  return {
    ...row,
    cartomaillesText,
    interpretation: [{
      id: `${row.id}-manual`,
      kind: "manual",
      sourceText: row.sourceText,
      description: "Interprétation Cartomailles corrigée manuellement",
      cartomaillesText: notation || undefined,
      issues: issues.filter((issue) => ANALYSIS_ISSUES.has(issue.code)),
    }],
    issues,
    review: hasBlockingIssues(issues)
      ? { status: "needs-correction" }
      : { status: "pending" },
  };
}

export function validateWrittenPatternRow(
  row: WrittenPatternRow,
  validatedAt: string = new Date().toISOString()
): WrittenPatternRow {
  const candidate = { ...row, review: { status: "validated" as const, validatedAt } };
  return isWrittenPatternRowReady(candidate)
    ? candidate
    : { ...row, review: { status: "needs-correction" } };
}
