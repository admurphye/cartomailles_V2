import { describe, expect, it } from "vitest";
import { layoutCircularGroups } from "./layout/layoutCircularGroups";
import { layoutFlatGroups } from "./layout/layoutFlatGroups";
import { layoutGrannyGroups } from "./layout/layoutGrannyGroups";
import { PositionedStitch } from "./model/PositionedStitch";
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
    ["popcorn", "popcorn"],
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

  it("reconnaît le raccourci 3BE comme trois brides dans la même maille", () => {
    expect(parseExpression("3be")).toEqual({
      type: "dc",
      operation: "increase",
      consumes: 1,
      produces: 3,
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

  it.each(["popcorn", "pop corn", "pop"])("reconnaît le point %s", (notation) => {
    const graph = parsePattern(`R1 ${notation}`);

    expect(graph.issues).toEqual([]);
    expect(graph.stitches).toHaveLength(1);
    expect(graph.stitches[0]).toMatchObject({
      type: "popcorn",
      operation: "normal",
    });
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

  it.each([
    "3BE",
    "3 brides ensemble",
    "3 brides dans la même maille",
  ])("accepte la notation %s", (notation) => {
    const graph = parsePattern(`R1 ${notation}`);

    expect(graph.issues).toEqual([]);
    expect(graph.stitches).toHaveLength(3);
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0]).toMatchObject({ operation: "increase" });
    expect(graph.stitches.every((stitch) =>
      stitch.type === "dc" && stitch.groupSize === 3
    )).toBe(true);
  });

  it.each([
    ["3dbe", "hdc"],
    ["3 demi-brides ensemble", "hdc"],
    ["3dbre", "dtr"],
    ["3 doubles brides ensemble", "dtr"],
    ["3tbr", "tr"],
    ["3 triples brides ensemble", "tr"],
    ["3 tribles brides ensemble", "tr"],
  ] as const)("accepte la notation %s", (notation, type) => {
    const graph = parsePattern(`R1 ${notation}`);

    expect(graph.issues).toEqual([]);
    expect(graph.stitches).toHaveLength(1);
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0]).toMatchObject({ operation: "decrease" });
    expect(graph.stitches.every((stitch) =>
      stitch.type === type && stitch.groupSize === 3
    )).toBe(true);
  });

  it.each([
    ["2 mailles serrées dans la même maille", "sc", 2],
    ["3 ms dans la même maille", "sc", 3],
    ["2 demi-brides dans la même maille", "hdc", 2],
    ["3 db dans la même maille", "hdc", 3],
    ["2 brides dans la même maille", "dc", 2],
    ["3 doubles brides dans la même maille", "dtr", 3],
    ["2 dbr dans la même maille", "dtr", 2],
    ["3 triples brides dans la même maille", "tr", 3],
    ["2 tb dans la même maille", "tr", 2],
  ] as const)("place %s", (notation, type, count) => {
    const graph = parsePattern(`R1 ${notation}`);

    expect(graph.issues).toEqual([]);
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0]).toMatchObject({ operation: "increase" });
    expect(graph.stitches).toHaveLength(count);
    expect(graph.stitches.every((stitch) =>
      stitch.type === type && stitch.groupSize === count
    )).toBe(true);
  });

  it.each([
    ["5BE", 5],
    ["6 brides dans la même maille", 6],
    ["9 brides ensemble", 9],
    ["éventail(5 br)", 5],
    ["eventail 6 br", 6],
    ["coquillage(9 br)", 9],
  ] as const)("construit l'éventail %s", (notation, count) => {
    const graph = parsePattern(`R1 ${notation}`);

    expect(graph.issues).toEqual([]);
    expect(graph.stitches).toHaveLength(count);
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0]).toMatchObject({ operation: "increase" });
    expect(graph.stitches.every((stitch) =>
      stitch.type === "dc" && stitch.groupSize === count
    )).toBe(true);
  });

  it("construit les liens d'augmentation entre deux rangs", () => {
    const graph = parsePattern("R1 6 ms\nR2 6 aug(ms)");
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);

    expect(graph.issues).toEqual([]);
    expect(secondRound).toHaveLength(12);
    expect(graph.links).toHaveLength(12);
    expect(graph.links.every((link) => link.type === "increase")).toBe(true);
  });

  it("fait remplacer le premier parent par la chaînette de début de rang", () => {
    const graph = parsePattern("R1 4 br\nR2 3 ml, 3 br");
    const firstRound = graph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");
    const brides = secondRound.filter((stitch) => stitch.type === "dc");

    expect(graph.issues).toEqual([]);
    expect(turningChain).toHaveLength(3);
    expect(graph.links).toContainEqual(expect.objectContaining({
      from: firstRound[0].id,
      to: turningChain[0].id,
      type: "normal",
    }));
    expect(graph.links.filter((link) => link.to === brides[0].id)).toContainEqual(
      expect.objectContaining({ from: firstRound[1].id })
    );

    const positioned = layoutFlatGroups(graph);
    const positionedFirstRound = positioned
      .filter((stitch) => stitch.round === 1)
      .sort((a, b) => a.order - b.order);
    const positionedTurningChain = positioned.filter(
      (stitch) => stitch.role === "turningChain"
    );

    expect(positionedTurningChain.every(
      (stitch) => stitch.x === positionedFirstRound.at(-1)?.x
    )).toBe(true);
    const secondRoundBride = positioned.find(
      (stitch) => stitch.round === 2 && stitch.type === "dc"
    );
    expect(positionedTurningChain.at(-1)?.y).toBe(secondRoundBride?.y);
    expect(positionedTurningChain[0].y).toBeGreaterThan(
      positionedTurningChain.at(-1)!.y
    );
  });

  it.each([
    [1, "ms", "sc"],
    [2, "db", "hdc"],
    [3, "br", "dc"],
    [4, "dbr", "dtr"],
    [5, "tb", "tr"],
  ] as const)(
    "%i ml de début de rang remplacent une %s",
    (chainCount, notation, type) => {
      const graph = parsePattern(`R1 6 ms\nR2 ${chainCount} ml, 5 ${notation}`);
      const turningChain = graph.stitches.filter(
        (stitch) => stitch.role === "turningChain"
      );
      const followingStitches = graph.stitches.filter(
        (stitch) => stitch.round === 2 && stitch.type === type
      );

      expect(graph.issues).toEqual([]);
      expect(turningChain).toHaveLength(chainCount);
      expect(turningChain.filter((stitch) => stitch.countsAsStitch)).toHaveLength(1);
      expect(turningChain.at(-1)?.countsAsStitch).toBe(true);
      expect(followingStitches).toHaveLength(5);
    }
  );

  it.each([
    "2 ml et une bride dans la même maille",
    "2ml, 1br dans la même maille",
  ])("place la chaîne et la bride sur le même parent avec %s", (notation) => {
    const graph = parsePattern(`R1 3 ms\nR2 ${notation}, 2 br`);
    const firstRound = graph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");
    const brides = secondRound.filter((stitch) => stitch.type === "dc");
    const parentsOf = (stitchId: string) => graph.links
      .filter((link) => link.to === stitchId)
      .map((link) => link.from);

    expect(graph.issues).toEqual([]);
    expect(turningChain).toHaveLength(2);
    expect(brides).toHaveLength(3);
    expect(parentsOf(turningChain[0].id)).toEqual([firstRound[0].id]);
    expect(parentsOf(brides[0].id)).toEqual([firstRound[0].id]);
    expect(parentsOf(brides[1].id)).toEqual([firstRound[1].id]);

    const positioned = layoutFlatGroups(graph);
    const positionedChainTop = positioned.find(
      (stitch) => stitch.id === turningChain.at(-1)?.id
    );
    const positionedSharedBride = positioned.find(
      (stitch) => stitch.id === brides[0].id
    );

    expect(positionedSharedBride?.rotation).not.toBe(0);
    expect(positionedSharedBride?.x).not.toBe(positionedChainTop?.x);
    const positionedChain = positioned.filter(
      (stitch) => turningChain.some((chain) => chain.id === stitch.id)
    );
    const averageChainY = positionedChain.reduce(
      (total, stitch) => total + stitch.y,
      0
    ) / positionedChain.length;
    expect(positionedSharedBride?.y).toBe(averageChainY);

    const circular = layoutCircularGroups(graph);
    const circularChain = circular.filter(
      (stitch) => turningChain.some((chain) => chain.id === stitch.id)
    );
    const circularSharedBride = circular.find(
      (stitch) => stitch.id === brides[0].id
    );
    const chainRadii = circularChain.map((stitch) =>
      Math.hypot(stitch.x - 350, stitch.y - 350)
    );

    expect(Math.abs(chainRadii[1] - chainRadii[0])).toBeCloseTo(12);
    expect(circularSharedBride?.rotation).not.toBe(0);
    expect(circularSharedBride?.x).not.toBe(circularChain[0].x);
  });

  it("construit les liens de diminution entre deux rangs", () => {
    const graph = parsePattern("R1 12 ms\nR2 6 dim(ms)");

    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 2)).toHaveLength(6);
    expect(graph.links).toHaveLength(12);
    expect(graph.links.every((link) => link.type === "decrease")).toBe(true);
  });

  it.each([
    "sauter une maille",
    "sautez 1 maille",
    "1 maille sautée",
  ])("saute un parent avec la notation %s", (notation) => {
    const graph = parsePattern(`R1 4 ms\nR2 1 ms, ${notation}, 2 ms`);
    const firstRound = graph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const linkedParentIds = graph.links
      .filter((link) => secondRound.some((stitch) => stitch.id === link.to))
      .map((link) => link.from);

    expect(graph.issues).toEqual([]);
    expect(secondRound).toHaveLength(3);
    expect(graph.groups.filter((group) => group.round === 2)).toHaveLength(3);
    expect(linkedParentIds).toEqual([
      firstRound[0].id,
      firstRound[2].id,
      firstRound[3].id,
    ]);
  });

  it("saute autant de parents que de mailles demandées", () => {
    const graph = parsePattern("R1 5 ms\nR2 1 ms, sauter 3 mailles, 1 ms");
    const firstRound = graph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const secondRoundLinks = graph.links.filter((link) =>
      secondRound.some((stitch) => stitch.id === link.to)
    );

    expect(graph.issues).toEqual([]);
    expect(secondRound).toHaveLength(2);
    expect(secondRoundLinks.map((link) => link.from)).toEqual([
      firstRound[0].id,
      firstRound[4].id,
    ]);
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

  it("aligne l'angle des mailles enfants avec leurs parents en circulaire", () => {
    const circularGraph = parsePattern("R1 4 ms\nR2 4 ms");
    const positioned = layoutCircularGroups(circularGraph);
    const angle = (stitch: PositionedStitch) =>
      Math.atan2(stitch.y - 350, stitch.x - 350);

    for (const link of circularGraph.links) {
      const parent = positioned.find((stitch) => stitch.id === link.from)!;
      const child = positioned.find((stitch) => stitch.id === link.to)!;

      expect(angle(child)).toBeCloseTo(angle(parent));
    }
  });

  it("empile les rangs plats du bas vers le haut avec l'espacement demandé", () => {
    const positioned = layoutFlatGroups(graph, 70);
    const firstRoundY = positioned.find((stitch) => stitch.round === 1)?.y;
    const secondRoundY = positioned.find((stitch) => stitch.round === 2)?.y;

    expect(firstRoundY).toBeDefined();
    expect(secondRoundY).toBeDefined();
    expect(firstRoundY! - secondRoundY!).toBe(70);
  });

  it("aligne les mailles enfants avec leurs parents dans un diagramme plat", () => {
    const flatGraph = parsePattern("R1 4 ms\nR2 4 ms");
    const positioned = layoutFlatGroups(flatGraph);

    const firstRound = positioned
      .filter((stitch) => stitch.round === 1)
      .sort((a, b) => a.order - b.order);

    for (const link of flatGraph.links) {
      const logicalParentIndex = flatGraph.stitches
        .filter((stitch) => stitch.round === 1)
        .sort((a, b) => a.order - b.order)
        .findIndex((stitch) => stitch.id === link.from);
      const parent = firstRound[firstRound.length - 1 - logicalParentIndex];
      const child = positioned.find((stitch) => stitch.id === link.to);

      expect(child?.x).toBe(parent?.x);
    }
  });

  it("centre une diminution plate entre ses deux parents", () => {
    const flatGraph = parsePattern("R1 4 ms\nR2 2 dim(ms)");
    const positioned = layoutFlatGroups(flatGraph);
    const child = positioned.find((stitch) => stitch.round === 2);
    const parentLinks = flatGraph.links.filter((link) => link.to === child?.id);
    const firstRound = positioned
      .filter((stitch) => stitch.round === 1)
      .sort((a, b) => a.order - b.order);
    const logicalFirstRound = flatGraph.stitches
      .filter((stitch) => stitch.round === 1)
      .sort((a, b) => a.order - b.order);
    const parents = parentLinks.map((link) => {
      const logicalIndex = logicalFirstRound.findIndex(
        (stitch) => stitch.id === link.from
      );
      return firstRound[firstRound.length - 1 - logicalIndex];
    });

    expect(parents).toHaveLength(2);
    expect(child?.x).toBe((parents[0].x + parents[1].x) / 2);
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
