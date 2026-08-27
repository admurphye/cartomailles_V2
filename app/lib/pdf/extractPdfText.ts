"use client";

import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { ExtractedPdf } from "./types";

function extractPage(items: TextItem[]): string {
  const lines: string[] = [];
  let current = "";
  let previousY: number | null = null;
  for (const item of items) {
    const y = item.transform[5];
    if (previousY !== null && Math.abs(y - previousY) > 2 && current.trim()) {
      lines.push(current.trim());
      current = "";
    }
    current += `${current ? " " : ""}${item.str}`;
    previousY = y;
    if (item.hasEOL && current.trim()) {
      lines.push(current.trim());
      current = "";
      previousY = null;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join("\n");
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is TextItem => "str" in item);
    pages.push({ pageNumber, text: extractPage(items) });
  }
  const fullText = pages.map((page) => page.text).join("\n");
  if (!fullText.trim()) {
    throw new Error("Ce PDF ne contient pas de texte directement exploitable. La reconnaissance des PDF scannés sera ajoutée ultérieurement.");
  }
  return { fullText, pages };
}
