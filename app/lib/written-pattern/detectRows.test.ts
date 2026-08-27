import { describe, expect, it } from "vitest";
import { detectWrittenPatternRows } from "./detectRows";

describe("détection des rangs d'un patron écrit", () => {
  it.each([
    ["Rang 2 : 3 ml", "row", 2, "3 ml"],
    ["Rg 3. 6 ms", "row", 3, "6 ms"],
    ["R4 8 br", "row", 4, "8 br"],
    ["Tour 5 : 10 db", "round", 5, "10 db"],
    ["Tr 6 - 12 ms", "round", 6, "12 ms"],
  ] as const)("reconnaît %s", (source, kind, number, body) => {
    const result = detectWrittenPatternRows(source);

    expect(result.issues).toEqual([]);
    expect(result.document.rows).toHaveLength(1);
    expect(result.document.rows[0]).toMatchObject({
      kind,
      number,
      sourceText: body,
      interpretation: [],
      cartomaillesText: "",
      review: { status: "pending" },
    });
  });

  it("rattache les lignes de continuation au rang précédent", () => {
    const result = detectWrittenPatternRows([
      "Rang 1 : 6 ms,",
      "puis fermer par 1 mc.",
      "Rang 2 : 3 ml, 6 br",
    ].join("\n"));

    expect(result.document.rows.map((row) => row.sourceText)).toEqual([
      "6 ms,\npuis fermer par 1 mc.",
      "3 ml, 6 br",
    ]);
  });

  it("préserve le texte intégral et la provenance du document", () => {
    const sourceText = "Tour 1 : 6 ms\r\nTour 2 : 6 aug(ms)";
    const result = detectWrittenPatternRows(sourceText, "ocr");

    expect(result.document.sourceText).toBe(sourceText);
    expect(result.document.sourceKind).toBe("ocr");
  });

  it("accepte des numéros non consécutifs sans les réécrire", () => {
    const result = detectWrittenPatternRows("Rang 2 : 6 ms\nRang 5 : 8 br");

    expect(result.document.rows.map((row) => row.number)).toEqual([2, 5]);
  });

  it("utilise une ligne non vide par rang lorsque les marqueurs sont absents", () => {
    const result = detectWrittenPatternRows("6 ms\n\n6 aug(ms)\n12 ms");

    expect(result.issues).toEqual([]);
    expect(result.document.rows.map((row) => ({
      number: row.number,
      sourceText: row.sourceText,
    }))).toEqual([
      { number: 1, sourceText: "6 ms" },
      { number: 2, sourceText: "6 aug(ms)" },
      { number: 3, sourceText: "12 ms" },
    ]);
  });

  it("signale sans le perdre qu'un préambule précède les rangs explicites", () => {
    const sourceText = "Instructions générales\nRang 1 : 6 ms";
    const result = detectWrittenPatternRows(sourceText);

    expect(result.document.sourceText).toBe(sourceText);
    expect(result.document.rows).toHaveLength(1);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "ignored-preamble",
      severity: "warning",
    }));
  });

  it("signale un rang vide et demande une correction", () => {
    const result = detectWrittenPatternRows("Rang 1 :\nRang 2 : 6 ms");

    expect(result.document.rows[0]).toMatchObject({
      number: 1,
      review: { status: "needs-correction" },
    });
    expect(result.document.rows[0].issues).toContainEqual(expect.objectContaining({
      code: "empty-row",
      severity: "error",
    }));
  });

  it("signale les numéros dupliqués et conserve les deux occurrences", () => {
    const result = detectWrittenPatternRows("Rang 1 : 6 ms\nRang 1 : 8 ms");

    expect(result.document.rows.map((row) => row.id)).toEqual(["row-1", "row-1-2"]);
    expect(result.document.rows[1].issues).toContainEqual(expect.objectContaining({
      code: "duplicate-row-number",
      severity: "error",
    }));
  });

  it("retourne une erreur structurée pour un texte vide", () => {
    const result = detectWrittenPatternRows(" \n\n ");

    expect(result.document.rows).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "no-rows",
      severity: "error",
    }));
  });

  it("détecte l'exemple cible sans encore l'interpréter", () => {
    const source = "Rang 2 : 3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois.";
    const result = detectWrittenPatternRows(source);

    expect(result.document.rows).toHaveLength(1);
    expect(result.document.rows[0]).toMatchObject({
      kind: "row",
      number: 2,
      sourceText: "3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois.",
      interpretation: [],
      cartomaillesText: "",
      review: { status: "pending" },
    });
  });
});
