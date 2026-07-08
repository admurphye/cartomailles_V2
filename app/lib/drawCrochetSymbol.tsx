import React from "react";

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
  color: string
) {
  return (
    <>
      <line
        x1={x + 20}
        y1={y + 8}
        x2={x + 20}
        y2={y + 32}
        stroke={color}
        strokeWidth="2"
      />
      <line
        x1={x + 12}
        y1={y + 8}
        x2={x + 28}
        y2={y + 8}
        stroke={color}
        strokeWidth="2"
      />
    </>
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
      <line
        x1={x + 20}
        y1={y + 8}
        x2={x + 20}
        y2={y + 32}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 12}
        y1={y + 8}
        x2={x + 28}
        y2={y + 8}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 16}
        y1={y + 18}
        x2={x + 24}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />
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
      <line
        x1={x + 20}
        y1={y + 8}
        x2={x + 20}
        y2={y + 32}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 12}
        y1={y + 8}
        x2={x + 28}
        y2={y + 8}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 16}
        y1={y + 18}
        x2={x + 24}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 16}
        y1={y + 24}
        x2={x + 24}
        y2={y + 24}
        stroke={color}
        strokeWidth="2"
      />
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
      <line
        x1={x + 20}
        y1={y + 8}
        x2={x + 20}
        y2={y + 32}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 12}
        y1={y + 8}
        x2={x + 28}
        y2={y + 8}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 16}
        y1={y + 18}
        x2={x + 24}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 16}
        y1={y + 24}
        x2={x + 24}
        y2={y + 24}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 16}
        y1={y + 30}
        x2={x + 24}
        y2={y + 30}
        stroke={color}
        strokeWidth="2"
      />
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