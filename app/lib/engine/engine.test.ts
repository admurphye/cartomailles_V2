import { describe, expect, it } from "vitest";
import { layoutCircularGroups } from "./layout/layoutCircularGroups";
import { layoutFlatGroups } from "./layout/layoutFlatGroups";
import { layoutGrannyGroups } from "./layout/layoutGrannyGroups";
import { parseExpression } from "./parser/parseExpression";
import { parsePattern } from "./parser/parsePattern";

describe("parseExpression", () => {
  it.each([
    ["ms", "sc"],
    ["db", "hdc"],
    ["br", "dc"],
    ["dbr", "dtr"],
    ["tb", "tr"],
    ["ml", "ch"],
    ["mc", "slst"],
  ] as const)("reconnaît l'alias français %s", (source, type) => {
    expect(parseExpression(source)).toMatchObject({
      type,
      operation: "normal",
      produces: 1,
    });
  });

  it("décrit correctement une augmentation", () => {
    expect(parseExpression("aug(ms)")).toEqual({
      type: "sc",
      operation: "increase",
      consumes: 1,
      produces: 2,
    });
  });

  it("reconnaît le raccourci 2BE comme deux brides dans la même maille", () => {
    expect(parseExpression("2be")).toEqual({
      type: "dc",
      operation: "increase",
      consumes: 1,
      produces: 2,
    });
  });

  it("décrit correctement une diminution", () => {
    expect(parseExpression("dim(br)")).toEqual({
      type: "dc",
      operation: "decrease",
      consumes: 2,
      produces: 1,
    });
  });

  it("rejette un symbole inconnu", () => {
    expect(parseExpression("xyz")).toBeNull();
  });
});

describe("parsePattern", () => {
  it("construit une chaînette de fondation et ses liens", () => {
    const graph = parsePattern("R1 6 ml");

    expect(graph.issues).toEqual([]);
    expect(graph.rounds).toHaveLength(1);
    expect(graph.stitches).toHaveLength(6);
    expect(graph.stitches.every((stitch) => stitch.role === "foundationChain")).toBe(true);
    expect(graph.links).toHaveLength(5);
    expect(graph.links.every((link) => link.type === "chain")).toBe(true);
  });

  it("développe les répétitions parenthésées", () => {
    const graph = parsePattern("R1 (1 ms, 1 aug ms) x3");

    expect(graph.issues).toEqual([]);
    expect(graph.groups).toHaveLength(6);
    expect(graph.stitches).toHaveLength(9);
    expect(graph.groups.filter((group) => group.operation === "increase")).toHaveLength(3);
  });

  it.each([
    "2BE",
    "2 brides ensemble",
    "2 brides dans la même maille",
  ])("accepte la notation %s", (notation) => {
    const graph = parsePattern(`R1 ${notation}`);

    expect(graph.issues).toEqual([]);
    expect(graph.stitches).toHaveLength(2);
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0]).toMatchObject({ operation: "increase" });
    expect(graph.stitches.every((stitch) => stitch.type === "dc")).toBe(true);
  });

  it("construit les liens d'augmentation entre deux rangs", () => {
    const graph = parsePattern("R1 6 ms\nR2 6 aug(ms)");
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);

    expect(graph.issues).toEqual([]);
    expect(secondRound).toHaveLength(12);
    expect(graph.links).toHaveLength(12);
    expect(graph.links.every((link) => link.type === "increase")).toBe(true);
  });

  it("construit les liens de diminution entre deux rangs", () => {
    const graph = parsePattern("R1 12 ms\nR2 6 dim(ms)");

    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 2)).toHaveLength(6);
    expect(graph.links).toHaveLength(12);
    expect(graph.links.every((link) => link.type === "decrease")).toBe(true);
  });

  it("remonte une erreur sans empêcher les mailles valides", () => {
    const graph = parsePattern("R1 2 ms, 1 inconnu");

    expect(graph.stitches).toHaveLength(2);
    expect(graph.issues).toHaveLength(1);
    expect(graph.issues[0]).toMatchObject({ round: 1 });
    expect(graph.issues[0].message).toContain("inconnu");
  });
});

describe("layouts", () => {
  const graph = parsePattern("R1 4 ms\nR2 4 ms");

  it("place chaque maille circulairement à une position finie", () => {
    const positioned = layoutCircularGroups(graph, 50);

    expect(positioned).toHaveLength(graph.stitches.length);
    expect(positioned.every(({ x, y, rotation }) =>
      Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(rotation)
    )).toBe(true);

    const firstRoundRadii = positioned
      .filter((stitch) => stitch.round === 1)
      .map((stitch) => Math.hypot(stitch.x - 350, stitch.y - 350));
    firstRoundRadii.forEach((radius) => expect(radius).toBeCloseTo(50));
  });

  it("empile les rangs plats du bas vers le haut avec l'espacement demandé", () => {
    const positioned = layoutFlatGroups(graph, 70);
    const firstRoundY = positioned.find((stitch) => stitch.round === 1)?.y;
    const secondRoundY = positioned.find((stitch) => stitch.round === 2)?.y;

    expect(firstRoundY).toBeDefined();
    expect(secondRoundY).toBeDefined();
    expect(firstRoundY! - secondRoundY!).toBe(70);
  });

  it("produit un carré granny centré et non dégénéré", () => {
    const grannyGraph = parsePattern(
      "R1 3 br, 2 ml, 3 br, 2 ml, 3 br, 2 ml, 3 br, 2 ml, 1 mc"
    );
    const positioned = layoutGrannyGroups(grannyGraph, 62);
    const xs = positioned.map((stitch) => stitch.x);
    const ys = positioned.map((stitch) => stitch.y);

    expect(positioned).toHaveLength(grannyGraph.stitches.length);
    expect(Math.min(...xs)).toBeLessThan(350);
    expect(Math.max(...xs)).toBeGreaterThan(350);
    expect(Math.min(...ys)).toBeLessThan(350);
    expect(Math.max(...ys)).toBeGreaterThan(350);
  });
});
