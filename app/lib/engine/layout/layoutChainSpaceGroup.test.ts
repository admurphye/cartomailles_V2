import { describe, expect, it } from "vitest";
import type { StitchType } from "../model/Stitch";
import { layoutChainSpaceFan } from "./layoutChainSpaceGroup";
import { parsePattern } from "../parser/parsePattern";
import { layoutFlatGroups } from "./layoutFlatGroups";
import { applyFlatRowDirections } from "./flatRowDirection";

describe("layoutChainSpaceFan", () => {
  it.each([
    [["sc", "hdc", "dc", "dc", "hdc", "sc"]],
    [["dc", "dc", "dc", "ch", "ch", "dc", "dc", "dc"]],
    [["dc", "dc", "dc"]],
    [["sc", "dc", "sc"]],
  ] as [StitchType[]][])("centre symétriquement %j sur un arceau", (types) => {
    const targetX = 240;
    const positions = layoutChainSpaceFan({
      targetX,
      stitchTypes: types,
      stitchGap: 16,
    });

    expect(positions).toHaveLength(types.length);
    expect((positions[0].x + positions.at(-1)!.x) / 2).toBe(targetX);
    for (let index = 0; index < positions.length; index++) {
      const mirror = positions.length - 1 - index;
      expect(positions[index].x + positions[mirror].x).toBe(2 * targetX);
      expect(positions[index].rotation).toBeCloseTo(-positions[mirror].rotation);
    }
  });

  it("place les brides centrales au sommet d'un groupe mixte", () => {
    const positions = layoutChainSpaceFan({
      targetX: 0,
      stitchTypes: ["sc", "hdc", "dc", "dc", "hdc", "sc"],
      stitchGap: 16,
    });
    expect(positions[2].yOffset).toBeLessThan(positions[1].yOffset);
    expect(positions[1].yOffset).toBeLessThan(positions[0].yOffset);
    expect(positions[2].yOffset).toBe(positions[3].yOffset);
  });

  it("centre alternativement les groupes de 3 et 5 brides sur leur arceau réel", () => {
    const graph = applyFlatRowDirections(parsePattern([
      "R1 1 ms, 2 ml, 1 ms, 4 ml, 1 ms, 2 ml, 1 ms, 4 ml, 1 ms, 2 ml, 1 ms, 4 ml, 1 ms",
      "R2 3 ml_as_dc, 1 archat_0_3_br_2, 1 archat_1_5_br_4, 1 archat_2_3_br_2, 1 archat_3_5_br_4, 1 archat_4_3_br_2, 1 archat_5_5_br_4",
    ].join("\n")));
    const positioned = layoutFlatGroups(graph);
    const targetedGroups = graph.groups.filter(
      (group) => group.round === 2 && group.role === "chainSpaceTarget"
    );
    const positionedById = new Map(positioned.map((stitch) => [stitch.id, stitch]));

    expect(targetedGroups.map((group) => group.stitches.length))
      .toEqual([3, 5, 3, 5, 3, 5]);

    const widths: number[] = [];
    for (const group of targetedGroups) {
      const children = group.stitches.map((stitch) => positionedById.get(stitch.id)!);
      const parentIds = new Set(group.stitches.flatMap((stitch) =>
        graph.links.filter((link) => link.to === stitch.id).map((link) => link.from)
      ));
      const parents = [...parentIds].map((id) => positionedById.get(id)!);
      const targetX = parents.reduce((sum, parent) => sum + parent.x, 0) / parents.length;
      const minX = Math.min(...children.map((stitch) => stitch.x));
      const maxX = Math.max(...children.map((stitch) => stitch.x));
      widths.push(maxX - minX);

      expect((minX + maxX) / 2).toBeCloseTo(targetX);
      expect(children.every((stitch) => stitch.fanGeometry)).toBe(true);
      expect(Math.max(...children.map((stitch) => stitch.fanGeometry!.baseX)) -
        Math.min(...children.map((stitch) => stitch.fanGeometry!.baseX)))
        .toBeLessThanOrEqual(16);
      expect(children.every((stitch) =>
        stitch.fanGeometry!.headX === stitch.x &&
        stitch.fanGeometry!.headY === stitch.y
      )).toBe(true);
      for (let index = 0; index < children.length; index++) {
        const mirror = children.length - 1 - index;
        expect(children[index].rotation ?? 0)
          .toBeCloseTo(-(children[mirror].rotation ?? 0));
      }
      expect(new Set(children.map((stitch) => stitch.y)).size).toBe(1);
    }
    expect(widths[1]).toBeGreaterThan(widths[0]);
    expect(widths[3]).toBeGreaterThan(widths[2]);
    expect(widths[5]).toBeGreaterThan(widths[4]);

    const startChain = positioned.filter(
      (stitch) => stitch.round === 2 && stitch.role === "turningChain"
    );
    expect(startChain).toHaveLength(3);
  });
});
