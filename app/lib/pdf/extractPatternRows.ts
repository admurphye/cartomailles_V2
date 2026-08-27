import { isImportantHeading } from "./detectDocumentHeadings";
import type { ExtractedPatternRow, ExtractedPdf } from "./types";

const ROW_START = /^\s*(rangs?|rg|tours?|tr)\s*(\d+)(?:\s*-\s*(\d+)|\s+jusqu['’]?\s*(?:au|à)\s+(?:rang|rg|tour|tr)\s*(\d+))?(?:\s*\([^:]*\))?\s*:\s*(.*)$/i;

export function extractPatternRows(pdf: ExtractedPdf): ExtractedPatternRow[] {
  const rows: ExtractedPatternRow[] = [];
  let active: { label: string; start: number; end: number; type: "row" | "round"; text: string; pageNumber: number; documentIndex: number } | null = null;
  let documentIndex = 0;
  const flush = () => {
    if (!active) return;
    const count = active.text.match(/\[\s*(\d+)\s*\]\s*$/);
    const originalText = active.text.replace(/\[\s*\d+\s*\]\s*$/, "").replace(/\s+/g, " ").trim();
    for (let number = active.start; number <= active.end; number++) rows.push({ type: active.type, number, originalText, expectedCount: count ? Number(count[1]) : undefined, pageNumber: active.pageNumber, sourceLabel: active.label, sourceNumber: active.start, documentIndex: active.documentIndex });
    active = null;
  };
  for (const page of pdf.pages) for (const raw of page.text.split("\n")) {
    const line = raw.trim();
    const match = line.match(ROW_START);
    if (match) { flush(); active = { label: match[1], start: Number(match[2]), end: Number(match[3] ?? match[4] ?? match[2]), type: /^(?:tr|tour)/i.test(match[1]) ? "round" : "row", text: match[5], pageNumber: page.pageNumber, documentIndex }; }
    else if (active) { if (isImportantHeading(line)) flush(); else active.text += ` ${line}`; }
    documentIndex++;
  }
  flush();
  return rows;
}
