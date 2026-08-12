import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

export async function exportPDF(
  diagram: SVGSVGElement,
  projectName: string,
  pattern: string
) {
  const viewBox = diagram.viewBox.baseVal;
  const bounds = diagram.getBoundingClientRect();
  const captureWidth = viewBox.width || bounds.width || 700;
  const captureHeight = viewBox.height || bounds.height || 700;
  const exportContainer = document.createElement("div");
  const exportDiagram = diagram.cloneNode(true) as SVGSVGElement;

  exportContainer.style.position = "fixed";
  exportContainer.style.left = "-100000px";
  exportContainer.style.top = "0";
  exportContainer.style.width = `${captureWidth}px`;
  exportContainer.style.height = `${captureHeight}px`;
  exportContainer.style.backgroundColor = "#ffffff";
  exportDiagram.setAttribute("width", String(captureWidth));
  exportDiagram.setAttribute("height", String(captureHeight));
  exportDiagram.style.display = "block";
  exportContainer.appendChild(exportDiagram);
  document.body.appendChild(exportContainer);

  let dataUrl: string;

  try {
    dataUrl = await htmlToImage.toPng(exportContainer, {
      backgroundColor: "#ffffff",
      pixelRatio: 3,
      width: captureWidth,
      height: captureHeight,
    });
  } finally {
    exportContainer.remove();
  }

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
  const ratio = captureWidth / captureHeight;
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
