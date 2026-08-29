import type { ParseIssue } from "../engine/model/ParseIssue";
import { detectWrittenPatternRows } from "./detectRows";
import { interpretWrittenPatternDocument } from "./interpretRow";

export type PreparedPattern = {
  notation: string;
  issues: ParseIssue[];
  interpreted: boolean;
};

const NATURAL_PATTERN_MARKERS =
  /\b(?:faire|faites|crocheter|crochetez|r[ée]aliser|r[ée]alisez|cr[ée]er|cr[ée]ez|former|formez|travailler|travaillez|dans\s+chaque|dans\s+chacune|cercle\s+magique)\b/i;

/**
 * Frontière entre le lecteur de français naturel et le moteur Cartomailles.
 * Le texte source n'est jamais modifié ; seule la notation produite ici est
 * transmise au parseur du moteur.
 */
export function preparePatternForEngine(source: string): PreparedPattern {
  if (!NATURAL_PATTERN_MARKERS.test(source)) {
    return { notation: source, issues: [], interpreted: false };
  }

  const detected = detectWrittenPatternRows(source);
  const document = interpretWrittenPatternDocument(detected.document);
  const issues: ParseIssue[] = [
    ...detected.issues.map((issue) => ({
      round: document.rows[0]?.number ?? 1,
      message: issue.message,
    })),
    ...document.rows.flatMap((row) =>
      row.issues
        .map((issue) => ({ round: row.number, message: issue.message }))
    ),
  ];

  return {
    notation: document.rows
      .map((row) => row.cartomaillesText.trim())
      .filter(Boolean)
      .join("\n"),
    issues,
    interpreted: true,
  };
}
