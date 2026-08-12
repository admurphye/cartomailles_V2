import {
  drawMS,
  drawML,
  drawMC,
  drawDB,
  drawBR,
  drawDBR,
  drawTBR,
  drawAUG,
  drawDIM,
  drawReliefavant,
  drawReliefarriere,
  drawDeuxBridesEnsemble,
  
} from "../components/renderer/drawCrochetSymbol";

const DRAWERS = {
  O: drawML,
  MC: drawMC,
  X: drawMS,
  DB: drawDB,
  T: drawBR,
  DBR: drawDBR,
  TBR: drawTBR,
  A: drawAUG,
  V: drawDIM,
  RAV: drawReliefavant,
  RAR: drawReliefarriere,
  "2BE": drawDeuxBridesEnsemble,
 
} as const;
const SVG_DRAWERS = {
  mailleEnLAir: drawML,
  mailleCoulee: drawMC,
  mailleSerree: drawMS,
  demiBride: drawDB,
  bride: drawBR,
  doubleBride: drawDBR,
  tripleBride: drawTBR,
  augmentation: drawAUG,
  diminution: drawDIM,
  brideReliefAvant: drawReliefavant,
  brideReliefArriere: drawReliefarriere,
  deuxBridesEnsemble: drawDeuxBridesEnsemble,
} as const;

export function drawSvgSymbol(
  svg: string | null,
  x: number,
  y: number,
  color = "black",
  rotation = 0
) {
  if (!svg) return null;

  const drawer =
    SVG_DRAWERS[svg as keyof typeof SVG_DRAWERS];
  if (drawer) {
    return drawer(
      x,
      y,
      color,
      rotation
    );
  }

  return null;
}
export function drawSymbol(
  cell: string | null,
  x: number,
  y: number,
  color = "black",
  rotation = 0
) {
  if (!cell) return null;

  const drawer =
    DRAWERS[cell as keyof typeof DRAWERS];

  if (drawer) {
    return drawer(
      x,
      y,
      color,
      rotation
    );
  }

  return null;
}


 
