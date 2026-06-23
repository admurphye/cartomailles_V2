export type CrochetSymbol = {
  name: string;
  code: string;
  svg: string;
  aliases: string[];
  category: string;

  consumes: number;
  produces: number;
};

export const CROCHET_SYMBOLS: Record<
  string,
  CrochetSymbol
> = {
  ml: {
    name: "Maille en l'air",
    code: "O",
    svg: "chain",
    category: "basic",
    aliases: ["maille en l'air", "mailles en l'air", "ml"],
    consumes: 1,
    produces: 1,
  },

  mc: {
    name: "Maille coulée",
    code: "MC",
    svg: "slipStitch",
    category: "basic",
    aliases: ["maille coulée", "mailles coulées", "mc"],
    consumes: 1,
    produces: 1,
  },

  ms: {
    name: "Maille serrée",
    code: "X",
    svg: "singleCrochet",
    category: "basic",
    aliases: ["maille serrée", "mailles serrées", "ms"],
    consumes: 1,
     produces: 1,
  },

  db: {
    name: "Demi-bride",
    code: "DB",
    svg: "halfDoubleCrochet",
    category: "basic",
    aliases: ["demi-bride", "demi-brides", "db"],
    consumes: 1,
    produces: 1,
  },

  b: {
    name: "Bride",
    code: "T",
    svg: "doubleCrochet",
    category: "basic",
    aliases: ["bride", "brides", "b"],
    consumes: 1,
    produces: 1,
  },

  tb: {
    name: "Double bride",
    code: "TB",
    svg: "trebleCrochet",
    category: "basic",
    aliases: ["double bride", "doubles brides", "tb"],
    consumes: 1,
    produces: 1,
  },

  aug: {
    name: "Augmentation",
    code: "V",
    svg: "increase",
    category: "construction",
    aliases: ["augmentation", "augmentations", "aug"],
    consumes: 1,
    produces: 2,
  },

  dim: {
    name: "Diminution",
    code: "A",
    svg: "decrease",
    category: "construction",
    aliases: ["diminution", "diminutions", "dim"],
    consumes: 2,
    produces: 1,
  },
  deuxBridesEns: {
    name: "2 brides ensemble",
    code: "2BE",
    svg: "doubleCrochetTogether",
    category: "construction",
     aliases: [
    "2 brides ensemble",
    "2br ensemble",
    "2be"
  ],
     consumes: 2,
     produces: 1,
},
  troisBridesEns: {
  name: "3 brides ensemble",
  code: "3BE",
  svg: "tripleCrochetTogether",
  category: "construction",
  aliases: [
    "3 brides ensemble",
    "3br ensemble",
    "3be"
  ],

  consumes: 3,
  produces: 1,
},
  picot: {
    name: "Picot",
    code: "P",
    svg: "picot",
    category: "decorative",
    aliases: ["picot", "picots"],
    consumes: 1,
    produces: 1,
  },

  arceau: {
    name: "Arceau",
    code: "ARC",
    svg: "chainSpace",
    category: "decorative",
    aliases: ["arceau", "arceaux"],
    consumes: 1,
    produces: 1,
  },

  reliefAvant: {
    name: "Bride relief avant",
    code: "RAV",
    svg: "frontPost",
    category: "relief",
    aliases: [
      "relief avant",
      "bride relief avant",
      "rav",
    ],
    consumes: 1,
  produces: 1,
  },

  reliefArriere: {
    name: "Bride relief arrière",
    code: "RAR",
    svg: "backPost",
    category: "relief",
    aliases: [
      "relief arrière",
      "bride relief arrière",
      "rar",
    ],
    consumes: 1,
  produces: 1,
  },

  cercleMagique: {
    name: "Cercle magique",
    code: "MR",
    svg: "magicRing",
    category: "foundation",
    aliases: [
      "cercle magique",
      "anneau magique",
      "mr",
      "magic ring",
    ],
    consumes: 1,
  produces: 1,
  },
};