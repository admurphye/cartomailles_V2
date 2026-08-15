import React from "react";
import { StitchType } from "@/app/lib/engine/model/Stitch";
import { SYMBOL_REGISTRY } from "./symbolRegistry";
import { InstructionOperation } from "@/app/lib/engine/model/Instruction";
import {
  drawStem,
  drawBar,
  drawHalfBar,
  drawFrontPostArc,
  drawBackPostArc,
  drawTigeInclineeGauche,
  drawTigeInclineeDroite
 
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
  color: string,
  rotation = 0
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
      transform={`rotate(${rotation} ${x + 20} ${y + 20})`}
    />
  );
}

export function drawMC(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <ellipse
      cx={x + 20}
      cy={y + 20}
      rx={8}
      ry={4}
      fill={color}
      transform={`rotate(${rotation} ${x + 20} ${y + 20})`}
    />
  );
}

export function drawMR(
  x: number,
  y: number,
  color: string
) {
  return (
    <circle
      cx={x + 20}
      cy={y + 20}
      r={10}
      fill="none"
      stroke={color}
      strokeWidth="2"
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

      {drawTigeInclineeGauche(x, y, color)}
      {drawTigeInclineeDroite(x, y, color)}

      <line x1={x + 8} y1={y + 15} x2={x + 22} y2={y + 9} stroke={color} strokeWidth="2" />
      <line x1={x + 26} y1={y + 9} x2={x + 39} y2={y + 15} stroke={color} strokeWidth="2" />

    </g>
  );
}

export function drawTroisBridesEnsemble(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      <line x1={x + 5} y1={y + 6} x2={x + 24} y2={y + 34} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1={x + 24} y1={y + 5} x2={x + 24} y2={y + 34} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1={x + 43} y1={y + 6} x2={x + 24} y2={y + 34} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1={x + 2} y1={y + 14} x2={x + 15} y2={y + 6} stroke={color} strokeWidth="2" />
      <line x1={x + 17} y1={y + 11} x2={x + 31} y2={y + 11} stroke={color} strokeWidth="2" />
      <line x1={x + 33} y1={y + 6} x2={x + 46} y2={y + 14} stroke={color} strokeWidth="2" />
    </g>
  );
}

function drawTroisMaillesEnsemble(
  type: "hdc" | "dtr" | "tr",
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  const barCount = type === "dtr" ? 2 : type === "tr" ? 3 : 1;
  const stems = [
    { topX: x + 5, topY: y + 6 },
    { topX: x + 24, topY: y + 5 },
    { topX: x + 43, topY: y + 6 },
  ];

  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      {stems.map(({ topX, topY }, stemIndex) => {
        const bottomX = x + 24;
        const bottomY = y + 34;
        const dx = bottomX - topX;
        const dy = bottomY - topY;
        const length = Math.hypot(dx, dy);
        const perpendicularX = (-dy / length) * (type === "hdc" ? 4 : 6);
        const perpendicularY = (dx / length) * (type === "hdc" ? 4 : 6);

        return (
          <g key={stemIndex}>
            <line x1={topX} y1={topY} x2={bottomX} y2={bottomY} stroke={color} strokeWidth="2" strokeLinecap="round" />
            {Array.from({ length: barCount }, (_, barIndex) => {
              const progress = type === "hdc" ? 0.28 : 0.2 + barIndex * 0.19;
              const centerX = topX + dx * progress;
              const centerY = topY + dy * progress;
              return (
                <line
                  key={barIndex}
                  x1={centerX - perpendicularX}
                  y1={centerY - perpendicularY}
                  x2={centerX + perpendicularX}
                  y2={centerY + perpendicularY}
                  stroke={color}
                  strokeWidth="2"
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

export function drawEventailBrides(
  x: number,
  y: number,
  color: string,
  count: number,
  rotation = 0
) {
  const baseX = x + 20;
  const baseY = y + 35;
  const radius = count === 9 ? 34 : 30;
  const spread = count === 9 ? Math.PI * 0.8 : Math.PI * 0.68;

  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      {Array.from({ length: count }, (_, index) => {
        const progress = count === 1 ? 0.5 : index / (count - 1);
        const angle = -spread / 2 + progress * spread;
        const endX = baseX + Math.sin(angle) * radius;
        const endY = baseY - Math.cos(angle) * radius;
        const barCenterX = baseX + (endX - baseX) * 0.72;
        const barCenterY = baseY + (endY - baseY) * 0.72;
        const barHalfLength = 5;
        const perpendicularX = Math.cos(angle) * barHalfLength;
        const perpendicularY = Math.sin(angle) * barHalfLength;

        return (
          <g key={index}>
            <line x1={baseX} y1={baseY} x2={endX} y2={endY} stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line
              x1={barCenterX - perpendicularX}
              y1={barCenterY - perpendicularY}
              x2={barCenterX + perpendicularX}
              y2={barCenterY + perpendicularY}
              stroke={color}
              strokeWidth="2"
            />
          </g>
        );
      })}
    </g>
  );
}

export function drawPopcorn(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  const centerX = x + 20;
  const topY = y + 5;
  const bottomY = y + 35;
  const curves = [-14, -8, 0, 8, 14];

  return (
    <g transform={`rotate(${rotation} ${centerX} ${y + 20})`}>
      {curves.map((spread, index) => {
        const barY = y + 13;
        const barCenterX = centerX + spread * 0.68;

        return (
          <g key={spread}>
            <path
              d={`M ${centerX} ${bottomY} C ${centerX + spread} ${y + 29}, ${centerX + spread} ${y + 11}, ${centerX} ${topY}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={barCenterX - 4}
              y1={barY + (index - 2) * 0.7}
              x2={barCenterX + 4}
              y2={barY - (index - 2) * 0.7}
              stroke={color}
              strokeWidth="2"
            />
          </g>
        );
      })}
      <ellipse cx={centerX} cy={topY} rx="3" ry="2" fill={color} />
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


export function drawCrochetSymbol(
  type: StitchType,
  operation: InstructionOperation,
  x: number,
  y: number,
  color = "black",
  rotation = 0,
  groupSize = 1
) {

  if (type === "dc" && operation === "increase" && [5, 6, 9].includes(groupSize)) {
    return drawEventailBrides(x - 20, y - 20, color, groupSize, rotation);
  }

  if (type === "dc" && operation === "increase" && groupSize === 3) {
    return drawTroisBridesEnsemble(x - 20, y - 20, color, rotation);
  }

  if (["hdc", "dtr", "tr"].includes(type) && operation === "decrease" && groupSize === 3) {
    return drawTroisMaillesEnsemble(type as "hdc" | "dtr" | "tr", x - 20, y - 20, color, rotation);
  }

  if (type === "dc" && operation === "increase") {
    return drawDeuxBridesEnsemble(x - 20, y - 20, color, rotation);
  }

   switch (SYMBOL_REGISTRY[type]) {
    case "MR":
      return drawMR(x - 20, y - 20, color);

    case "MS":
      return drawMS(x - 20, y - 20, color);

    case "ML":
      return drawML(x - 20, y - 20, color, rotation);

    case "MC":
      return drawMC(x - 20, y - 20, color, rotation);

    case "DB":
      return drawDB(x - 20, y - 20, color, rotation);

    case "BR":
      return drawBR(x - 20, y - 20, color, rotation);

    case "DBR":
      return drawDBR(x - 20, y - 20, color, rotation);

    case "BRAV":
      return drawReliefavant(x - 20, y - 20, color, rotation);

    case "BRAR":
      return drawReliefarriere(x - 20, y - 20, color, rotation);

    case "POPCORN":
      return drawPopcorn(x - 20, y - 20, color, rotation);

    case "TBR":
      return drawTBR(x - 20, y - 20, color, rotation);

    default:
      return null;
  }
}
