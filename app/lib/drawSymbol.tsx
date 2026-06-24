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
} from "./drawCrochetSymbol";

export function drawSymbol(
  cell: string | null,
  x: number,
  y: number,
  color = "black",
  angle = 0
) {
  if (!cell) return null;

  if (cell === "X") {
  return drawMS(x, y, color);
}

 if (cell === "T") {
  return drawBR(x, y, color);
}
if (cell === "V") {
  return drawAUG(x, y, color);
}
if (cell === "A") {
  return drawDIM(x, y, color);
}
if (cell === "MC") {
  return drawMC(x, y, color);
}
if (cell === "DB") {
  return drawDB(x, y, color);
}
if (cell === "DBR") {
  return drawDBR(x, y, color);
}

if (cell === "TBR") {
  return drawTBR(x, y, color);
}
  if (cell === "O") {
  return drawML(x, y, color);
}
  return (
    <text
      x={x + 20}
      y={y + 25}
      textAnchor="middle"
      fontSize="24"
      fontWeight="bold"
    >
      {cell}
    </text>
  );
}
