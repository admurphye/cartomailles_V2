export function normalizePattern(text: string): string {
  return text
    .toLowerCase()

    // Noms usuels du cercle magique.
    .replace(/\b(cercle|anneau)\s+magique\b/gi, "mr")

    .replace(
      /\b(aug|augmentation|inc|increase|dim|diminution|dec|decrease)\(([^)]+)\)/gi,
      (_, fn, arg) => `${fn}§${arg}§`
    )
    // Remplace × par x
    .replace(/×/g, "x")

    // Ajoute un espace entre un nombre et des lettres
    .replace(/(\d)([a-zà-ÿ])/gi, "$1 $2")

    // Ajoute un espace entre des lettres et un nombre
    .replace(/([a-zà-ÿ])(\d)/gi, "$1 $2")

    // Espaces autour de la ponctuation
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ")

    // Supprime les espaces multiples
    .replace(/[ \t]+/g, " ")

    
  .replace(/§([^§]+)§/g, "($1)")
    .trim();
}
