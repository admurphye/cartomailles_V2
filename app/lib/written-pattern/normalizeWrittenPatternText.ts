/**
 * Normalise uniquement les formulations éditoriales avant leur traduction en
 * notation Cartomailles. Le texte source du document reste inchangé.
 */
export function normalizeWrittenPatternText(text: string): string {
  const quantity = "(?:\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)";
  const stitch = "(?:ms|mc|ml|br|db|dbr|tb|tbr|mailles?\\s+serr[ée]es?|mailles?\\s+coul[ée]es?|mailles?\\s+en\\s+l['’]air|brides?|demi[-\\s]?brides?|doubles?\\s+brides?|triples?\\s+brides?)";
  const beforeInstruction = new RegExp(
    `\\b(?:crocheter|crochetez|faire|faites|r[ée]aliser|r[ée]alisez|travailler|travaillez)\\s+(?=${quantity}\\s+${stitch}\\b)`,
    "gi"
  );
  const linkAfterMagicRing = new RegExp(
    `\\bcercle\\s+magique\\s*,?\\s*(?:et|puis|ensuite)\\s+(?=${quantity}\\s+${stitch}\\b)`,
    "gi"
  );

  return text
    .replace(
      /\b(?:faire|faites|r[ée]aliser|r[ée]alisez|cr[ée]er|cr[ée]ez|former|formez)\s+un\s+cercle\s+magique\b/gi,
      "cercle magique"
    )
    .replace(
      /\s*,?\s*elles\s+ne\s+comptent\s+pas\s+comme\s+(?:(?:la\s+)?premi[èe]re|une)\s+bride\s*,?\s*/gi,
      ", "
    )
    .replace(
      /\s*,?\s*elles\s+comptent\s+comme\s+(?:(?:la\s+)?premi[èe]re|une)\s+bride\s*,?\s*/gi,
      ", "
    )
    .replace(beforeInstruction, "")
    .replace(linkAfterMagicRing, "cercle magique, ");
}
