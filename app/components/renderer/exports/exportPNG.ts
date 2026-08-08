import * as htmlToImage from "html-to-image";

export async function exportPNG(
  diagram: SVGSVGElement,
  projectName: string
) {
  const container = diagram.parentElement;

  if (!container) {
    return;
  }

  const dataUrl = await htmlToImage.toPng(container, {
    backgroundColor: "#ffffff",
    pixelRatio: 3,
  });

  const link =
    document.createElement("a");

  link.download =
    `${projectName || "diagramme"}.png`;

  link.href = dataUrl;

  link.click();
}
