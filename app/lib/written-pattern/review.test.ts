import { describe, expect, it } from "vitest";
import { detectWrittenPatternRows } from "./detectRows";
import { interpretWrittenPatternDocument } from "./interpretRow";
import { isWrittenPatternReady } from "./model";
import {
  applyManualCartomaillesCorrection,
  reanalyzeWrittenPatternRow,
  validateWrittenPatternRow,
} from "./review";

function rowFrom(source: string) {
  const detected = detectWrittenPatternRows(source).document;
  return interpretWrittenPatternDocument(detected).rows[0];
}

describe("correction et validation humaines", () => {
  it("réanalyse le texte corrigé et invalide une validation précédente", () => {
    const validated = validateWrittenPatternRow(rowFrom("Rang 1 : 6 ms"), "2026-08-27T12:00:00.000Z");
    const corrected = reanalyzeWrittenPatternRow(validated, "8 ms");

    expect(validated.review.status).toBe("validated");
    expect(corrected.review.status).toBe("pending");
    expect(corrected.cartomaillesText).toBe("R1 8 ms");
  });

  it("accepte une correction manuelle comprise par le moteur", () => {
    const unresolved = rowFrom("Rang 2 : faire le motif fantaisie");
    const corrected = applyManualCartomaillesCorrection(unresolved, "R2 3 br, 1 ml");

    expect(corrected.issues).toEqual([]);
    expect(corrected.review.status).toBe("pending");
    expect(corrected.interpretation).toEqual([
      expect.objectContaining({ kind: "manual", cartomaillesText: "R2 3 br, 1 ml" }),
    ]);
  });

  it("refuse une correction manuelle inconnue du moteur", () => {
    const corrected = applyManualCartomaillesCorrection(
      rowFrom("Rang 1 : 6 ms"),
      "R1 6 symbole-inconnu"
    );

    expect(corrected.review.status).toBe("needs-correction");
    expect(corrected.issues).toContainEqual(expect.objectContaining({
      code: "engine-parse-error",
      severity: "error",
    }));
  });

  it("refuse une correction portant le numéro d'un autre rang", () => {
    const corrected = applyManualCartomaillesCorrection(
      rowFrom("Rang 2 : 6 ms"),
      "R3 6 ms"
    );

    expect(corrected.review.status).toBe("needs-correction");
    expect(corrected.issues).toContainEqual(expect.objectContaining({
      code: "row-number-mismatch",
      severity: "error",
    }));
  });

  it("ne valide pas un rang tant qu'une erreur subsiste", () => {
    const unresolved = rowFrom("Rang 1 : instruction inconnue");
    expect(validateWrittenPatternRow(unresolved).review.status).toBe("needs-correction");
  });

  it("rend un document prêt uniquement après validation de tous ses rangs", () => {
    const document = interpretWrittenPatternDocument(
      detectWrittenPatternRows("Rang 1 : 6 ms\nRang 2 : 6 brides").document
    );
    const partiallyValidated = {
      ...document,
      rows: [
        validateWrittenPatternRow(document.rows[0], "2026-08-27T12:00:00.000Z"),
        document.rows[1],
      ],
    };
    const validated = {
      ...partiallyValidated,
      rows: partiallyValidated.rows.map((row) =>
        validateWrittenPatternRow(row, "2026-08-27T12:00:00.000Z")
      ),
    };

    expect(isWrittenPatternReady(partiallyValidated)).toBe(false);
    expect(isWrittenPatternReady(validated)).toBe(true);
  });
});
