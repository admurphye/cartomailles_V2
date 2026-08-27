import type { ExtractedPdf, ImportedPatternSize } from "./types";

const STANDARD_SIZE = /^(?:XXS|XS|S|M|L|XL|XXL|[2-9]XL|TAILLE UNIQUE)$/i;

function parseSizeLabels(value: string) {
  return value
    .replace(/[()[\]]/g, " ")
    .split(/[,;/|]|\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => STANDARD_SIZE.test(item));
}

export function detectPatternSizes(pdf: ExtractedPdf): ImportedPatternSize[] {
  const lines = pdf.pages.flatMap((page) => page.text.split("\n"));
  let labels: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const inline = lines[index].match(/^\s*tailles?\s*(?::|=)\s*(.+)$/i);
    if (inline) labels = parseSizeLabels(inline[1]);
    else if (/^\s*tailles?\s*$/i.test(lines[index])) labels = parseSizeLabels(lines[index + 1] ?? "");
    if (labels.length > 1) break;
  }
  return [...new Set(labels.map((label) => label.toUpperCase()))]
    .map((label, index) => ({ id: `size-${index}`, label, index }));
}

function chooseNumericAlternative(line: string, sizeIndex: number, sizeCount: number) {
  const parenthesized = /\b(\d+)\s*\(\s*((?:\d+\s*[,;]?\s*)+)\)/g;
  let result = line.replace(parenthesized, (whole, first: string, rest: string) => {
    const values = [first, ...(rest.match(/\d+/g) ?? [])];
    return values.length === sizeCount ? values[sizeIndex] : whole;
  });
  const alternating = /\b\d+(?:\s*\(\s*\d+\s*\)|\s+\d+){2,}/g;
  result = result.replace(alternating, (whole) => {
    const values = whole.match(/\d+/g) ?? [];
    return whole.includes("(") && values.length === sizeCount ? values[sizeIndex] : whole;
  });
  const commaList = /\b(\d+(?:\s*,\s*\d+){1,})\b/g;
  result = result.replace(commaList, (whole) => {
    const values = whole.match(/\d+/g) ?? [];
    return values.length === sizeCount ? values[sizeIndex] : whole;
  });
  return result;
}

export function selectPatternSize(pdf: ExtractedPdf, size: ImportedPatternSize, allSizes: ImportedPatternSize[]): ExtractedPdf {
  const pages = pdf.pages.map((page) => ({
    ...page,
    text: page.text.split("\n").map((line) => chooseNumericAlternative(line, size.index, allSizes.length)).join("\n"),
  }));
  return { pages, fullText: pages.map((page) => page.text).join("\n") };
}
