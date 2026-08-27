import { describe, expect, it } from "vitest";
import { classifyRasterBox } from "./localRasterAnalysis";

describe("local raster stitch classification", () => {
  it("recognizes a rotated chain oval from its enclosed hole", () => expect(classifyRasterBox({ x: 0, y: 0, width: 9, height: 8, pixels: 22, major: 8, minor: 4, holes: 1 })?.stitch).toBe("ml"));
  it("recognizes a rotated tall stitch", () => expect(classifyRasterBox({ x: 0, y: 0, width: 18, height: 18, pixels: 30, major: 24, minor: 5 })?.stitch).toBe("br"));
  it("rejects a solid block", () => expect(classifyRasterBox({ x: 0, y: 0, width: 10, height: 10, pixels: 90 })).toBeNull());
});
