import * as htmlToImage from "html-to-image";

export async function exportPNG() {

  await new Promise(resolve =>
    setTimeout(resolve, 100)
  );

  const node =
    document.getElementById(
      "diagram-container"
    );

  if (!node) return;

  const dataUrl =
    await htmlToImage.toPng(node);

  const link =
    document.createElement("a");

  link.download =
    "diagramme-crochet.png";

  link.href = dataUrl;

  link.click();
}