import { describe, expect, it } from "vitest";
import { parseExpression } from "./parseExpression";
import { parsePattern } from "./parsePattern";

describe("contrat de notation Cartomailles", () => {
  it.each([
    ["mr", "mr"], ["cm", "mr"],
    ["ml", "ch"], ["ch", "ch"],
    ["mc", "slst"], ["slst", "slst"],
    ["ms", "sc"], ["sc", "sc"],
    ["db", "hdc"], ["hdc", "hdc"],
    ["b", "dc"], ["br", "dc"], ["dc", "dc"],
    ["brav", "fpdc"], ["br_av", "fpdc"], ["fpdc", "fpdc"],
    ["brar", "bpdc"], ["br_ar", "bpdc"], ["bpdc", "bpdc"],
    ["tb", "tr"], ["tbr", "tr"], ["tr", "tr"],
    ["dbr", "dtr"], ["dtr", "dtr"],
    ["popcorn", "popcorn"], ["pop", "popcorn"],
  ] as const)("reconnaît la maille %s comme %s", (notation, type) => {
    expect(parseExpression(notation)).toMatchObject({
      type,
      operation: "normal",
      produces: 1,
    });
  });

  it.each([
    "aug(ms)", "augmentation(ms)", "inc(ms)", "increase(ms)",
  ])("reconnaît l'augmentation %s", (notation) => {
    expect(parseExpression(notation)).toEqual({
      type: "sc", operation: "increase", consumes: 1, produces: 2,
    });
  });

  it.each([
    "dim(br)", "diminution(br)", "dec(br)", "decrease(br)",
  ])("reconnaît la diminution %s", (notation) => {
    expect(parseExpression(notation)).toEqual({
      type: "dc", operation: "decrease", consumes: 2, produces: 1,
    });
  });

  it.each([
    ["aug ms", "increase"],
    ["augmentation ms", "increase"],
    ["inc ms", "increase"],
    ["increase ms", "increase"],
    ["dim ms", "decrease"],
    ["diminution ms", "decrease"],
    ["dec ms", "decrease"],
    ["decrease ms", "decrease"],
  ] as const)("tolère l'opération sans parenthèses %s", (notation, operation) => {
    const graph = parsePattern(`R1 ${notation}`);
    expect(graph.issues).toEqual([]);
    expect(graph.groups[0]).toMatchObject({ operation });
  });

  it.each([
    ["cercle magique", "mr"], ["anneau magique", "mr"],
    ["pop corn", "popcorn"],
    ["br rav", "fpdc"], ["br rar", "bpdc"],
  ] as const)("tolère l'alias rédactionnel %s", (notation, type) => {
    const graph = parsePattern(`R1 ${notation}`);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches).toHaveLength(1);
    expect(graph.stitches[0].type).toBe(type);
  });

  it("reconnaît les rangs explicites, implicites, la casse et la ponctuation", () => {
    const graph = parsePattern("Rang 1 : 2 MS.\n3 br\nR3 1 mc");
    expect(graph.issues).toEqual([]);
    expect(graph.rounds.map((round) => round.number)).toEqual([1, 2, 3]);
    expect(graph.stitches.map((stitch) => stitch.type)).toEqual([
      "sc", "sc", "dc", "dc", "dc", "slst",
    ]);
  });

  it("classe les chaînes selon leur position dans le patron", () => {
    const graph = parsePattern("R1 4 ml\nR2 3 ml, 1 br, 2 ml, 1 br");
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.role === "foundationChain")).toHaveLength(4);
    expect(graph.stitches.filter((stitch) => stitch.role === "turningChain")).toHaveLength(3);
    expect(graph.stitches.filter((stitch) => stitch.role === "chainSpace")).toHaveLength(2);
  });

  it.each([
    ["2 brides dans la même maille", "dc", 2],
    ["3 ms dans la même maille", "sc", 3],
    ["2 demi-brides dans la même maille", "hdc", 2],
    ["3 doubles brides dans la même maille", "dtr", 3],
    ["2 triples brides dans la même maille", "tr", 2],
    ["fan_5_dc", "dc", 5],
    ["fan_6_dc", "dc", 6],
    ["fan_9_dc", "dc", 9],
  ] as const)("fige le groupe même parent %s", (notation, type, count) => {
    const graph = parsePattern(`R1 ${notation}`);
    expect(graph.issues).toEqual([]);
    expect(graph.groups).toHaveLength(1);
    expect(graph.stitches).toHaveLength(count);
    expect(graph.stitches.every((stitch) => stitch.type === type)).toBe(true);
  });

  it("fige les formes internes explicites de partage du parent", () => {
    const sameParent = parsePattern("R1 1 br, br_same_parent");
    const sameGroup = parsePattern("R1 same_3_br");

    expect(sameParent.issues).toEqual([]);
    expect(sameParent.stitches[1]).toMatchObject({ type: "dc", role: "sameParent" });
    expect(sameGroup.issues).toEqual([]);
    expect(sameGroup.groups).toHaveLength(1);
    expect(sameGroup.stitches).toHaveLength(3);
    expect(sameGroup.groups[0]).toMatchObject({ operation: "increase" });
  });

  it.each([
    ["3dbe", "hdc"], ["3 demi-brides ensemble", "hdc"],
    ["3dbre", "dtr"], ["3 doubles brides ensemble", "dtr"],
    ["3tbr", "tr"], ["3 triples brides ensemble", "tr"],
    ["cluster5_fpdc", "fpdc"],
  ] as const)("fige le groupe de diminution %s", (notation, type) => {
    const graph = parsePattern(`R1 ${notation}`);
    expect(graph.issues).toEqual([]);
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0]).toMatchObject({ operation: "decrease" });
    expect(graph.stitches).toHaveLength(1);
    expect(graph.stitches[0].type).toBe(type);
  });

  it("développe une répétition canonique", () => {
    const graph = parsePattern("R1 (1 ms, 1 aug(ms)) x3");
    expect(graph.issues).toEqual([]);
    expect(graph.groups).toHaveLength(6);
    expect(graph.stitches).toHaveLength(9);
  });

  it.each(["1 skip", "sauter une maille", "sautez 1 maille", "1 maille sautée"])(
    "consomme un parent sans produire de symbole avec %s",
    (notation) => {
      const graph = parsePattern(`R1 3 ms\nR2 1 ms, ${notation}, 1 ms`);
      expect(graph.issues).toEqual([]);
      expect(graph.stitches.filter((stitch) => stitch.round === 2)).toHaveLength(2);
      expect(graph.groups.filter((group) => group.round === 2)).toHaveLength(2);
    }
  );

  it("conserve les instructions valides et signale une notation inconnue", () => {
    const graph = parsePattern("R1 1 ms, 1 symbole-inconnu, 1 br");
    expect(graph.stitches).toHaveLength(2);
    expect(graph.issues).toHaveLength(1);
    expect(graph.issues[0]).toMatchObject({ round: 1 });
  });
});

describe("contrat du futur traducteur de patron écrit", () => {
  it("fige la notation cible de l'exemple de référence", () => {
    const source = "Rang 2 : 3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois.";
    const expectedCartomailles = "R2 3 ml, (1 aug(br), 1 ml, 1 skip) x5";

    // L'étape 1 ne traduit pas encore la phrase naturelle. Elle fixe seulement
    // le contrat que devra respecter le futur traducteur.
    expect(source).toContain("Répéter 5 fois");
    expect(expectedCartomailles).toBe("R2 3 ml, (1 aug(br), 1 ml, 1 skip) x5");

    const graph = parsePattern(`R1 10 ms\n${expectedCartomailles}`);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);

    expect(graph.issues).toEqual([]);
    expect(secondRound.filter((stitch) => stitch.role === "turningChain")).toHaveLength(3);
    expect(secondRound.filter((stitch) => stitch.type === "dc")).toHaveLength(10);
    expect(secondRound.filter((stitch) => stitch.role === "chainSpace")).toHaveLength(5);
    expect(graph.groups.filter(
      (group) => group.round === 2 && group.operation === "increase"
    )).toHaveLength(5);
  });
});
