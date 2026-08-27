"use client";

import type { TextItem } from "pdfjs-dist/types/src/display/api";

function pageText(items: TextItem[]): string {
  const lines: string[] = [];
  let currentLine = "";
  let previousY: number | null = null;

  for (const item of items) {
    const y = item.transform[5];
    const startsNewLine = previousY !== null && Math.abs(y - previousY) > 2;

    if (startsNewLine && currentLine.trim()) {
      lines.push(currentLine.trim());
      currentLine = "";
    }

    currentLine += `${currentLine ? " " : ""}${item.str}`;
    previousY = y;

    if (item.hasEOL && currentLine.trim()) {
      lines.push(currentLine.trim());
      currentLine = "";
      previousY = null;
    }
  }

  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.join("\n");
}

const NUMBER_WORDS: Record<string, number> = {
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
};

function expandWrittenRepeats(text: string): string {
  return text.replace(/\[([^\]]+)\]\s*(une|deux|trois|quatre|cinq)\s+fois/gi,
    (_, content: string, count: string) =>
      Array.from({ length: NUMBER_WORDS[count.toLowerCase()] }, () => content).join(", ")
  );
}

function simplifyRound(number: string, source: string): string {
  let text = expandWrittenRepeats(source)
    .replace(/\([^)]*compte[^)]*\)/gi, " ")
    .replace(/\bcoquille\b/gi, "br, 1 ml, br_same_parent, 1 ml, br_same_parent")
    .replace(/\bbrRAV5ens\b/gi, "cluster5_fpdc")
    .replace(/\bbrRAV\b/gi, "brav")
    .replace(/\bbrRAR\s+autour\s+de\s+chacune\s+des\s+(\d+)\s+br\s+suivantes(?:RAR)?\b/gi, "$1 brar")
    .replace(/\bbrRAR\b/gi, "brar")
    .replace(/\b(5|6|9)\s*br\s+dans\b/gi, "fan_$1_dc dans")
    .replace(/\bdans\s+(?:la\s+)?3(?:e|è)me\s+ml\b[^,.]*/gi, "dans le début")
    .replace(/\b(?:un|le|la|les|l[’'])\s+/gi, " ");

  // Les totaux en italique placés après la consigne ne font pas partie du rang.
  text = text.replace(/\.\s+\d+\s*br\b[\s\S]*$/i, ".");

  const tokenPattern = /cluster5_fpdc|fan_[569]_dc|\b(?:mr|brav|brar|ml|ms|mc|db|dbr|tbr|br)\b/gi;
  const tokens: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 8), match.index);
    const count = before.match(/(\d+)\s*$/)?.[1];
    const value = match[0].toLowerCase();
    tokens.push(count && !value.startsWith("fan_") ? `${count} ${value}` : value);
  }

  if (/jusqu['’]?à|m(?:aille)?\s+marqu[ée]e|r[ée]p(?:[ée]ter)?\s+de\s+\*/i.test(source)) {
    tokens.push("conditional_repeat");
  }

  return `R${number} ${tokens.join(", ")}`;
}

export function prepareExtractedPdfPattern(text: string): string {
  const bodyStart = text.search(/(?:LE TUTORIEL COMMENCE|CORPS DU CH[ÂA]LE)/i);
  const relevant = bodyStart >= 0 ? text.slice(bodyStart) : text;
  const bodyEnd = relevant.search(/\n(?:FINITION|FINITIONS)\b/i);
  const body = bodyEnd >= 0 ? relevant.slice(0, bodyEnd) : relevant;
  const flattened = body.replace(/\r/g, "").replace(/\n(?!\s*Rang\s+\d+)/gi, " ");
  const roundPattern = /Rang\s+(\d+)(?:\s*\([^)]*\))?\s*:\s*([\s\S]*?)(?=\s+Rang\s+\d+(?:\s*\([^)]*\))?\s*:|$)/gi;
  const rounds: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = roundPattern.exec(flattened)) !== null) {
    let simplified = simplifyRound(match[1], match[2]);
    if (
      rounds.length === 0 &&
      /cercle\s+magique/i.test(body.slice(0, match.index)) &&
      !/\bmr\b/.test(simplified)
    ) {
      simplified = simplified.replace(/^(R\d+)\s+/, "$1 mr, ");
    }
    if (!rounds.some((round) => round.startsWith(`R${match![1]} `))) rounds.push(simplified);
  }

  return rounds.length > 0 ? rounds.join("\n") : text.trim();
}

export async function extractPdfPattern(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is TextItem => "str" in item);
    const text = pageText(items).trim();
    if (text) pages.push(text);
  }

  return prepareExtractedPdfPattern(pages.join("\n"));
}
