import type { ExtractedPdf, ImportedAbbreviation } from "./types";
import { isAbbreviationHeading, isImportantHeading } from "./detectDocumentHeadings";

const DESCRIPTION_MAP: Array<[RegExp, string]> = [
  [/cercle magique|anneau magique|magic ring/i, "mr"],
  [/maille en l['’]air|cha[iî]nette/i, "ml"],
  [/maille serr[ée]e/i, "ms"],
  [/maille coul[ée]e/i, "mc"],
  [/demi[- ]?bride/i, "db"],
  [/double bride/i, "dbr"],
  [/triple bride/i, "tbr"],
  [/bride relief avant/i, "brav"],
  [/bride relief arri[èe]re/i, "brar"],
  [/popcorn/i, "popcorn"],
  [/saut(?:er)? (?:une )?maille|maille saut[ée]e/i, "skip"],
  [/(?:augmentation|aug).*(?:maille serr[ée]e|\bms\b)/i, "aug(ms)"],
  [/(?:augmentation|aug).*demi[- ]?bride/i, "aug(db)"],
  [/(?:augmentation|aug).*double bride/i, "aug(dbr)"],
  [/(?:augmentation|aug).*triple bride/i, "aug(tbr)"],
  [/(?:augmentation|aug).*bride/i, "aug(br)"],
  [/(?:diminution|dim|2\s*ens).*(?:maille serr[ée]e|\bms\b)/i, "dim(ms)"],
  [/(?:diminution|dim|2\s*ens).*demi[- ]?bride/i, "dim(db)"],
  [/(?:diminution|dim|2\s*ens).*double bride/i, "dim(dbr)"],
  [/(?:diminution|dim|2\s*ens).*triple bride/i, "dim(tbr)"],
  [/(?:diminution|dim|2\s*ens|2\s*brides?).*relief avant.*ensemble/i, "dim(brav)"],
  [/(?:diminution|dim|2\s*ens|2\s*brides?).*relief arri[èe]re.*ensemble/i, "dim(brar)"],
  [/(?:diminution|dim|2\s*ens).*bride/i, "dim(br)"],
  [/^bride(?:s)?$/i, "br"],
  [/^mailles?\s*(?:\(s\))?$/i, "term:stitch"],
  [/^tours?$/i, "label:round"],
  [/^rangs?$/i, "label:row"],
  [/^endroit$/i, "side:right"],
  [/^envers$/i, "side:wrong"],
];

export function detectAbbreviations(source: ExtractedPdf | string): ImportedAbbreviation[] {
  const lines = (typeof source === "string" ? source : source.pages.map((page) => page.text).join("\n")).split("\n");
  const heading = lines.findIndex(isAbbreviationHeading);
  if (heading < 0) return [];
  const area: string[] = [];
  for (let index = heading + 1; index < lines.length; index++) { if (isImportantHeading(lines[index])) break; area.push(lines[index]); }
  const found = new Map<string, ImportedAbbreviation>();
  area.forEach((line) => {
    const match = line.match(/^\s*([\p{L}\d-]{1,14})\s*(?::|=)\s*(.+?)\s*$/u);
    if (!match) return;
    const source = match[1];
    const description = match[2];
    const mappedType = DESCRIPTION_MAP.find(([pattern]) => pattern.test(description.trim()))?.[1];
    found.set(source.toLowerCase(), { source, description, mappedType, confidence: mappedType ? 0.95 : 0.35 });
  });
  return [...found.values()];
}
