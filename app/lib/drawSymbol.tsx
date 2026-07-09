import React from "react";
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
} from "./drawCrochetSymbol";

const DRAWERS = {
  O: drawML,
  MC: drawMC,
  X: drawMS,
  DB: drawDB,
  T: drawBR,
  DBR: drawDBR,
  TBR: drawTBR,
  V: drawAUG,
  A: drawDIM,
  RAV: drawReliefavant,
  RAR: drawReliefarriere,
} as const;

export function drawSymbol(
  cell: string | null,
  x: number,
  y: number,
  color = "black",
  rotation = 0
) 

{
  if (!cell) return null;

const drawer = DRAWERS[cell as keyof typeof DRAWERS];
if (drawer) {
  return drawer(
    x,
    y,
    color,
    rotation
  );
}

 