import { describe, expect, it } from "vitest";
import {
  createWrittenPatternDocument,
  hasBlockingIssues,
  isWrittenPatternReady,
  isWrittenPatternRowReady,
} from "./model";
import type { WrittenPatternRow } from "./types";

function createRow(
  overrides: Partial<WrittenPatternRow> = {}
): WrittenPatternRow {
  return {
    id: "row-2",
    kind: "row",
    number: 2,
    sourceText: "3 ml, 2 brides dans la même maille",
    interpretation: [
      {
        id: "row-2-item-1",
        kind: "stitch",
        sourceText: "3 ml",
        description: "3 mailles en l'air de début de rang",
        cartomaillesText: "3 ml",
        issues: [],
      },
      {
        id: "row-2-item-2",
        kind: "stitch",
        sourceText: "2 brides dans la même maille",
        description: "2 brides ayant la même maille parente",
        cartomaillesText: "1 aug(br)",
        issues: [],
      },
    ],
    cartomaillesText: "R2 3 ml, 1 aug(br)",
    issues: [],
    review: { status: "pending" },
    ...overrides,
  };
}

describe("modèle intermédiaire de patron écrit", () => {
  it("crée un brouillon manuel en conservant exactement le texte source", () => {
    const sourceText = "  Rang 2 : 3 ml.\n";
    const document = createWrittenPatternDocument(sourceText);

    expect(document).toEqual({
      sourceKind: "manual",
      sourceText,
      rows: [],
    });
  });

  it.each(["manual", "pdf-text", "ocr"] as const)(
    "représente une provenance %s sans changer le modèle des rangs",
    (sourceKind) => {
      expect(createWrittenPatternDocument("Rang 1 : 6 ms", sourceKind))
        .toMatchObject({ sourceKind, rows: [] });
    }
  );

  it("distingue un avertissement d'une erreur bloquante", () => {
    expect(hasBlockingIssues([
      { code: "low-confidence", message: "À vérifier", severity: "warning" },
    ])).toBe(false);
    expect(hasBlockingIssues([
      { code: "unknown", message: "Instruction inconnue", severity: "error" },
    ])).toBe(true);
  });

  it("refuse un rang interprété mais pas encore validé humainement", () => {
    expect(isWrittenPatternRowReady(createRow())).toBe(false);
  });

  it("accepte un rang validé sans erreur bloquante", () => {
    expect(isWrittenPatternRowReady(createRow({
      review: { status: "validated", validatedAt: "2026-08-27T12:00:00.000Z" },
    }))).toBe(true);
  });

  it("refuse une notation vide même si le rang est marqué validé", () => {
    expect(isWrittenPatternRowReady(createRow({
      cartomaillesText: "   ",
      review: { status: "validated", validatedAt: "2026-08-27T12:00:00.000Z" },
    }))).toBe(false);
  });

  it("refuse une erreur portée par le rang", () => {
    expect(isWrittenPatternRowReady(createRow({
      issues: [{ code: "engine", message: "Symbole inconnu", severity: "error" }],
      review: { status: "validated", validatedAt: "2026-08-27T12:00:00.000Z" },
    }))).toBe(false);
  });

  it("refuse un segment non résolu même sans erreur technique", () => {
    expect(isWrittenPatternRowReady(createRow({
      interpretation: [{
        id: "row-2-unresolved",
        kind: "unresolved",
        sourceText: "faire le motif",
        description: "Instruction non comprise",
        issues: [],
      }],
      review: { status: "validated", validatedAt: "2026-08-27T12:00:00.000Z" },
    }))).toBe(false);
  });

  it("exige au moins un rang et la validation de tous les rangs", () => {
    const empty = createWrittenPatternDocument("Rang 1 : 6 ms");
    const partial = {
      ...empty,
      rows: [
        createRow({
          id: "row-1",
          number: 1,
          review: { status: "validated", validatedAt: "2026-08-27T12:00:00.000Z" },
        }),
        createRow({ id: "row-2", number: 2 }),
      ],
    };
    const validated = {
      ...partial,
      rows: partial.rows.map((row) => ({
        ...row,
        review: {
          status: "validated" as const,
          validatedAt: "2026-08-27T12:00:00.000Z",
        },
      })),
    };

    expect(isWrittenPatternReady(empty)).toBe(false);
    expect(isWrittenPatternReady(partial)).toBe(false);
    expect(isWrittenPatternReady(validated)).toBe(true);
  });
});
