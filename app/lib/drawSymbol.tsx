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

export function drawSymbol(
  cell: string | null,
  x: number,
  y: number,
  color = "black",
  rotation = 0
) {
  if (!cell) return null;

  if (cell === "X") {
    return drawMS(x, y, color);
  }

  if (cell === "T") {
    return drawBR(x, y, color, rotation);
  }

  if (cell === "V") {
    return drawAUG(x, y, color, rotation);
  }

  if (cell === "A") {
    return drawDIM(x, y, color, rotation);
  }

  if (cell === "MC") {
    return drawMC(x, y, color);
  }

  if (cell === "DB") {
    return drawDB(x, y, color, rotation);
  }

  if (cell === "DBR") {
    return drawDBR(x, y, color, rotation);
  }

  if (cell === "TBR") {
    return drawTBR(x, y, color, rotation);
  }

  if (cell === "O") {
    return drawML(x, y, color);
  }
  if (cell === "RAV") {
  return drawReliefavant(x,y,color,rotation);
}

if (cell === "RAR") {
  return drawReliefarriere(x,y,color,rotation);
}

  return (
    <text
      x={x + 20}
      y={y + 25}
      textAnchor="middle"
      fontSize="24"
      fontWeight="bold"
      fill={color}
    >
      {cell}
    </text>
  );
}