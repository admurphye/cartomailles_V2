import { describe, expect, it } from "vitest";
import { parseCartomaillesSvg } from "./parseCartomaillesSvg";

describe("import d'un diagramme SVG Cartomailles", () => {
  it("reconstruit les rangs depuis les métadonnées exportées", () => {
    const symbol = (type: string, operation: string, round: number, order: number, groupSize = 1) =>
      `<g class="crochet-symbol" data-stitch-type="${type}" data-stitch-operation="${operation}" data-stitch-round="${round}" data-stitch-order="${order}" data-stitch-role="normal" data-stitch-group-size="${groupSize}"></g>`;
    const svg = `<svg>${symbol("mr", "normal", 1, 1)}${Array.from({ length: 6 }, (_, index) => symbol("sc", "normal", 2, index + 1)).join("")}${Array.from({ length: 12 }, (_, index) => symbol("sc", "increase", 3, index + 1, 2)).join("")}</svg>`;
    const result = parseCartomaillesSvg(svg);

    expect(result.symbols).toHaveLength(19);
    expect(result.pattern).toBe("R1 mr\nR2 6 ms\nR3 6 aug(ms)");
  });
});
