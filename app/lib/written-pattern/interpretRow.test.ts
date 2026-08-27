import { describe, expect, it } from "vitest";
import { parsePattern } from "../engine/parser/parsePattern";
import { detectWrittenPatternRows } from "./detectRows";
import {
  interpretWrittenPatternDocument,
  interpretWrittenPatternRow,
} from "./interpretRow";

function interpret(source: string) {
  const detected = detectWrittenPatternRows(source).document;
  return interpretWrittenPatternDocument(detected);
}

describe("interprétation minimale d'un patron écrit", () => {
  it.each([
    ["1 ml", "1 ml", "1 maille en l'air de début de rang"],
    ["deux mailles serrées", "2 ms", "2 mailles serrées"],
    ["3 demi-brides", "3 db", "3 demi-brides"],
    ["4 brides", "4 br", "4 brides"],
    ["2 doubles brides", "2 dbr", "2 doubles brides"],
    ["5 triples brides", "5 tb", "5 triples brides"],
    ["1 maille coulée", "1 mc", "1 maille coulée"],
  ])("traduit %s", (source, notation, description) => {
    const row = interpret(`Rang 1 : ${source}`).rows[0];

    expect(row.cartomaillesText).toBe(`R1 ${notation}`);
    expect(row.interpretation[0].description).toBe(description);
    expect(row.issues).toEqual([]);
  });

  it("distingue une chaîne de début d'un arceau", () => {
    const row = interpret("Rang 2 : 3 ml, 2 br, 1 ml, 1 br").rows[0];

    expect(row.interpretation.map((entry) => entry.description)).toEqual([
      "3 mailles en l'air de début de rang",
      "2 brides",
      "1 maille en l'air formant un arceau",
      "1 bride",
    ]);
  });

  it.each([
    ["2 mailles serrées dans la même maille", "1 aug(ms)"],
    ["2 demi-brides dans la même maille", "1 aug(db)"],
    ["2 brides dans la même maille", "1 aug(br)"],
    ["3 doubles brides dans la même maille", "1 same_3_dbr"],
    ["2 triples brides dans la même maille", "1 aug(tb)"],
  ])("traduit le partage de parent : %s", (source, notation) => {
    const row = interpret(`Rang 2 : ${source}`).rows[0];

    expect(row.cartomaillesText).toBe(`R2 ${notation}`);
    expect(row.interpretation[0].description).toContain("même maille parente");
  });

  it.each([
    ["sauter 1 maille", "1 skip", "1 maille sautée"],
    ["sautez trois mailles", "3 skip", "3 mailles sautées"],
  ])("traduit %s", (source, notation, description) => {
    const row = interpret(`Rang 2 : ${source}`).rows[0];

    expect(row.cartomaillesText).toBe(`R2 ${notation}`);
    expect(row.interpretation[0]).toMatchObject({
      kind: "skip",
      description,
    });
  });

  it.each([
    ["aug(ms)", "1 aug(ms)"],
    ["augmentation br", "1 aug(br)"],
    ["dim(db)", "1 dim(db)"],
    ["diminution dbr", "1 dim(dbr)"],
  ])("conserve les opérations explicites : %s", (source, notation) => {
    expect(interpret(`Rang 3 : ${source}`).rows[0].cartomaillesText)
      .toBe(`R3 ${notation}`);
  });

  it("marque une formulation inconnue comme bloquante sans l'inventer", () => {
    const row = interpret("Rang 1 : faire le motif fantaisie").rows[0];

    expect(row.cartomaillesText).toBe("");
    expect(row.review.status).toBe("needs-correction");
    expect(row.interpretation[0]).toMatchObject({
      kind: "unresolved",
      cartomaillesText: undefined,
    });
    expect(row.issues).toContainEqual(expect.objectContaining({
      code: "unresolved-instruction",
      severity: "error",
    }));
  });

  it("préserve les erreurs structurelles détectées avant l'interprétation", () => {
    const detected = detectWrittenPatternRows("Rang 1 :\nRang 1 : 6 ms").document;
    const interpreted = interpretWrittenPatternDocument(detected);

    expect(interpreted.rows[0].issues).toContainEqual(expect.objectContaining({ code: "empty-row" }));
    expect(interpreted.rows[1].issues).toContainEqual(expect.objectContaining({ code: "duplicate-row-number" }));
  });

  it("interprète l'exemple cible selon le contrat figé", () => {
    const source = "Rang 2 : 3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois.";
    const row = interpret(source).rows[0];

    expect(row.cartomaillesText).toBe("R2 3 ml, (1 aug(br), 1 ml, 1 skip) x5");
    expect(row.interpretation.map((entry) => entry.description)).toEqual([
      "3 mailles en l'air de début de rang",
      "2 brides ayant la même maille parente",
      "1 maille en l'air formant un arceau",
      "1 maille sautée",
      "Répéter le groupe précédent 5 fois",
    ]);
    expect(row.review.status).toBe("pending");

    const graph = parsePattern(`R1 10 ms\n${row.cartomaillesText}`);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 2 && stitch.type === "dc"))
      .toHaveLength(10);
  });

  it("ne modifie pas le texte source pendant l'interprétation", () => {
    const detected = detectWrittenPatternRows("Rang 1 :  6 MS.  ").document.rows[0];
    const interpreted = interpretWrittenPatternRow(detected);

    expect(interpreted.sourceText).toBe("6 MS.");
  });
});
