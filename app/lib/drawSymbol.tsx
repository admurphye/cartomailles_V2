import React from "react";

export function drawSymbol(
  cell: string | null,
  x: number,
  y: number,
  color = "black",
  angle = 0
) {
  if (!cell) return null;

  if (cell === "X") {
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

  if (cell === "T") {
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
          y1={y + 18}
          x2={x + 28}
          y2={y + 18}
          stroke={color}
          strokeWidth="2"
        />
      </>
    );
  }
if (cell === "V") {
  return (
    <>
      <line
        x1={x + 14}
        y1={y + 10}
        x2={x + 14}
        y2={y + 30}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 10}
        y1={y + 18}
        x2={x + 18}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 26}
        y1={y + 10}
        x2={x + 26}
        y2={y + 30}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 22}
        y1={y + 18}
        x2={x + 30}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />
    </>
  );
}
if (cell === "A") {
  return (
    <>
      <line
        x1={x + 12}
        y1={y + 10}
        x2={x + 20}
        y2={y + 30}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 28}
        y1={y + 10}
        x2={x + 20}
        y2={y + 30}
        stroke={color}
        strokeWidth="2"
      />
    </>
  );
}
if (cell === "MC") {
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
if (cell === "DB") {
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
        x1={x + 14}
        y1={y + 18}
        x2={x + 26}
        y2={y + 18}
        stroke={color}
        strokeWidth="2"
      />
    </>
  );
}
if (cell === "TB") {
  return (
    <>
      <line
        x1={x + 20}
        y1={y + 6}
        x2={x + 20}
        y2={y + 34}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 12}
        y1={y + 16}
        x2={x + 28}
        y2={y + 16}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 12}
        y1={y + 22}
        x2={x + 28}
        y2={y + 22}
        stroke={color}
        strokeWidth="2"
      />
    </>
  );
}
  if (cell === "O") {
  return (
    <ellipse
      cx={x + 20}
      cy={y + 20}
      rx={9}
      ry={5}
      fill="none"
      stroke={color}
      strokeWidth="2"
      transform={`rotate(
       ${(angle * 180) / Math.PI + 90}
       ${x + 20}
       ${y + 20}
      )`}
    />
  );
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