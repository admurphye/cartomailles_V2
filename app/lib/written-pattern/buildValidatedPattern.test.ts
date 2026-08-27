import { describe, expect, it } from "vitest";
import { parsePattern } from "../engine/parser/parsePattern";
import { buildValidatedCartomaillesPattern } from "./buildValidatedPattern";
import { detectWrittenPatternRows } from "./detectRows";
import { interpretWrittenPatternDocument } from "./interpretRow";
import { validateWrittenPatternRow } from "./review";

function interpretedDocument(source: string) {
  return interpretWrittenPatternDocument(
    detectWrittenPatternRows(source).document
  );
}

describe("assemblage du patron écrit validé", () => {
  it("refuse d'assembler un document non validé", () => {
    const document = interpretedDocument("Rang 1 : 6 mailles serrées");

    expect(buildValidatedCartomaillesPattern(document)).toBeNull();
  });

  it("refuse d'assembler si un seul rang reste à valider", () => {
    const document = interpretedDocument(
      "Rang 1 : 6 mailles serrées\nRang 2 : 6 brides"
    );
    const partial = {
      ...document,
      rows: [
        validateWrittenPatternRow(document.rows[0], "2026-08-27T12:00:00.000Z"),
        document.rows[1],
      ],
    };

    expect(buildValidatedCartomaillesPattern(partial)).toBeNull();
  });

  it("assemble les rangs validés dans leur ordre de détection", () => {
    const document = interpretedDocument(
      "Rang 1 : 10 mailles serrées\nRang 2 : 3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois."
    );
    const validated = {
      ...document,
      rows: document.rows.map((row) =>
        validateWrittenPatternRow(row, "2026-08-27T12:00:00.000Z")
      ),
    };

    const pattern = buildValidatedCartomaillesPattern(validated);

    expect(pattern).toBe([
      "R1 10 ms",
      "R2 3 ml, (1 aug(br), 1 ml, 1 skip) x5",
    ].join("\n"));

    const graph = parsePattern(pattern!);
    expect(graph.issues).toEqual([]);
    expect(graph.rounds.map((round) => round.number)).toEqual([1, 2]);
    expect(graph.stitches.filter(
      (stitch) => stitch.round === 2 && stitch.type === "dc"
    )).toHaveLength(10);
  });
});

