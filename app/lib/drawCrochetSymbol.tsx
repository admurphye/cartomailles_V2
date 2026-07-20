import React from "react";

import {
  drawStem,
  drawBar,
  drawHalfBar,
  drawDiagonal,
  drawFrontPostArc,
  drawBackPostArc,
  drawTigeInclineeGauche,
  drawTigeInclineeDroite
 
} from "./crochetPrimitives";
console.log("drawCrochetSymbol chargé");
export function drawMS(
  x: number,
  y: number,
  color: string
) {
  return (
    <>
      <line
        x1={x + 12}
        y1={y + 12}
        x2={x + 28}
        y2={y + 28}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 28}
        y1={y + 12}
        x2={x + 12}
        y2={y + 28}
        stroke={color}
        strokeWidth="2"
      />
    </>
  );
}

export function drawML(
  x: number,
  y: number,
  color: string
) {
  return (
    <ellipse
      cx={x + 20}
      cy={y + 20}
      rx={9}
      ry={5}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
}

export function drawMC(
  x: number,
  y: number,
  color: string
) {
  return (
    <ellipse
      cx={x + 20}
      cy={y + 20}
      rx={8}
      ry={4}
      fill={color}
    />
  );
}

export function drawDB(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      {drawStem(x, y, color)}

      {drawHalfBar(x, y, color)}
    </g>
  );
}
export function drawBR(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      {drawStem(x, y, color)}

      {drawBar(x, y, color, 1)}

    </g>
  );
}

export function drawDBR(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      {drawStem(x, y, color)}

      {drawBar(x, y, color, 1)}

      {drawBar(x, y, color, 2)}
    </g>
  );
}
export function drawTBR(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      {drawStem(x, y, color)}

      {drawBar(x, y, color, 1)}

      {drawBar(x, y, color, 2)}

      {drawBar(x, y, color, 3)}
    </g>
  );
}

export function drawAUG(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      <line
        x1={x + 12}
        y1={y + 28}
        x2={x + 20}
        y2={y + 10}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 28}
        y1={y + 28}
        x2={x + 20}
        y2={y + 10}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 17}
        y1={y + 16}
        x2={x + 23}
        y2={y + 22}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 23}
        y1={y + 16}
        x2={x + 17}
        y2={y + 22}
        stroke={color}
        strokeWidth="2"
      />
    </g>
  );
}
export function drawReliefavant(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      {drawStem(x, y, color)}

      {drawBar(x, y, color, 1)}

      {drawDiagonal(x, y, color)}

      {drawFrontPostArc(x, y, color)}
    </g>
  );
}
export function drawReliefarriere(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      {drawStem(x, y, color)}

      {drawBar(x, y, color, 1)}

      {drawDiagonal(x, y, color)}

      {drawBackPostArc(x, y, color)}
    </g>
  );
}
//
// ======================================================
// DEUX BRIDES ENSEMBLE
// ======================================================
//
export function drawDeuxBridesEnsemble(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>

      {/* Les deux tiges */}
      {drawTigeInclineeGauche(x, y, color)}
      {drawTigeInclineeDroite(x, y, color)}

      {/* Puis les deux barres */}
      {drawBar(x - 6, y - 2, color, 1)}
      {drawBar(x + 12, y - 2, color, 1)}

    </g>
  );
}

export function drawDIM(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g
      transform={`
        rotate(
          ${rotation}
          ${x + 20}
          ${y + 20}
        )
      `}
    >
      <line
        x1={x + 12}
        y1={y + 10}
        x2={x + 20}
        y2={y + 28}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 28}
        y1={y + 10}
        x2={x + 20}
        y2={y + 28}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 17}
        y1={y + 16}
        x2={x + 23}
        y2={y + 22}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 23}
        y1={y + 16}
        x2={x + 17}
        y2={y + 22}
        stroke={color}
        strokeWidth="2"
      />
    </g>
  );
}
