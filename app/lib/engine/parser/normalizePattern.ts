export function normalizePattern(text: string): string {
  return text
    .toLowerCase()

    .replace(/\bpop\s+corn\b/gi, "popcorn")

    // Éventails de brides piquées dans une seule maille.
    .replace(
      /(?:[ée]ventail|coquillage)\s*\(\s*(5|6|9)\s*(?:br|brides?)\s*\)/gi,
      (_, count) => `fan_${count}_dc`
    )
    .replace(
      /(?:[ée]ventail|coquillage)\s+(5|6|9)\s*(?:br|brides?)\b/gi,
      (_, count) => `fan_${count}_dc`
    )
    .replace(
      /\b(5|6|9)\s*(?:br|brides?)\s+(?:ensemble|dans\s+la\s+m[êe]me\s+maille)\b/gi,
      (_, count) => `fan_${count}_dc`
    )
    .replace(/\b(5|6|9)be\b/gi, (_, count) => `fan_${count}_dc`)

    // Deux brides piquées dans la même maille (augmentation en V).
    .replace(
      /\b(?:2|deux)\s*(?:br|brides?)\s+(?:ensemble|dans\s+la\s+m[êe]me\s+maille)\b/gi,
      "aug(br)"
    )
    .replace(/\b2be\b/gi, "aug(br)")
    .replace(
      /\b(?:3|trois)\s*(?:br|brides?)\s+(?:ensemble|dans\s+la\s+m[êe]me\s+maille)\b/gi,
      "triple_dc_increase"
    )
    .replace(/\b3be\b/gi, "triple_dc_increase")
    .replace(/\b3dbe\b/gi, "triple_hdc_increase")
    .replace(/\b3dbre\b/gi, "triple_dtr_increase")
    .replace(/\b3tbr\b/gi, "triple_tr_increase")

    // Trois mailles de même type piquées dans la même maille.
    .replace(
      /\b(?:3|trois)\s*(?:db|demi[\s-]*brides?)\s+(?:ensemble|dans\s+la\s+m[êe]me\s+maille)\b/gi,
      "triple_hdc_increase"
    )
    .replace(
      /\b(?:3|trois)\s*(?:dbr|doubles?\s+brides?)\s+(?:ensemble|dans\s+la\s+m[êe]me\s+maille)\b/gi,
      "triple_dtr_increase"
    )
    .replace(
      /\b(?:3|trois)\s*(?:tbr|tb|tri(?:p|b)les?\s+brides?)\s+(?:ensemble|dans\s+la\s+m[êe]me\s+maille)\b/gi,
      "triple_tr_increase"
    )

    // Noms usuels du cercle magique.
    .replace(/\b(cercle|anneau)\s+magique\b/gi, "mr")

    // Une maille sautée consomme un parent sans produire de nouveau symbole.
    // Exemples : "sauter une maille", "sautez 2 mailles", "3 mailles sautées".
    .replace(
      /\b(?:sauter|saute|sautez|saut[ée]e?s?)\s+(une?|\d+)\s+mailles?\b/gi,
      (_, count) => `${/^un(?:e)?$/i.test(count) ? 1 : count} skip`
    )
    .replace(
      /\b(une?|\d+)\s+mailles?\s+saut[ée]e?s?\b/gi,
      (_, count) => `${/^un(?:e)?$/i.test(count) ? 1 : count} skip`
    )

    .replace(
      /\b(aug|augmentation|inc|increase|dim|diminution|dec|decrease)\(([^)]+)\)/gi,
      (_, fn, arg) => `${fn}§${arg}§`
    )

    // Accepte aussi la notation naturelle documentée : "aug ms", "dim br"...
    .replace(
      /\b(aug|augmentation|inc|increase|dim|diminution|dec|decrease)\s+(ms|db|dbr|b|br|brav|br_av|brar|br_ar|tb|ml|mc|cm|mr|sc|hdc|dc|dtr|fpdc|bpdc|tr|ch|slst)\b/gi,
      (_, fn, stitch) => `${fn}§${stitch}§`
    )
    // Remplace × par x
    .replace(/×/g, "x")

    // Ajoute un espace entre un nombre et des lettres
    .replace(/(\d)([a-zà-ÿ])/gi, "$1 $2")

    // Ajoute un espace entre des lettres et un nombre, sauf pour les
    // marqueurs de rang R1, R2... que parseTokens reconnaît tels quels.
    .replace(/([a-zà-ÿ])(\d)/gi, (match, letter: string, number: string) =>
      letter === "r" ? match : `${letter} ${number}`
    )

    // Espaces autour de la ponctuation
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ")

    // Supprime les espaces multiples
    .replace(/[ \t]+/g, " ")

    
  .replace(/§([^§]+)§/g, "($1)")
    .trim();
}
