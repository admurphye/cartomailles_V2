import React from "react";

import {
  drawStem,
  drawBar,
  drawHalfBar,
  drawDiagonal,
  drawOpenCircle,
  drawFrontPostArc,

} from "./crochetPrimitives";

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
      {/* Tige */}
      <line
        x1={x + 20}
        y1={y + 8}
        x2={x + 20}
        y2={y + 30}
        stroke={color}
        strokeWidth="2"
      />

      {/* Barre supérieure */}
      <line
        x1={x + 12}
        y1={y + 8}
        x2={x + 28}
        y2={y + 8}
        stroke={color}
        strokeWidth="2"
      />

      {/* Barre de bride */}
      <line
        x1={x + 16}
        y1={y + 18}
        x2={x + 24}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />

      {/* Crochet relief */}
     <path
  d={`
    M ${x + 20} ${y + 22}
    C ${x + 20} ${y + 36},
      ${x + 34} ${y + 36},
      ${x + 34} ${y + 22}
  `}
  fill="none"
  stroke={color}
  strokeWidth="2"
/>
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