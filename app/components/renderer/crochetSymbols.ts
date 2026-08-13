export type CrochetSymbol = {
  name: string;
  code: string;
  svg: string;
  aliases: string[];
  category: string;

  consumes: number;
  produces: number;
  needsParent: boolean;
};

export const CROCHET_SYMBOLS: Record<
  string,
  CrochetSymbol
> = {
  ml: {
    name: "Maille en l'air",
    code: "O",
    svg: "mailleEnLAir",
    category: "basic",
    aliases: ["maille en l'air", "mailles en l'air", "ml"],
    consumes: 0,
    produces: 1,
    needsParent: false,
  },

  mc: {
    name: "Maille coulée",
    code: "MC",
    svg: "mailleCoulee",
    category: "basic",
    aliases: ["maille coulée", "mailles coulées", "mc"],
    consumes: 1,
    produces: 1,
    needsParent: true,
  },

  ms: {
    name: "Maille serrée",
    code: "X",
    svg: "mailleSerree",
    category: "basic",
    aliases: ["maille serrée", "mailles serrées", "ms"],
    consumes: 1,
     produces: 1,
     needsParent: true,
  },

  db: {
    name: "Demi-bride",
    code: "DB",
    svg: "demiBride",
    category: "basic",
    aliases: ["demi-bride", "demi-brides", "db"],
    consumes: 1,
    produces: 1,
    needsParent: true,
  },

  br: {
    name: "Bride",
    code: "T",
    svg: "bride",
    category: "basic",
    aliases: ["bride", "brides", "br"],
    consumes: 1,
    produces: 1,
    needsParent: true,
  },

 dbr: {
  name: "Double bride",
  code: "DBR",
  svg: "doubleBride",
  category: "basic",
  aliases: [
    "double bride",
    "doubles brides",
    "dbr"
  ],
  consumes: 1,
  produces: 1,
  needsParent: true,
},

tbr: {
  name: "Triple bride",
  code: "TBR",
  svg: "tripleBride",
  category: "basic",
  aliases: [
    "triple bride",
    "triples brides",
    "tbr"
  ],
  consumes: 1,
  produces: 1,
  needsParent: true,
},

  aug: {
    name: "Augmentation",
    code: "V",
    svg: "augmentation",
    category: "construction",
    aliases: ["augmentation", "augmentations", "aug"],
    consumes: 1,
    produces: 2,
    needsParent: true,
  },

  dim: {
    name: "Diminution",
    code: "A",
    svg: "diminution",
    category: "construction",
    aliases: ["diminution", "diminutions", "dim"],
    consumes: 2,
    produces: 1,
    needsParent: true,
  },
  deuxBridesEns: {
    name: "2 brides dans la même maille",
    code: "2BE",
    svg: "deuxBridesEnsemble",
    category: "construction",
    aliases: [
    "2 brides ensemble",
    "2 brides dans la même maille",
    "2br ensemble",
    "2be"
  ],
     consumes: 1,
     produces: 2,
     needsParent: true,
},
  troisBridesEns: {
  name: "3 brides ensemble",
  code: "3BE",
  svg: "3BridesEnsemble",
  category: "construction",
  aliases: [
    "3 brides ensemble",
    "3br ensemble",
    "3be"
  ],

  consumes: 3,
  produces: 1,
  needsParent: true,
},
  picot: {
    name: "Picot",
    code: "P",
    svg: "picot",
    category: "decorative",
    aliases: ["picot", "picots"],
    consumes: 1,
    produces: 1,
    needsParent: true,
  },

  arceau: {
    name: "Arceau",
    code: "ARC",
    svg: "Arceau",
    category: "decorative",
    aliases: ["arceau", "arceaux"],
    consumes: 1,
    produces: 1,
    needsParent: true,
  },

  reliefAvant: {
    name: "Bride relief avant",
    code: "RAV",
    svg: "brideReliefAvant",
    category: "relief",
    aliases: [
      "relief avant",
      "bride relief avant",
      "rav",
    ],
    consumes: 1,
  produces: 1,
  needsParent: true,
  },

  reliefArriere: {
    name: "Bride relief arrière",
    code: "RAR",
    svg: "brideReliefArriere",
    category: "relief",
    aliases: [
      "relief arrière",
      "bride relief arrière",
      "rar",
    ],
    consumes: 1,
  produces: 1,
  needsParent: true,
  },

  cercleMagique: {
    name: "Cercle magique",
    code: "MR",
    svg: "cercleMagique",
    category: "foundation",
    aliases: [
      "cercle magique",
      "anneau magique",
      "mr",
      "magic ring",
    ],
    consumes: 1,
  produces: 1,
  needsParent: true,
  },
  };
 // ====================================================
// Recherche d'un symbole à partir de son code
// ====================================================

export function getSymbolDefinition(code: string) {
  return Object.values(CROCHET_SYMBOLS).find(
    symbol => symbol.code === code
  );
}
