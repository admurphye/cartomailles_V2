import { describe, expect, it } from "vitest";
import { analysisToPattern, parseVisionChartAnalysis } from "./visionAnalysis";

describe("vision chart analysis", () => {
  it("validates and orders recognized rows", () => {
    const result = parseVisionChartAnalysis({ diagramType: "flat", confidence: 0.8, warnings: [], rows: [
      { number: 2, normalizedText: "5 ms", confidence: 0.7, warnings: [] },
      { number: 1, normalizedText: "R1 6 ml", confidence: 0.9, warnings: [] },
    ] });
    expect(analysisToPattern(result)).toBe("R1 6 ml\nR2 5 ms");
  });

  it("rejects an unsupported diagram type", () => {
    expect(() => parseVisionChartAnalysis({ diagramType: "photo", confidence: 1, warnings: [], rows: [] })).toThrow();
  });
});
