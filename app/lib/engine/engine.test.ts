import { describe, expect, it } from "vitest";
import { layoutCircularGroups } from "./layout/layoutCircularGroups";
import { layoutFlatGroups } from "./layout/layoutFlatGroups";
import { layoutGrannyGroups } from "./layout/layoutGrannyGroups";
import {
  applyFlatRowDirections,
  flatRowDirection,
} from "./layout/flatRowDirection";
import { PositionedStitch } from "./model/PositionedStitch";
import { parseExpression } from "./parser/parseExpression";
import { parsePattern } from "./parser/parsePattern";
import { preparePatternForEngine } from "../written-pattern/preparePatternForEngine";

describe("parseExpression", () => {
  it.each([
    ["dim(ms)", "sc"],
    ["dim(db)", "hdc"],
    ["dim(br)", "dc"],
    ["dim(dbr)", "dtr"],
    ["dim(tbr)", "tr"],
    ["dim(brav)", "fpdc"],
    ["dim(brar)", "bpdc"],
  ])("reconnaît deux mailles ensemble : %s", (notation, type) => {
    expect(parseExpression(notation)).toMatchObject({
      type,
      operation: "decrease",
      consumes: 2,
      produces: 1,
    });
  });
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
  it.each([
    ["R1 cercle magique, 6 ms", "sc", 6],
    ["R1 cercle magique, 12 br", "dc", 12],
  ] as const)("ne compte pas le cercle magique comme une maille : %s", (source, type, count) => {
    const magicRingGraph = parsePattern(source);
    const magicRing = magicRingGraph.stitches.find((stitch) => stitch.type === "mr");
    const positionedMagicRing = layoutCircularGroups(magicRingGraph)
      .find((stitch) => stitch.type === "mr");

    expect(magicRingGraph.issues).toEqual([]);
    expect(magicRing).toBeDefined();
    expect(magicRing?.countsAsStitch).toBe(false);
    expect(positionedMagicRing).toBeDefined();
    expect(magicRingGraph.stitches.filter((stitch) => stitch.countsAsStitch))
      .toHaveLength(count);
    expect(magicRingGraph.stitches.filter((stitch) => stitch.type === type))
      .toHaveLength(count);
  });

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

  it("n'utilise pas le cercle magique comme parent du tour suivant", () => {
    const magicRingGraph = parsePattern("R1 1 mr, 6 ms\nR2 6 aug(ms)");
    const magicRing = magicRingGraph.stitches.find(
      (stitch) => stitch.role === "magicRing"
    );
    const secondRound = magicRingGraph.stitches.filter(
      (stitch) => stitch.round === 2
    );
    const secondRoundLinks = magicRingGraph.links.filter((link) =>
      secondRound.some((stitch) => stitch.id === link.to)
    );
    const positioned = layoutCircularGroups(magicRingGraph);
    const augmentationPositions = new Set(
      positioned
        .filter((stitch) => stitch.round === 2)
        .map((stitch) => `${stitch.x.toFixed(6)},${stitch.y.toFixed(6)}`)
    );

    expect(secondRoundLinks).toHaveLength(12);
    expect(secondRoundLinks.every((link) => link.from !== magicRing?.id)).toBe(true);
    expect(new Set(secondRoundLinks.map((link) => link.from)).size).toBe(6);
    expect(augmentationPositions.size).toBe(6);
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
    expect(positionedTurningChain.every(
      (stitch) => Math.abs(stitch.y - secondRoundBride!.y) < 11
    )).toBe(true);
    expect(positionedTurningChain[0].y).toBeLessThan(
      positionedTurningChain.at(-1)!.y
    );
  });

  it("ancre une chaîne de début sans lui faire remplacer une maille quand tous les parents sont travaillés", () => {
    const chainGraph = parsePattern("R1 15 ml\nR2 3 ml, 15 br");
    const firstRound = chainGraph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = chainGraph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");
    const brides = secondRound.filter((stitch) => stitch.type === "dc");
    const brideParentIds = brides.map((bride) =>
      chainGraph.links.find((link) => link.to === bride.id)?.from
    );
    const positioned = layoutFlatGroups(chainGraph);
    const positionedChainTop = positioned.find(
      (stitch) => stitch.id === turningChain.at(-1)?.id
    );
    const positionedFirstBride = positioned.find(
      (stitch) => stitch.id === brides[0]?.id
    );

    expect(turningChain).toHaveLength(3);
    expect(turningChain.every((stitch) => !stitch.countsAsStitch)).toBe(true);
    expect(brides).toHaveLength(15);
    expect(brideParentIds).toEqual(firstRound.map((stitch) => stitch.id));
    expect(new Set(brideParentIds).size).toBe(15);
    expect(secondRound.filter((stitch) => stitch.countsAsStitch)).toHaveLength(15);
    expect(positionedChainTop?.x).toBe(positionedFirstBride?.x);
  });

  it("compte la chaîne de début lorsqu'elle remplace la première bride", () => {
    const chainGraph = parsePattern("R1 15 ml\nR2 3 ml, 14 br");
    const secondRound = chainGraph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");

    expect(turningChain.filter((stitch) => stitch.countsAsStitch)).toHaveLength(1);
    expect(secondRound.filter((stitch) => stitch.countsAsStitch)).toHaveLength(15);
  });

  it("place une chaîne comptée dans le premier emplacement d'un rang pair RTL", () => {
    const graph = applyFlatRowDirections(parsePattern("R1 5 br\nR2 3 ml, 4 br"));
    const positioned = layoutFlatGroups(graph);
    const chain = positioned
      .filter((stitch) => stitch.round === 2 && stitch.role === "turningChain")
      .sort((a, b) => a.order - b.order);
    const brides = positioned
      .filter((stitch) => stitch.round === 2 && stitch.type === "dc")
      .sort((a, b) => a.order - b.order);

    expect(chain.filter((stitch) => stitch.countsAsStitch)).toHaveLength(1);
    expect(chain.at(-1)?.x).toBeGreaterThan(brides[0].x);
    expect(brides[0].x).toBeGreaterThan(brides[1].x);
    expect(new Set(chain.map((stitch) => stitch.x))).toEqual(
      new Set([chain.at(-1)!.x])
    );
  });

  it("place une chaîne comptée dans le premier emplacement d'un rang impair LTR", () => {
    const graph = applyFlatRowDirections(parsePattern(
      "R1 5 br\nR2 3 ml, 4 br\nR3 3 ml, 4 br"
    ));
    const positioned = layoutFlatGroups(graph);
    const chain = positioned
      .filter((stitch) => stitch.round === 3 && stitch.role === "turningChain")
      .sort((a, b) => a.order - b.order);
    const brides = positioned
      .filter((stitch) => stitch.round === 3 && stitch.type === "dc")
      .sort((a, b) => a.order - b.order);

    expect(chain.filter((stitch) => stitch.countsAsStitch)).toHaveLength(1);
    expect(chain.at(-1)?.x).toBeLessThan(brides[0].x);
    expect(brides[0].x).toBeLessThan(brides[1].x);
  });

  it("n'avance pas le parent lorsque la chaîne de début ne compte pas", () => {
    const graph = applyFlatRowDirections(parsePattern("R1 5 br\nR2 3 ml, 5 br"));
    const positioned = layoutFlatGroups(graph);
    const chain = positioned
      .filter((stitch) => stitch.round === 2 && stitch.role === "turningChain")
      .sort((a, b) => a.order - b.order);
    const firstBride = positioned
      .filter((stitch) => stitch.round === 2 && stitch.type === "dc")
      .sort((a, b) => a.order - b.order)[0];

    expect(chain.every((stitch) => !stitch.countsAsStitch)).toBe(true);
    expect(chain.at(-1)?.x).toBe(firstBride.x);
  });

  it("garde les chaînes comptées des rangs pairs et impairs dans la bande des brides", () => {
    const graph = applyFlatRowDirections(parsePattern(
      "R1 15 ml\nR2 3 ml, 14 br\nR3 3 ml, 14 br"
    ));
    const positioned = layoutFlatGroups(graph);

    for (const round of [2, 3]) {
      const chain = positioned
        .filter((stitch) => stitch.round === round && stitch.role === "turningChain")
        .sort((a, b) => a.order - b.order);
      const brides = positioned.filter(
        (stitch) => stitch.round === round && stitch.type === "dc"
      );
      const lowerRound = positioned.filter((stitch) => stitch.round === round - 1);
      const rowY = brides[0].y;

      expect(chain).toHaveLength(3);
      expect(chain.every((stitch) => stitch.y > rowY - 11 && stitch.y < rowY + 11))
        .toBe(true);
      expect(chain[0].y).toBeLessThan(chain[1].y);
      expect(chain[1].y).toBeLessThan(chain[2].y);
      expect(Math.max(...chain.map((stitch) => stitch.y)))
        .toBeLessThan(Math.min(...lowerRound.map((stitch) => stitch.y)));
    }
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
    expect(positionedSharedBride?.rotation).toBe(45);
    expect(new Set(positionedChain.map((stitch) => stitch.x)).size).toBe(1);
    const averageChainY = positionedChain.reduce(
      (total, stitch) => total + stitch.y,
      0
    ) / positionedChain.length;
    expect(positionedSharedBride?.y).toBe(averageChainY);
    expect(positionedChain.every((chain) =>
      Math.hypot(
        chain.x - positionedSharedBride!.x,
        chain.y - positionedSharedBride!.y
      ) >= 17.5
    )).toBe(true);

    const circular = layoutCircularGroups(graph);
    const circularChain = circular.filter(
      (stitch) => turningChain.some((chain) => chain.id === stitch.id)
    );
    const circularSharedBride = circular.find(
      (stitch) => stitch.id === brides[0].id
    );
    expect(circularChain[1].x).toBeCloseTo(circularChain[0].x);
    expect(Math.abs(circularChain[1].y - circularChain[0].y)).toBeCloseTo(12);
    expect(circularSharedBride?.rotation).not.toBe(0);
    expect(circularSharedBride?.x).not.toBe(circularChain[0].x);
  });

  it("place une double bride après 2 ml dans la même maille", () => {
    const graph = parsePattern("R1 3 ms\nR2 2ml, dbr dans la même maille, 2 dbr");
    const firstRound = graph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");
    const doubleBrides = secondRound.filter((stitch) => stitch.type === "dtr");
    const parentsOf = (stitchId: string) => graph.links
      .filter((link) => link.to === stitchId)
      .map((link) => link.from);

    expect(graph.issues).toEqual([]);
    expect(turningChain).toHaveLength(2);
    expect(doubleBrides).toHaveLength(3);
    expect(doubleBrides[0].role).toBe("sameParent");
    expect(parentsOf(turningChain[0].id)).toEqual([firstRound[0].id]);
    expect(parentsOf(doubleBrides[0].id)).toEqual([firstRound[0].id]);
    expect(parentsOf(doubleBrides[1].id)).toEqual([firstRound[1].id]);
  });

  it("place une triple bride après 2 ml dans la même maille", () => {
    const graph = parsePattern("R1 3 ms\nR2 2ml et tbr dans la même maille, 2 tbr");
    const firstRound = graph.stitches.filter((stitch) => stitch.round === 1);
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    const turningChain = secondRound.filter((stitch) => stitch.role === "turningChain");
    const tripleBrides = secondRound.filter((stitch) => stitch.type === "tr");
    const parentsOf = (stitchId: string) => graph.links
      .filter((link) => link.to === stitchId)
      .map((link) => link.from);

    expect(graph.issues).toEqual([]);
    expect(turningChain).toHaveLength(2);
    expect(tripleBrides).toHaveLength(3);
    expect(tripleBrides[0].role).toBe("sameParent");
    expect(parentsOf(turningChain[0].id)).toEqual([firstRound[0].id]);
    expect(parentsOf(tripleBrides[0].id)).toEqual([firstRound[0].id]);
    expect(parentsOf(tripleBrides[1].id)).toEqual([firstRound[1].id]);
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

  it("regroupe la chaînette de début avec les deux premières brides du tour", () => {
    const circularGraph = parsePattern(
      "Tour 1 : cercle magique\nTour 2 : 3 ml, 2 br, 2 ml, 3 br, 2 ml, 3 br, 2 ml, 3 br, 2 ml, 1 mc"
    );
    const positioned = layoutCircularGroups(circularGraph, 50);
    const turningChain = positioned.filter(
      (stitch) => stitch.round === 2 && stitch.role === "turningChain"
    );
    const firstTwoBrides = positioned
      .filter((stitch) => stitch.round === 2 && stitch.type === "dc")
      .sort((a, b) => a.order - b.order)
      .slice(0, 2);
    const outerChain = turningChain.reduce((outer, chain) =>
      Math.hypot(chain.x - 350, chain.y - 350) >
      Math.hypot(outer.x - 350, outer.y - 350) ? chain : outer
    );
    const startingGroup = [outerChain, ...firstTwoBrides]
      .sort((a, b) => a.x - b.x);

    expect(circularGraph.issues).toEqual([]);
    expect(turningChain).toHaveLength(3);
    expect(firstTwoBrides).toHaveLength(2);
    expect(startingGroup.map((stitch) => stitch.y))
      .toEqual(startingGroup.map(() => expect.closeTo(300)));
    expect(startingGroup[1].x - startingGroup[0].x).toBeCloseTo(18);
    expect(startingGroup[2].x - startingGroup[1].x).toBeCloseTo(18);
  });

  it("répartit un rang complet de brides sans arceau sur le cercle", () => {
    const circularGraph = parsePattern("R1 15 ml\nR2 3 ml, 15 br");
    const brides = layoutCircularGroups(circularGraph)
      .filter((stitch) => stitch.round === 2 && stitch.type === "dc");

    expect(brides).toHaveLength(15);
    expect(new Set(brides.map((stitch) => stitch.x.toFixed(6))).size)
      .toBeGreaterThan(2);
    expect(new Set(brides.map((stitch) => stitch.y.toFixed(6))).size)
      .toBeGreaterThan(2);
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

  it("ne superpose pas les mailles du rang suivant une augmentation", () => {
    const flatGraph = parsePattern("R1 6 ms\nR2 6 aug ms\nR3 12 ms\nR4 6 dim ms");
    const thirdRound = layoutFlatGroups(flatGraph)
      .filter((stitch) => stitch.round === 3);

    expect(thirdRound).toHaveLength(12);
    expect(new Set(thirdRound.map((stitch) => stitch.x)).size).toBe(12);
  });

  it("place les arceaux entre les brides d'un rang plat en retour", () => {
    const flatGraph = parsePattern(
      "R1 12 ms\nR2 3 ml, 1 br, 2 ml, sauter 2 mailles, 1 br, 2 ml, sauter 2 mailles, 1 br"
    );
    const secondRound = layoutFlatGroups(flatGraph)
      .filter((stitch) => stitch.round === 2);
    const brides = secondRound.filter((stitch) => stitch.type === "dc");
    const chainSpaces = secondRound.filter(
      (stitch) => stitch.role === "chainSpace"
    );
    const minBrideX = Math.min(...brides.map((stitch) => stitch.x));
    const maxBrideX = Math.max(...brides.map((stitch) => stitch.x));

    expect(brides).toHaveLength(3);
    expect(chainSpaces).toHaveLength(4);
    expect(chainSpaces.every(
      (stitch) => stitch.x > minBrideX && stitch.x < maxBrideX
    )).toBe(true);
  });

  it("garde la chaînette du dernier motif répétitif attachée au bord du rang plat", () => {
    const flatGraph = parsePattern(
      "Rang 1 : 20 ms\nRang 2 : *1 ms, 2 ml, sauter 1 maille* répéter 10 fois"
    );
    const secondRound = layoutFlatGroups(flatGraph)
      .filter((stitch) => stitch.round === 2);
    const singleCrochets = secondRound.filter((stitch) => stitch.type === "sc");
    const chainSpaces = secondRound.filter((stitch) => stitch.role === "chainSpace");
    const leftmostStitchX = Math.min(...singleCrochets.map((stitch) => stitch.x));
    const edgeChain = chainSpaces
      .filter((stitch) => stitch.x < leftmostStitchX)
      .sort((a, b) => a.x - b.x);

    expect(singleCrochets).toHaveLength(10);
    expect(chainSpaces).toHaveLength(20);
    expect(edgeChain.map((stitch) => leftmostStitchX - stitch.x))
      .toEqual([32, 16]);
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

  it("alterne explicitement le sens des rangs plats sans inverser les mailles", () => {
    expect(flatRowDirection(1)).toBe("ltr");
    expect(flatRowDirection(2)).toBe("rtl");
    expect(flatRowDirection(3)).toBe("ltr");

    const rawGraph = parsePattern("R1 15 ml\nR2 3 ml, 15 br\nR3 15 br");
    const flatGraph = applyFlatRowDirections(rawGraph);
    const positioned = layoutFlatGroups(flatGraph);
    const byLogicalOrder = (round: number, type: "ch" | "dc") => positioned
      .filter((stitch) => stitch.round === round && stitch.type === type)
      .sort((a, b) => a.order - b.order);

    const firstRow = byLogicalOrder(1, "ch");
    const secondRowBrides = byLogicalOrder(2, "dc");
    const thirdRowBrides = byLogicalOrder(3, "dc");
    const turningChain = positioned.filter(
      (stitch) => stitch.round === 2 && stitch.role === "turningChain"
    );

    expect(firstRow[0].x).toBeLessThan(firstRow.at(-1)!.x);
    expect(secondRowBrides[0].x).toBeGreaterThan(secondRowBrides.at(-1)!.x);
    expect(thirdRowBrides[0].x).toBeLessThan(thirdRowBrides.at(-1)!.x);
    expect(turningChain).toHaveLength(3);
    expect(turningChain.every((stitch) => stitch.x === firstRow.at(-1)!.x))
      .toBe(true);

    for (const link of flatGraph.links.filter((link) => link.type !== "chain")) {
      const parent = positioned.find((stitch) => stitch.id === link.from);
      const child = positioned.find((stitch) => stitch.id === link.to);
      expect(child?.x).toBe(parent?.x);
    }

    // La transformation adapte les liens, jamais l'ordre logique des données.
    expect(flatGraph.stitches.map((stitch) => stitch.id))
      .toEqual(rawGraph.stitches.map((stitch) => stitch.id));
  });

  it("dessine les ML associées à un saut comme un arceau entre deux brides", () => {
    const source = [
      "Rang 1 : Faites 15 mailles en l'air.",
      "Rang 2 : Faites 3 mailles en l'air, puis crochetez 1 bride dans chacune des 15 mailles suivantes.",
      "Rang 3 : Faites 3 mailles en l'air, crochetez 1 bride dans la maille suivante, faites 2 mailles en l'air, sautez 2 mailles, puis crochetez 1 bride dans la maille suivante.",
    ].join("\n");
    const prepared = preparePatternForEngine(source);
    const graph = applyFlatRowDirections(parsePattern(prepared.notation));
    const positioned = layoutFlatGroups(graph);
    const thirdRow = positioned.filter((stitch) => stitch.round === 3);
    const startChain = thirdRow.filter((stitch) => stitch.role === "turningChain");
    const arch = thirdRow
      .filter((stitch) => stitch.role === "chainSpace")
      .sort((a, b) => a.order - b.order);
    const brides = thirdRow
      .filter((stitch) => stitch.type === "dc")
      .sort((a, b) => a.order - b.order);

    expect(prepared.issues).toEqual([]);
    expect(startChain).toHaveLength(3);
    expect(arch).toHaveLength(2);
    expect(brides).toHaveLength(2);
    expect(arch.every((stitch) => stitch.y < brides[0].y)).toBe(true);
    expect(arch.every((stitch) =>
      stitch.x > Math.min(brides[0].x, brides[1].x) &&
      stitch.x < Math.max(brides[0].x, brides[1].x)
    )).toBe(true);
    expect(arch[0].rotation).not.toBe(arch[1].rotation);

    const linkedParentIds = new Set(
      graph.links
        .filter((link) => brides.some((bride) => bride.id === link.to))
        .map((link) => link.from)
    );
    expect(linkedParentIds.size).toBe(2);
    expect(graph.links.some((link) =>
      link.type !== "chain" && arch.some((chain) => chain.id === link.to)
    ))
      .toBe(false);
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

  it("regroupe les 3 ml de début avec les 2 premières brides du granny", () => {
    const grannyGraph = parsePattern(
      "Tour 1 : cercle magique\nTour 2 : 3 ml, 2 br, 2 ml, 3 br, 2 ml, 3 br, 2 ml, 3 br, 2 ml, 1 mc"
    );
    const positioned = layoutGrannyGroups(grannyGraph, 62);
    const turningChain = positioned.filter(
      (stitch) => stitch.round === 2 && stitch.role === "turningChain"
    );
    const firstTwoBrides = positioned
      .filter((stitch) => stitch.round === 2 && stitch.type === "dc")
      .sort((a, b) => a.order - b.order)
      .slice(0, 2);
    const join = positioned.find(
      (stitch) => stitch.round === 2 && stitch.type === "slst"
    );
    const outerChain = turningChain.reduce((outer, chain) =>
      chain.y < outer.y ? chain : outer
    );
    const startingGroup = [outerChain, ...firstTwoBrides]
      .sort((a, b) => a.x - b.x);

    expect(grannyGraph.issues).toEqual([]);
    expect(turningChain).toHaveLength(3);
    expect(new Set(turningChain.map((stitch) => stitch.x)).size).toBe(1);
    expect(startingGroup.map((stitch) => stitch.y))
      .toEqual(startingGroup.map(() => expect.closeTo(288)));
    expect(startingGroup[1].x - startingGroup[0].x).toBeCloseTo(14);
    expect(startingGroup[2].x - startingGroup[1].x).toBeCloseTo(14);
    expect(join?.y).toBeCloseTo(outerChain.y);
    expect(outerChain.x - join!.x).toBeCloseTo(14);
  });
});
