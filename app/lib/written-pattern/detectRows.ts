import { createWrittenPatternDocument } from "./model";
import type {
  WrittenPatternDocument,
  WrittenPatternIssue,
  WrittenPatternRow,
  WrittenPatternRowKind,
  WrittenPatternSourceKind,
} from "./types";

const EXPLICIT_ROW = /^\s*(rang|rg|r|tour|tr)\s*\.?\s*(\d+)\s*(?:(?:[:.)-])\s*)?(.*)$/i;

type RowDraft = {
  kind: WrittenPatternRowKind;
  number: number;
  bodyLines: string[];
};

export interface WrittenPatternDetectionResult {
  document: WrittenPatternDocument;
  issues: WrittenPatternIssue[];
}

function rowKind(label: string): WrittenPatternRowKind {
  return /^(?:tour|tr)$/i.test(label) ? "round" : "row";
}

function createRowId(
  kind: WrittenPatternRowKind,
  number: number,
  occurrence: number
): string {
  const base = `${kind}-${number}`;
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

function materializeRows(drafts: RowDraft[]): WrittenPatternRow[] {
  const occurrences = new Map<string, number>();

  return drafts.map((draft) => {
    const occurrenceKey = `${draft.kind}-${draft.number}`;
    const occurrence = (occurrences.get(occurrenceKey) ?? 0) + 1;
    occurrences.set(occurrenceKey, occurrence);
    const sourceText = draft.bodyLines.join("\n").trim();
    const issues: WrittenPatternIssue[] = [];

    if (!sourceText) {
      issues.push({
        code: "empty-row",
        message: `${draft.kind === "round" ? "Le tour" : "Le rang"} ${draft.number} ne contient aucune instruction.`,
        severity: "error",
      });
    }

    if (occurrence > 1) {
      issues.push({
        code: "duplicate-row-number",
        message: `${draft.kind === "round" ? "Le tour" : "Le rang"} ${draft.number} apparaît plusieurs fois.`,
        severity: "error",
      });
    }

    return {
      id: createRowId(draft.kind, draft.number, occurrence),
      kind: draft.kind,
      number: draft.number,
      sourceText,
      interpretation: [],
      cartomaillesText: "",
      issues,
      review: issues.length > 0
        ? { status: "needs-correction" }
        : { status: "pending" },
    };
  });
}

/**
 * Détecte uniquement la structure des rangs. Le contenu reste intact et n'est
 * ni normalisé ni envoyé au parseur du moteur.
 *
 * En présence d'au moins un marqueur explicite, les lignes suivantes sont
 * rattachées au rang courant jusqu'au prochain marqueur. Sans marqueur, chaque
 * ligne non vide devient un rang successif à partir de 1, comme dans la saisie
 * manuelle historique de Cartomailles.
 */
export function detectWrittenPatternRows(
  sourceText: string,
  sourceKind: WrittenPatternSourceKind = "manual"
): WrittenPatternDetectionResult {
  const document = createWrittenPatternDocument(sourceText, sourceKind);
  const issues: WrittenPatternIssue[] = [];
  const lines = sourceText.replace(/\r\n?/g, "\n").split("\n");
  const hasExplicitRows = lines.some((line) => EXPLICIT_ROW.test(line));
  const drafts: RowDraft[] = [];

  if (!hasExplicitRows) {
    lines.forEach((line) => {
      if (!line.trim()) return;
      drafts.push({
        kind: "row",
        number: drafts.length + 1,
        bodyLines: [line.trim()],
      });
    });
  } else {
    let active: RowDraft | null = null;
    const preamble: string[] = [];

    lines.forEach((line) => {
      const match = line.match(EXPLICIT_ROW);

      if (match) {
        active = {
          kind: rowKind(match[1]),
          number: Number(match[2]),
          bodyLines: [match[3]],
        };
        drafts.push(active);
        return;
      }

      if (active) {
        active.bodyLines.push(line);
      } else if (line.trim()) {
        preamble.push(line.trim());
      }
    });

    if (preamble.length > 0) {
      issues.push({
        code: "ignored-preamble",
        message: "Du texte placé avant le premier rang ou tour n'a pas été rattaché à une instruction.",
        severity: "warning",
      });
    }
  }

  if (drafts.length === 0) {
    issues.push({
      code: "no-rows",
      message: "Aucun rang ou tour n'a été détecté.",
      severity: "error",
    });
  }

  return {
    document: {
      ...document,
      rows: materializeRows(drafts),
    },
    issues,
  };
}
