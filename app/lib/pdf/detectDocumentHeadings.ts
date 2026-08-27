import type { DetectedHeading, ExtractedPdf } from "./types";

const ABBREVIATION_TITLES = /^(ABR[ÉE]VIATIONS?|GLOSSAIRE|GLOSSAIRES DES POINTS|POINTS UTILIS[ÉE]S)$/i;
const LEVEL_ONE = /^(OISEAUX?|FLEURS|PATRON|TUTORIEL|CORPS|ACCESSOIRES)$/i;
const KNOWN_HEADING = /^(PI[ÈE]CE\b.*|AILES|CENTRE|P[ÉE]TALES|AFRICAN FLOWER|DEMI AFRICAN FLOWER|BAS DU SAC|BRETELLES|ASSEMBLAGE|MOTIFS? DE FEUILLES|CORPS DU CH[ÂA]LE|FINITION|FINITIONS|MAT[ÉE]RIEL|INSTRUCTIONS?|TAILLE|MESURES|QUALIT[ÉE] DU FIL|[ÉE]CHANTILLON|QUESTIONS)$/i;

export function normalizeHeading(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase(); }
export function isImportantHeading(line: string) {
  const title = line.trim();
  if (!title || /^(?:RANGS?|TOURS?|TR|RG)\s*\d/i.test(title)) return false;
  return ABBREVIATION_TITLES.test(title) || LEVEL_ONE.test(title) || KNOWN_HEADING.test(title) || (title.length <= 70 && /^[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\d &,.'’()/-]{3,}$/.test(title));
}
export function headingLevel(title: string) { return LEVEL_ONE.test(title) || ABBREVIATION_TITLES.test(title) || /^(MAT[ÉE]RIEL|TAILLE|MESURES|QUALIT[ÉE]|[ÉE]CHANTILLON|QUESTIONS)/i.test(title) ? 1 : 2; }
export function detectDocumentHeadings(pdf: ExtractedPdf): DetectedHeading[] {
  const headings: DetectedHeading[] = [];
  let documentIndex = 0;
  for (const page of pdf.pages) for (const [lineIndex, raw] of page.text.split("\n").entries()) {
    const title = raw.trim();
    if (isImportantHeading(title)) headings.push({ id: `heading-${page.pageNumber}-${lineIndex}`, title, normalizedTitle: normalizeHeading(title), level: headingLevel(title), pageNumber: page.pageNumber, lineIndex, documentIndex });
    documentIndex++;
  }
  return headings;
}
export function isAbbreviationHeading(title: string) { return ABBREVIATION_TITLES.test(title.trim()); }
