import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

export async function exportPDF(
  projectName: string,
  firstRoundCount: number,
  roundCounts: number[],
  pattern: string,
  roundSymbols: string[][],
  hasMR: boolean,
  SYMBOL_LABELS: Record<string,string>,
  setExportMode: (value:boolean) => void
) {
    
    setExportMode(true);
  
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
  
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
  
  const usedSymbols = new Set<string>();
  
  roundSymbols.forEach((round) => {
    round.forEach((symbol) => {
      usedSymbols.add(symbol);
    });
  });
  if (hasMR) {
    usedSymbols.add("MR");
  }
  
  pdf.setFontSize(20);
  
  pdf.text(
    projectName || "Diagramme Crochet",
    105,
    15
  );
  pdf.setFontSize(10);
  
  pdf.text(
    `Premier rang : ${firstRoundCount}`,
    10,
    25
  );
  
  pdf.text(
    `Nombre de rangs : ${roundCounts.length}`,
    10,
    32
  );
  
  pdf.text(
    `Mailles finales : ${
      roundCounts.length > 0
        ? roundCounts[roundCounts.length - 1]
        : 0
    }`,
    10,
    39
  );
    pdf.addImage(
      dataUrl,
      "PNG",
      25,
      50,
      150,
      150
    );
  let y = 230;
  
  pdf.setFontSize(14);
  pdf.text("Résumé des rangs", 10, y);
  
  y += 8;
  
  pdf.setFontSize(10);
  
  roundCounts.forEach((count, index) => {
    pdf.text(
      `Rang ${index + 1} : ${count} mailles`,
      10,
      y
    );
  
    y += 6;
  });
    y += 10;
  
  pdf.setFontSize(14);
  pdf.text("Patron", 10, y);
  
  y += 8;
  
  pdf.setFontSize(10);
  
  const lines = pattern.split("\n");
  
  lines.forEach((line) => {
  
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
  
    pdf.text(line, 10, y);
    y += 6;
  });
  y += 10;
  
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }
  
  pdf.setFontSize(14);
  pdf.text("Légende", 10, y);
  
  y += 8;
  
  pdf.setFontSize(10);
  
  Array.from(usedSymbols).forEach((symbol) => {
  
    const label =
      SYMBOL_LABELS[symbol] || symbol;
  
    pdf.text(
      `${symbol} = ${label}`,
      10,
      y
    );
  
    y += 6;
  });
  
  console.log("roundSymbols", roundSymbols);
  
  console.log(
    "usedSymbols",
    Array.from(usedSymbols)
  );
    pdf.save(
    `${projectName || "diagramme"}.pdf`
  );
  
    setExportMode(false);
  
}