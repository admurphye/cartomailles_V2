import { detectDocumentHeadings } from "./detectDocumentHeadings";
import { extractPatternRows } from "./extractPatternRows";
import type { ExtractedPdf, ImportedSection } from "./types";

export function detectPatternSections(pdf: ExtractedPdf): ImportedSection[] {
  const headings = detectDocumentHeadings(pdf);
  const allRows = extractPatternRows(pdf);
  const flatLines: Array<{ text: string; pageNumber: number }> = [];
  pdf.pages.forEach((page) => page.text.split("\n").forEach((text) => flatLines.push({ text, pageNumber: page.pageNumber })));
  const sections: ImportedSection[] = [];
  const parentStack: Array<{ id: string; level: number }> = [];

  headings.forEach((heading, index) => {
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const endIndex = next?.documentIndex ?? flatLines.length;
    const rows = allRows.filter((row) => row.documentIndex > heading.documentIndex && row.documentIndex < endIndex);
    while (parentStack.at(-1) && parentStack.at(-1)!.level >= heading.level) parentStack.pop();
    const section: ImportedSection = {
      id: heading.id,
      title: heading.title,
      sourceText: flatLines.slice(heading.documentIndex + 1, endIndex).map((line) => line.text).join("\n").trim(),
      pageStart: heading.pageNumber,
      pageEnd: rows.at(-1)?.pageNumber ?? heading.pageNumber,
      rowCount: rows.length,
      level: heading.level,
      parentId: parentStack.at(-1)?.id,
      rows,
    };
    sections.push(section);
    parentStack.push({ id: section.id, level: section.level! });
  });

  const useful = sections.filter((section) => section.rows?.length);
  return useful.length ? useful : [{ id: "section-complete", title: "Patron détecté", sourceText: pdf.fullText, pageStart: 1, pageEnd: pdf.pages.length, rowCount: allRows.length, level: 1, rows: allRows }];
}
