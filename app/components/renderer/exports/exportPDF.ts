import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

export async function exportPDF(
  diagram: SVGSVGElement,
  projectName: string,
  pattern: string
) {
  const container = diagram.parentElement;

  if (!container) {
    return;
  }

  const dataUrl = await htmlToImage.toPng(container, {
    backgroundColor: "#ffffff",
    pixelRatio: 3,
  });

  const viewBox = diagram.viewBox.baseVal;
  const isLandscape = viewBox.width > viewBox.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 12;
  const titleHeight = 12;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = viewBox.width / viewBox.height || 1;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - titleHeight;

  let imageWidth = availableWidth;
  let imageHeight = imageWidth / ratio;

  if (imageHeight > availableHeight) {
    imageHeight = availableHeight;
    imageWidth = imageHeight * ratio;
  }

  pdf.setFontSize(16);
  pdf.text(projectName || "Diagramme Crochet", margin, margin);
  pdf.addImage(
    dataUrl,
    "PNG",
    (pageWidth - imageWidth) / 2,
    margin + titleHeight,
    imageWidth,
    imageHeight
  );

  pdf.addPage();

  const textMargin = 16;
  const lineHeight = 6;
  const textWidth = pageWidth - textMargin * 2;
  let y = textMargin;

  pdf.setFontSize(16);
  pdf.text("Patron", textMargin, y);
  y += 10;

  pdf.setFontSize(11);

  const lines = pattern.trim()
    ? pattern.split("\n")
    : ["Aucun patron renseigné."];

  lines.forEach((line) => {
    const wrappedLines = pdf.splitTextToSize(line || " ", textWidth);

    if (y + wrappedLines.length * lineHeight > pageHeight - textMargin) {
      pdf.addPage();
      y = textMargin;
    }

    pdf.text(wrappedLines, textMargin, y);
    y += wrappedLines.length * lineHeight;
  });

  pdf.save(`${projectName || "diagramme"}.pdf`);
}
