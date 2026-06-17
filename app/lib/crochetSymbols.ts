export type CrochetSymbol = {
  name: string;
  code: string;
  svg: string;
  aliases: string[];
  category: string;
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
  },

  mc: {
    name: "Maille coulée",
    code: "MC",
    svg: "slipStitch",
    category: "basic",
    aliases: ["maille coulée", "mailles coulées", "mc"],
  },

  ms: {
    name: "Maille serrée",
    code: "X",
    svg: "singleCrochet",
    category: "basic",
    aliases: ["maille serrée", "mailles serrées", "ms"],
  },

  db: {
    name: "Demi-bride",
    code: "DB",
    svg: "halfDoubleCrochet",
    category: "basic",
    aliases: ["demi-bride", "demi-brides", "db"],
  },

  b: {
    name: "Bride",
    code: "T",
    svg: "doubleCrochet",
    category: "basic",
    aliases: ["bride", "brides", "b"],
  },

  tb: {
    name: "Double bride",
    code: "TB",
    svg: "trebleCrochet",
    category: "basic",
    aliases: ["double bride", "doubles brides", "tb"],
  },

  aug: {
    name: "Augmentation",
    code: "V",
    svg: "increase",
    category: "construction",
    aliases: ["augmentation", "augmentations", "aug"],
  },

  dim: {
    name: "Diminution",
    code: "A",
    svg: "decrease",
    category: "construction",
    aliases: ["diminution", "diminutions", "dim"],
  },

  picot: {
    name: "Picot",
    code: "P",
    svg: "picot",
    category: "decorative",
    aliases: ["picot", "picots"],
  },

  arceau: {
    name: "Arceau",
    code: "ARC",
    svg: "chainSpace",
    category: "decorative",
    aliases: ["arceau", "arceaux"],
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
  },
};