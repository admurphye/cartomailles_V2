export function normalizePattern(text: string): string {
  return text
    .toLowerCase()

    // Libellés de rang courants dans les patrons éditoriaux.
    .replace(/\b(?:rang|tour)\s+(\d+)(?:\s*\([^)]*\))?\s*:\s*/gi, "r$1 ")

    // Répétitions éditoriales délimitées par des astérisques :
    // « *1 ms, 2 ml, sauter 1 maille* répéter 10 fois ».
    .replace(
      /\*([^*\r\n]+)\*\s*,?\s*r[ée]p[ée]ter\s+(\d+)\s+fois/gi,
      (_, content, count) => `(${content}) x${count}`
    )

    // Les précisions telles que « 3 ml compte comme 1ère br » décrivent la
    // maille de début mais ne constituent pas une instruction supplémentaire.
    .replace(/\([^)]*\bcompte(?:nt)?\s+comme\b[^)]*\)/gi, " ")

    // Répétitions rédactionnelles : [5 br, 1 ml] deux fois.
    .replace(/\[([^\]]+)\]\s*deux\s+fois/gi, "($1) x2")
    .replace(/\[([^\]]+)\]\s*trois\s+fois/gi, "($1) x3")

    // Verbes introductifs sans incidence sur le diagramme.
    .replace(/\bfaire\s+/gi, "")

    // Une coquille de Grisaille est entièrement piquée dans le même parent.
    .replace(
      /\b(?:travailler\s+)?coquille(?:\s+dans\s+(?:la\s+)?(?:br|maille)(?:\s+suivante|\s+centrale)?)?/gi,
      "br, 1 ml, br_same_parent, 1 ml, br_same_parent"
    )

    // Points relief employés par le patron Grisaille.
    .replace(/\bbr\s*rav\s*5\s*ens\s+sur\s+(?:les\s+)?5\s*br(?:\s+suivantes?)?/gi, "cluster5_fpdc")
    .replace(/\bbr\s*rar\b/gi, "brar")
    .replace(/\bbr\s*rav\b/gi, "brav")

    // Groupes de brides piqués dans une seule bride.
    .replace(/\b(5|6|9)\s*br\s+dans\s+(?:la\s+)?br\s+suivante\b/gi, (_, count) => `fan_${count}_dc`)

    // Bride finale dans la chaînette tournante : la chaînette citée est un
    // emplacement, pas une nouvelle suite de mailles à dessiner.
    .replace(/\bbr\s+dans\s+les\s+\d+(?:(?:e|è)me?s?)?\s+ml\s+du\s+d[ée]but\b/gi, "br")

    // Forme courte rencontrée dans les répétitions : « sauter 1 ».
    .replace(/\bsauter\s+(\d+)\b(?!\s+mailles?)/gi, "$1 skip")

    .replace(/\bpop\s+corn\b/gi, "popcorn")

    // Chaînette tournante et maille piquées dans le même parent.
    .replace(
      /\b(\d+)\s*ml\s*(?:,|et)?\s*(?:1|un(?:e)?)?\s*(ms|db|br|dbr|tb|tbr|maille\s+serrée|demi[\s-]*bride|bride|double\s+bride|tri(?:p|b)le\s+bride)\s+dans\s+la\s+m[êe]me\s+maille\b/gi,
      (_, chainCount, stitchText: string) => {
        const stitch = stitchText.toLowerCase();
        const alias = /^maille\s+serr/.test(stitch)
          ? "ms"
          : /^demi/.test(stitch)
            ? "db"
            : /^double/.test(stitch)
              ? "dbr"
              : /^tri(?:p|b)le/.test(stitch)
                ? "tb"
                : stitch === "bride"
                  ? "br"
                  : stitch;
        return `${chainCount} ml, ${alias}_same_parent`;
      }
    )

    // Plusieurs mailles de n'importe quelle hauteur dans un même parent.
    .replace(
      /\b(\d+)\s*(ms|db|br|dbr|tb|tbr|mailles?\s+serr[ée]es?|demi[\s-]*brides?|brides?|doubles?\s+brides?|tri(?:p|b)les?\s+brides?)\s+dans\s+la\s+m[êe]me\s+maille\b/gi,
      (_, count, stitchText: string) => {
        const stitch = stitchText.toLowerCase();
        const alias = /^mailles?\s+serr/.test(stitch)
          ? "ms"
          : /^demi/.test(stitch)
            ? "db"
            : /^doubles?/.test(stitch)
              ? "dbr"
              : /^tri(?:p|b)les?/.test(stitch)
                ? "tb"
                : /^brides?$/.test(stitch)
                  ? "br"
                  : stitch;
        return `same_${count}_${alias}`;
      }
    )

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
    .replace(/\./g, " ")
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ")

    // Supprime les espaces multiples
    .replace(/[ \t]+/g, " ")

    
  .replace(/§([^§]+)§/g, "($1)")
    .trim();
}
