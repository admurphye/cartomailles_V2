import { describe, expect, it } from "vitest";
import { layoutCircularGroups } from "./layout/layoutCircularGroups";
import { layoutFlatGroups } from "./layout/layoutFlatGroups";
import { layoutGrannyGroups } from "./layout/layoutGrannyGroups";
import { parsePattern } from "./parser/parsePattern";

function stitchCountsByRound(pattern: string) {
  const graph = parsePattern(pattern);

  return {
    graph,
    counts: graph.rounds.map((round) =>
      graph.stitches.filter((stitch) => stitch.round === round.number).length
    ),
  };
}

describe("patrons métier complets", () => {
  it("construit la progression classique d'un amigurumi", () => {
    const pattern = [
      "R1 cercle magique",
      "R2 6 ms",
      "R3 6 aug(ms)",
      "R4 (1 ms, 1 aug ms) x6",
    ].join("\n");
    const { graph, counts } = stitchCountsByRound(pattern);
    const positioned = layoutCircularGroups(graph);

    expect(graph.issues).toEqual([]);
    expect(counts).toEqual([1, 6, 12, 18]);
    expect(graph.groups.filter((group) => group.operation === "increase")).toHaveLength(12);
    expect(positioned).toHaveLength(37);
    expect(positioned.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);

    const averageRadius = (round: number) => {
      const stitches = positioned.filter((stitch) => stitch.round === round);
      return stitches.reduce(
        (total, stitch) => total + Math.hypot(stitch.x - 350, stitch.y - 350),
        0
      ) / stitches.length;
    };

    expect(averageRadius(4)).toBeGreaterThan(averageRadius(3));
    expect(averageRadius(3)).toBeGreaterThan(averageRadius(2));
  });

  it("gère une chaînette de fondation et les rangs aller-retour", () => {
    const pattern = [
      "R1 10 ml",
      "R2 1 ml, 10 ms",
      "R3 1 ml, 10 ms",
    ].join("\n");
    const { graph, counts } = stitchCountsByRound(pattern);
    const positioned = layoutFlatGroups(graph, 60);

    expect(graph.issues).toEqual([]);
    expect(counts).toEqual([10, 11, 11]);
    expect(graph.stitches.filter((stitch) => stitch.role === "foundationChain")).toHaveLength(10);
    expect(graph.stitches.filter((stitch) => stitch.role === "turningChain")).toHaveLength(2);
    expect(graph.stitches.filter((stitch) => stitch.countsAsStitch)).toHaveLength(30);

    const yByRound = [1, 2, 3].map(
      (round) => positioned.find((stitch) => stitch.round === round)?.y
    );
    expect(yByRound[0]! - yByRound[1]!).toBe(60);
    expect(yByRound[1]! - yByRound[2]!).toBe(60);
  });

  it("répartit un carré Granny complet autour des quatre côtés", () => {
    const pattern = [
      "R1 anneau magique",
      "R2 3 ml, (3 br, 2 ml) x4, 1 mc",
    ].join("\n");
    const { graph, counts } = stitchCountsByRound(pattern);
    const positioned = layoutGrannyGroups(graph);
    const secondRound = positioned.filter((stitch) => stitch.round === 2);

    expect(graph.issues).toEqual([]);
    expect(counts).toEqual([1, 24]);
    expect(graph.stitches.filter((stitch) => stitch.role === "turningChain")).toHaveLength(3);
    expect(graph.stitches.filter((stitch) => stitch.role === "chainSpace")).toHaveLength(8);
    expect(secondRound.some((stitch) => stitch.x < 350)).toBe(true);
    expect(secondRound.some((stitch) => stitch.x > 350)).toBe(true);
    expect(secondRound.some((stitch) => stitch.y < 350)).toBe(true);
    expect(secondRound.some((stitch) => stitch.y > 350)).toBe(true);
  });

  it("conserve les rangs valides autour d'une instruction erronée", () => {
    const pattern = [
      "R1 6 ms",
      "R2 symbole-inconnu",
      "R3 6 br",
    ].join("\n");
    const { graph, counts } = stitchCountsByRound(pattern);

    expect(graph.issues).toHaveLength(1);
    expect(graph.issues[0]).toMatchObject({ round: 2 });
    expect(counts).toEqual([6, 6]);
    expect(graph.rounds.map((round) => round.number)).toEqual([1, 3]);
  });
});
