import { prepareExtractedPdfPattern } from "../extractPdfPattern";
import type { ImportedAbbreviation, ImportedRow, ImportedSection } from "./types";

const WORD_NUMBERS: Record<string, number> = { une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyMappings(text: string, abbreviations: ImportedAbbreviation[]) {
  return abbreviations.reduce((result, abbreviation) => {
    if (!abbreviation.mappedType) return result;
    const source = escapeRegExp(abbreviation.source);
    if (abbreviation.mappedType === "term:stitch") return result;
    if (abbreviation.mappedType === "label:round") return result.replace(new RegExp(`\\b${source}(?=\\s*\\d+)`, "gi"), "Tour");
    if (abbreviation.mappedType === "label:row") return result.replace(new RegExp(`\\b${source}(?=\\s*\\d+)`, "gi"), "Rang");
    if (abbreviation.mappedType === "side:right") return result.replace(new RegExp(`\\b${source}\\b`, "gi"), "END");
    if (abbreviation.mappedType === "side:wrong") return result.replace(new RegExp(`\\b${source}\\b`, "gi"), "ENV");
    return result.replace(new RegExp(`\\b${source}\\b`, "gi"), abbreviation.mappedType);
  }, text);
}

function normalizeSimpleInstruction(text: string, structuralExpectedCount?: number): string {
  const indicatedCount = text.match(/(?:\[\s*(\d+)\s*\]|\(\s*(\d+)\s*m(?:ailles?)?\s*\))\s*$/i);
  const expectedCount = indicatedCount?.[1] ?? indicatedCount?.[2] ?? (structuralExpectedCount !== undefined ? String(structuralExpectedCount) : undefined);
  let value = text.replace(/\[\s*\d+\s*\]/g, "").replace(/\(\s*\d+\s*m(?:ailles?)?\s*\)\s*$/i, "").trim();
  value = value.replace(/\bcommencer avec\s+(\d+)\s+ms\s+dans\s+(?:cm|cercle magique)\b/i, "mr, $1 ms");
  value = value.replace(/\baug(?:mentation)?\s+dans\s+les\s+(\d+)\s+m(?:ailles?)?\b/gi, "$1 aug(ms)");
  value = value.replace(/\b(aug|dim)\((ms|db|br|dbr|tbr|brav|brar)\)\s+dans\s+les\s+(\d+)\s+m(?:ailles?)?\b/gi, "$3 $1($2)");
  value = value.replace(/\bms\s+dans\s+les\s+(\d+)\s+m(?:ailles?)?\b/gi, "$1 ms");
  const wholeRowStitch = value.match(/\b(ms|db|br|dbr|tbr|brav|brar)(?:\s+bar)?\b[\s\S]*\b(?:dans\s+)?tout\s+le\s+rang\b/i);
  if (expectedCount && wholeRowStitch) {
    value = `${/\b(?:1\s*ml|ml\s*1)\b/i.test(value) ? "1 ml, " : ""}${expectedCount} ${wholeRowStitch[1].toLowerCase()}`;
  }
  value = value.replace(/\bms\s+dans\s+la\s+m(?:aille)?\s+suivante\b/gi, "1 ms");
  value = value.replace(/\baug(?:mentation)?\s+dans\s+la\s+m(?:aille)?\s+suivante\b/gi, "1 aug(ms)");
  value = value.replace(/\b(aug|dim)\((ms|db|br|dbr|tbr|brav|brar)\)\s+dans\s+la\s+m(?:aille)?\s+suivante\b/gi, "1 $1($2)");
  value = value.replace(/\bskip\s+dans\s+les\s+(\d+)\s+m(?:ailles?)?\b/gi, "$1 skip");
  value = value.replace(/\bskip\s+dans\s+la\s+m(?:aille)?\s+suivante\b/gi, "1 skip");
  value = value.replace(/\b(une|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+fois\b/gi, (_, word: string) => `x${WORD_NUMBERS[word.toLowerCase()]}`);
  value = value.replace(/\b(\d+)\s+fois\b/gi, "x$1");
  return value;
}

export function normalizeCrochetText(section: ImportedSection, abbreviations: ImportedAbbreviation[]): ImportedRow[] {
  let mapped = applyMappings(section.sourceText, abbreviations)
    .replace(/\brg\s*(\d+)/gi, "Rang $1")
    .replace(
      /\brang\s+(\d+)\s+jusqu['’]?\s*(?:au|à)\s+rang\s+(\d+)(?:\s*\([^)]*\))?\s*:/gi,
      "Rang $1-$2:"
    )
    .replace(
      /\brang\s+(\d+)\s+(?:à|au)\s+rang\s+(\d+)\s*:/gi,
      "Rang $1-$2:"
    )
    .replace(/\b(?:tour|tr)\s+(\d+(?:\s*-\s*\d+)?)\s*:/gi, "Rang $1:");
  mapped = mapped.replace(
    /(?:\bpuis\s+)?r[ée]p[ée]ter\s+rang\s+(\d+)\s+jusqu['’]?\s*(?:au|à)\s+rang\s+(\d+)/gi,
    (_, reference: string, end: string) => `Rang ${Number(reference) + 1}-${end}: répéter Rang ${reference}`
  );
  const blocks = [...mapped.matchAll(/Rang\s+(\d+)(?:\s*-\s*(\d+))?(?:\s*\([^)]*\))?\s*:\s*([\s\S]*?)(?=\n\s*Rang\s+\d+|$)/gi)];
  const canonical = prepareExtractedPdfPattern(mapped).split("\n");
  const rows: ImportedRow[] = [];

  blocks.forEach((block, blockIndex) => {
    const start = Number(block[1]);
    const end = Number(block[2] ?? block[1]);
    const originalText = block[3].replace(/\s+/g, " ").trim();
    const header = block[0].slice(0, block[0].indexOf(":"));
    const direction = /\bEND\b/i.test(header)
      ? "left-to-right" as const
      : /\bENV\b/i.test(header)
        ? "right-to-left" as const
        : undefined;
    const structuralRow = section.rows?.find((row) => row.number === start);
    const simple = normalizeSimpleInstruction(originalText, structuralRow?.expectedCount);
    const repeatedRound = originalText.match(/r[ée]p[ée]ter\s+rang\s+(\d+)/i);
    for (let number = start; number <= end; number++) {
      const extractedRow = section.rows?.find((row) => row.number === number);
      const prepared = canonical.find((line) => line.startsWith(`R${number} `));
      const preparedBody = prepared?.replace(/^R\d+\s*/, "").trim();
      const referenced = repeatedRound
        ? rows.find((row) => row.number === Number(repeatedRound[1]))?.normalizedText.replace(/^R\d+\s*/, "")
        : undefined;
      const normalizedBody = referenced ?? (/\b(?:dans les|dans la m|commencer avec|tout le rang)\b/i.test(originalText) ? simple : preparedBody || simple);
      rows.push({ number, pageNumber: extractedRow?.pageNumber, expectedCount: extractedRow?.expectedCount, direction, originalText: extractedRow?.originalText ?? originalText, normalizedText: `R${number} ${normalizedBody}`.trim(), status: "warning", warnings: [], confidence: blockIndex === 0 && normalizedBody.includes("mr") ? 0.95 : 0.75 });
    }
  });
  return rows;
}
