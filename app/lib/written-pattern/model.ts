import type {
  WrittenPatternDocument,
  WrittenPatternIssue,
  WrittenPatternRow,
  WrittenPatternSourceKind,
} from "./types";

export function createWrittenPatternDocument(
  sourceText: string,
  sourceKind: WrittenPatternSourceKind = "manual"
): WrittenPatternDocument {
  return {
    sourceKind,
    sourceText,
    rows: [],
  };
}

export function hasBlockingIssues(issues: WrittenPatternIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

export function isWrittenPatternRowReady(row: WrittenPatternRow): boolean {
  return (
    row.review.status === "validated" &&
    row.cartomaillesText.trim().length > 0 &&
    !hasBlockingIssues(row.issues) &&
    row.interpretation.every(
      (item) =>
        item.kind !== "unresolved" &&
        !hasBlockingIssues(item.issues)
    )
  );
}

/**
 * La génération exige au moins un rang et une validation humaine de chacun.
 */
export function isWrittenPatternReady(
  document: WrittenPatternDocument
): boolean {
  return (
    document.rows.length > 0 &&
    document.rows.every(isWrittenPatternRowReady)
  );
}

