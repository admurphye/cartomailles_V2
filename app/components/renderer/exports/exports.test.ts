// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { addImage, addPage, pdfSave, pdfText, setFontSize, splitTextToSize, toPng } = vi.hoisted(() => ({
  addImage: vi.fn(),
  addPage: vi.fn(),
  pdfSave: vi.fn(),
  pdfText: vi.fn(),
  setFontSize: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  toPng: vi.fn(),
}));

vi.mock("html-to-image", () => ({ toPng }));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(function MockJsPdf() {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      addImage,
      addPage,
      save: pdfSave,
      setFontSize,
      splitTextToSize,
      text: pdfText,
    };
  }),
}));

import { jsPDF } from "jspdf";
import { exportPDF } from "./exportPDF";
import { exportPNG } from "./exportPNG";
import { exportSVG } from "./exportSVG";

function createDiagram(width = 700, height = 500) {
  const container = document.createElement("div");
  const diagram = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

  circle.setAttribute("data-stitch-id", "maille-1");
  diagram.appendChild(circle);
  container.appendChild(diagram);
  document.body.appendChild(container);

  Object.defineProperty(diagram, "viewBox", {
    configurable: true,
    value: { baseVal: { x: 0, y: 0, width, height } },
  });
  const cloneNode = diagram.cloneNode.bind(diagram);
  diagram.cloneNode = ((deep?: boolean) => {
    const clone = cloneNode(deep) as SVGSVGElement;
    Object.defineProperty(clone, "viewBox", {
      configurable: true,
      value: { baseVal: { x: 0, y: 0, width, height } },
    });
    return clone;
  }) as typeof diagram.cloneNode;
  diagram.getBoundingClientRect = () => ({
    bottom: height,
    height,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  return { container, diagram };
}

describe("exports du diagramme", () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

  beforeEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
    toPng.mockResolvedValue("data:image/png;base64,diagramme");
    splitTextToSize.mockImplementation((text: string) => [text]);
  });

  it("exporte un SVG autonome aux dimensions du viewBox", async () => {
    const { diagram } = createDiagram(640, 480);
    let exportedBlob: Blob | undefined;
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      exportedBlob = blob as Blob;
      return "blob:cartomailles";
    });
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    exportSVG(diagram, "Mon projet");

    const anchor = click.mock.instances.at(-1) as HTMLAnchorElement;
    expect(anchor.download).toBe("Mon projet.svg");
    expect(anchor.href).toBe("blob:cartomailles");
    expect(exportedBlob?.type).toBe("image/svg+xml;charset=utf-8");
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exportedBlob!);
    });
    expect(source).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(source).toContain('width="640"');
    expect(source).toContain('height="480"');
    expect(source).toContain('data-stitch-id="maille-1"');
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:cartomailles");

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it("capture le conteneur en PNG haute résolution", async () => {
    const { container, diagram } = createDiagram();

    await exportPNG(diagram, "Diagramme été");

    expect(toPng).toHaveBeenCalledWith(container, {
      backgroundColor: "#ffffff",
      pixelRatio: 3,
    });
    const anchor = click.mock.instances.at(-1) as HTMLAnchorElement;
    expect(anchor.download).toBe("Diagramme été.png");
    expect(anchor.href).toBe("data:image/png;base64,diagramme");
  });

  it("ne tente pas un export PNG si le SVG est détaché", async () => {
    const diagram = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    await exportPNG(diagram, "Sans parent");

    expect(toPng).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it("crée un PDF paysage avec le diagramme puis le patron", async () => {
    const { diagram } = createDiagram(800, 400);

    await exportPDF(diagram, "Châle", "R1 6 ms\nR2 6 aug(ms)");

    expect(jsPDF).toHaveBeenCalledWith({ orientation: "landscape", unit: "mm", format: "a4" });
    expect(toPng).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      backgroundColor: "#ffffff",
      height: 400,
      pixelRatio: 3,
      width: 800,
    });
    expect(addImage).toHaveBeenCalledWith(
      "data:image/png;base64,diagramme",
      "PNG",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
    expect(addPage).toHaveBeenCalled();
    expect(pdfText).toHaveBeenCalledWith("Châle", 12, 12);
    expect(pdfText).toHaveBeenCalledWith("Patron", 16, 16);
    expect(pdfText).toHaveBeenCalledWith(["R1 6 ms"], 16, 26);
    expect(pdfSave).toHaveBeenCalledWith("Châle.pdf");
    expect(document.body.querySelectorAll("div")).toHaveLength(1);
  });

  it("nettoie le conteneur PDF temporaire même si la capture échoue", async () => {
    const { diagram } = createDiagram();
    toPng.mockRejectedValueOnce(new Error("capture impossible"));

    await expect(exportPDF(diagram, "Erreur", "")).rejects.toThrow("capture impossible");

    expect(document.body.querySelectorAll("div")).toHaveLength(1);
    expect(pdfSave).not.toHaveBeenCalled();
  });
});
