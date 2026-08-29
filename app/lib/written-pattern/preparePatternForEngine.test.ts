import { describe, expect, it } from "vitest";
import { parsePattern } from "../engine/parser/parsePattern";
import { preparePatternForEngine } from "./preparePatternForEngine";

describe("préparation d'un patron avant le moteur", () => {
  it("interprète le français avant de valider la notation Cartomailles", () => {
    const source = `Tour 1 : Faire un cercle magique et crocheter 6 ms dans le cercle.
Tour 2 : Crochetez 2 ms dans chaque maille du tour précédent.`;
    const prepared = preparePatternForEngine(source);
    const graph = parsePattern(prepared.notation);

    expect(prepared.interpreted).toBe(true);
    expect(prepared.notation).toBe("R1 1 mr, 6 ms\nR2 6 aug(ms)");
    expect(prepared.issues).toEqual([]);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 1 && stitch.type === "sc"))
      .toHaveLength(6);
    expect(graph.stitches.filter((stitch) => stitch.round === 2 && stitch.type === "sc"))
      .toHaveLength(12);
  });

  it("interprète un bloc répété avant sa segmentation générale", () => {
    const source = `Tour 1 : Faire un cercle magique et crocheter 6 ms dans le cercle.
Tour 2 : Crochetez 2 ms dans chaque maille du tour précédent.
Tour 3 : Crochetez *1 ms dans la maille suivante, 2 ms dans la maille suivante*, répétez 6 fois.`;
    const prepared = preparePatternForEngine(source);
    const graph = parsePattern(prepared.notation);

    expect(prepared.notation).toBe(
      "R1 1 mr, 6 ms\nR2 6 aug(ms)\nR3 (1 ms, 1 aug(ms)) x6"
    );
    expect(prepared.issues).toEqual([]);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 1 && stitch.type === "sc"))
      .toHaveLength(6);
    expect(graph.stitches.filter((stitch) => stitch.round === 2 && stitch.countsAsStitch))
      .toHaveLength(12);
    expect(graph.stitches.filter((stitch) => stitch.round === 3 && stitch.countsAsStitch))
      .toHaveLength(18);
  });

  it("interprète séparément quantité par parent et nombre de parents", () => {
    const source = `Tour 1 : Faire un cercle magique et crocheter 6 ms dans le cercle.
Tour 2 : Crochetez 2 ms dans chaque maille du tour précédent.
Tour 3 : Crochetez *1 ms dans la maille suivante, 2 ms dans la maille suivante*, répétez 6 fois.
Tour 4 : Crochetez *1 ms dans chacune des 2 mailles suivantes, 2 ms dans la maille suivante*, répétez 6 fois.`;
    const prepared = preparePatternForEngine(source);
    const graph = parsePattern(prepared.notation);

    expect(prepared.notation).toBe(
      "R1 1 mr, 6 ms\n" +
      "R2 6 aug(ms)\n" +
      "R3 (1 ms, 1 aug(ms)) x6\n" +
      "R4 (2 ms, 1 aug(ms)) x6"
    );
    expect(prepared.issues).toEqual([]);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 1 && stitch.type === "sc"))
      .toHaveLength(6);
    expect(graph.stitches.filter((stitch) => stitch.round === 2 && stitch.type === "sc"))
      .toHaveLength(12);
    expect(graph.stitches.filter((stitch) => stitch.round === 3 && stitch.type === "sc"))
      .toHaveLength(18);
    expect(graph.stitches.filter((stitch) => stitch.round === 4 && stitch.type === "sc"))
      .toHaveLength(24);
  });

  it("interprète une diminution dont le type est hérité dans le motif", () => {
    const source = `Tour 1 : Faire un cercle magique et crocheter 6 ms dans le cercle.
Tour 2 : Crochetez 2 ms dans chaque maille du tour précédent.
Tour 3 : Crochetez *1 ms dans la maille suivante, 2 ms dans la maille suivante*, répétez 6 fois.
Tour 4 : Crochetez *1 ms dans chacune des 2 mailles suivantes, 2 ms dans la maille suivante*, répétez 6 fois.
Tour 5 : Crochetez *1 ms dans chacune des 2 mailles suivantes, puis crochetez les 2 mailles suivantes ensemble*, répétez 6 fois.`;
    const prepared = preparePatternForEngine(source);
    const graph = parsePattern(prepared.notation);

    expect(prepared.notation).toContain("R5 (2 ms, 1 dim(ms)) x6");
    expect(prepared.issues).toEqual([]);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 5 && stitch.type === "sc"))
      .toHaveLength(18);
    expect([1, 2, 3, 4, 5].map((round) =>
      graph.stitches.filter(
        (stitch) => stitch.round === round && stitch.countsAsStitch
      ).length
    )).toEqual([6, 12, 18, 24, 18]);
  });

  it.each([
    [
      "Rang 2 : Faites 3 mailles en l'air, puis crochetez 1 bride dans chacune des 15 mailles suivantes.",
      15,
      false,
    ],
    [
      "Rang 2 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis crochetez 14 brides.",
      14,
      true,
    ],
    [
      "Rang 2 : Faites 3 mailles en l'air, elles ne comptent pas comme une bride, puis crochetez 15 brides.",
      15,
      false,
    ],
  ])("place et compte correctement une chaîne de début : %s", (secondRow, brideCount, chainCounts) => {
    const source = `Rang 1 : Faites 15 mailles en l'air.\n${secondRow}`;
    const prepared = preparePatternForEngine(source);
    const graph = parsePattern(prepared.notation);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");
    const brides = secondRound.filter((stitch) => stitch.type === "dc");

    expect(prepared.issues).toEqual([]);
    expect(graph.issues).toEqual([]);
    expect(turningChain).toHaveLength(3);
    expect(turningChain.some((stitch) => stitch.countsAsStitch)).toBe(chainCounts);
    expect(brides).toHaveLength(brideCount);
    expect(secondRound.filter((stitch) => stitch.countsAsStitch)).toHaveLength(15);
  });

  it("produit une seule erreur de lecture pour une phrase naturelle inconnue", () => {
    const prepared = preparePatternForEngine(
      "Tour 1 : Crochetez le mystérieux motif étoilé."
    );

    expect(prepared.interpreted).toBe(true);
    expect(prepared.issues).toHaveLength(1);
    expect(prepared.issues[0].message).toContain("Instruction non comprise");
    expect(prepared.issues[0].message).not.toContain("Symbole non reconnu");
  });

  it("laisse une notation Cartomailles directe inchangée", () => {
    const source = "R1 6 ms\nR2 6 aug(ms)";
    expect(preparePatternForEngine(source)).toEqual({
      notation: source,
      issues: [],
      interpreted: false,
    });
  });
});
