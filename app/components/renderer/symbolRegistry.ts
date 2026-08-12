import { StitchType } from "@/app/lib/engine/model/Stitch";

export const SYMBOL_REGISTRY: Record<StitchType, string> = {
  mr: "MR",
  ch: "ML",
  slst: "MC",
  sc: "MS",
  hdc: "DB",
  dc: "BR",
  fpdc: "BRAV",
  bpdc: "BRAR",
  tr: "TBR",
  dtr: "DBR",
};
