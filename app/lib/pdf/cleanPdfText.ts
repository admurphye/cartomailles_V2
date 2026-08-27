import type { ExtractedPdf, ExtractedPdfPage } from "./types";

const NOISE = [
  /^https?:\/\//i,
  /^www\./i,
  /powered by tcpdf/i,
  /hobbii-pattern-sku/i,
  /©|copyright/i,
];

export function cleanPdfText(pdf: ExtractedPdf): ExtractedPdf {
  const pages: ExtractedPdfPage[] = pdf.pages.map((page) => {
    const lines = page.text.split("\n").filter((rawLine) => {
      const line = rawLine.trim();
      if (!line) return false;
      if (NOISE.some((pattern) => pattern.test(line))) return false;
      if (/^\d+$/.test(line)) return false;
      return true;
    });
    return { ...page, text: lines.join("\n") };
  });

  return { pages, fullText: pages.map((page) => page.text).join("\n") };
}
