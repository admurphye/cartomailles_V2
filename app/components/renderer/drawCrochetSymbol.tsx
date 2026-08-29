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
        x1={x + 14}
        y1={y + 14}
        x2={x + 26}
        y2={y + 26}
        stroke={color}
        strokeWidth="2"
      />

      <line
        x1={x + 26}
        y1={y + 14}
        x2={x + 14}
        y2={y + 26}
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
      rx={4.5}
      ry={2.5}
      fill="none"
      stroke={color}
      strokeWidth="2"
      transform={`rotate(${rotation} ${x + 20} ${y + 20})`}
    />
  );
}

export function drawAugmentationMS(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  const centers = [x + 15, x + 25];

  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      {centers.map((centerX) => (
        <g key={centerX}>
          <line
            x1={centerX - 4}
            y1={y + 16}
            x2={centerX + 4}
            y2={y + 24}
            stroke={color}
            strokeWidth="2"
          />
          <line
            x1={centerX + 4}
            y1={y + 16}
            x2={centerX - 4}
            y2={y + 24}
            stroke={color}
            strokeWidth="2"
          />
        </g>
      ))}
    </g>
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
      rx={6}
      ry={3}
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

export function drawFiveFrontPostDoubleCrochetTogether(
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  const bottomX = x + 20;
  const bottomY = y + 36;
  const topXs = [x - 4, x + 8, x + 20, x + 32, x + 44];

  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      {topXs.map((topX, index) => {
        const topY = y + 5 + Math.abs(index - 2) * 2;
        const dx = bottomX - topX;
        const dy = bottomY - topY;
        const length = Math.hypot(dx, dy);
        const px = (-dy / length) * 5;
        const py = (dx / length) * 5;
        const barX = topX + dx * 0.28;
        const barY = topY + dy * 0.28;

        return (
          <g key={topX}>
            <line x1={topX} y1={topY} x2={bottomX} y2={bottomY} stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1={barX - px} y1={barY - py} x2={barX + px} y2={barY + py} stroke={color} strokeWidth="2" />
            <path
              d={`M ${topX + dx * 0.72} ${topY + dy * 0.72} Q ${topX + dx * 0.72 - 7} ${topY + dy * 0.72 + 5}, ${topX + dx * 0.82} ${topY + dy * 0.82 + 7}`}
              fill="none"
              stroke={color}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <ellipse cx={bottomX} cy={bottomY} rx="3" ry="2" fill={color} />
    </g>
  );
}

function drawTwoStitchesTogether(
  type: "hdc" | "dc" | "dtr" | "tr" | "fpdc" | "bpdc",
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  const barCount = type === "dtr" ? 2 : type === "tr" ? 3 : 1;
  const topX = x + 20;
  const topY = y + 5;

  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      {[x + 8, x + 32].map((bottomX, index) => {
        const bottomY = y + 35;
        const dx = bottomX - topX;
        const dy = bottomY - topY;
        const length = Math.hypot(dx, dy);
        const px = (-dy / length) * 5;
        const py = (dx / length) * 5;
        return <g key={bottomX}>
          <line x1={topX} y1={topY} x2={bottomX} y2={bottomY} stroke={color} strokeWidth="2" strokeLinecap="round" />
          {Array.from({ length: barCount }, (_, barIndex) => {
            const progress = type === "hdc" ? 0.35 : 0.25 + barIndex * 0.18;
            const cx = topX + dx * progress;
            const cy = topY + dy * progress;
            return <line key={barIndex} x1={cx - px} y1={cy - py} x2={cx + px} y2={cy + py} stroke={color} strokeWidth="2" />;
          })}
          {(type === "fpdc" || type === "bpdc") && <path d={`M ${topX + dx * 0.7} ${topY + dy * 0.7} Q ${topX + dx * 0.7 + (type === "fpdc" ? -7 : 7)} ${topY + dy * 0.7 + 4}, ${topX + dx * 0.82} ${topY + dy * 0.82 + 7}`} fill="none" stroke={color} strokeWidth="1.7" />}
          {index === 0 && <ellipse cx={topX} cy={topY} rx="3" ry="2" fill={color} />}
        </g>;
      })}
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

function drawMaillesDansLaMemeMaille(
  type: "sc" | "hdc" | "dc" | "dtr" | "tr",
  count: number,
  x: number,
  y: number,
  color: string,
  rotation = 0
) {
  const baseX = x + 20;
  const baseY = y + 35;
  const spread = Math.min(36, 16 + (count - 2) * 5);
  const barCount = type === "dc" ? 1 : type === "dtr" ? 2 : type === "tr" ? 3 : 0;

  return (
    <g transform={`rotate(${rotation} ${x + 20} ${y + 20})`}>
      {Array.from({ length: count }, (_, index) => {
        const progress = count === 1 ? 0.5 : index / (count - 1);
        const topX = baseX - spread / 2 + spread * progress;
        const topY = y + 5 + Math.abs(progress - 0.5) * 4;
        const dx = baseX - topX;
        const dy = baseY - topY;
        const length = Math.hypot(dx, dy);
        const perpendicularX = (-dy / length) * 5;
        const perpendicularY = (dx / length) * 5;

        if (type === "sc") {
          const crossX = topX + dx * 0.22;
          const crossY = topY + dy * 0.22;
          return (
            <g key={index}>
              <line x1={topX} y1={topY} x2={baseX} y2={baseY} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <line x1={crossX - 5} y1={crossY - 5} x2={crossX + 5} y2={crossY + 5} stroke={color} strokeWidth="2" />
              <line x1={crossX + 5} y1={crossY - 5} x2={crossX - 5} y2={crossY + 5} stroke={color} strokeWidth="2" />
            </g>
          );
        }

        return (
          <g key={index}>
            <line x1={topX} y1={topY} x2={baseX} y2={baseY} stroke={color} strokeWidth="2" strokeLinecap="round" />
            {type === "hdc" && (
              <line
                x1={topX + dx * 0.25 - perpendicularX * 0.7}
                y1={topY + dy * 0.25 - perpendicularY * 0.7}
                x2={topX + dx * 0.25 + perpendicularX * 0.7}
                y2={topY + dy * 0.25 + perpendicularY * 0.7}
                stroke={color}
                strokeWidth="2"
              />
            )}
            {Array.from({ length: barCount }, (_, barIndex) => {
              const barProgress = 0.16 + barIndex * 0.2;
              const barX = topX + dx * barProgress;
              const barY = topY + dy * barProgress;
              return (
                <line
                  key={barIndex}
                  x1={barX - perpendicularX}
                  y1={barY - perpendicularY}
                  x2={barX + perpendicularX}
                  y2={barY + perpendicularY}
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

  if (type === "fpdc" && operation === "decrease" && groupSize === 5) {
    return drawFiveFrontPostDoubleCrochetTogether(x - 20, y - 20, color, rotation);
  }

  if (type === "sc" && operation === "decrease" && groupSize === 2) {
    return drawDIM(x - 20, y - 20, color, rotation);
  }

  if (["hdc", "dc", "dtr", "tr", "fpdc", "bpdc"].includes(type) && operation === "decrease" && groupSize === 2) {
    return drawTwoStitchesTogether(type as "hdc" | "dc" | "dtr" | "tr" | "fpdc" | "bpdc", x - 20, y - 20, color, rotation);
  }

  if (type === "dc" && operation === "increase" && [5, 6, 9].includes(groupSize)) {
    return drawEventailBrides(x - 20, y - 20, color, groupSize, rotation);
  }

  if (type === "dc" && operation === "increase" && groupSize === 3) {
    return drawTroisBridesEnsemble(x - 20, y - 20, color, rotation);
  }

  if (["hdc", "dtr", "tr"].includes(type) && operation === "decrease" && groupSize === 3) {
    return drawTroisMaillesEnsemble(type as "hdc" | "dtr" | "tr", x - 20, y - 20, color, rotation);
  }

  if (type === "dc" && operation === "increase" && groupSize === 2) {
    return drawDeuxBridesEnsemble(x - 20, y - 20, color, rotation);
  }

  if (type === "sc" && operation === "increase" && groupSize === 2) {
    return drawAugmentationMS(x - 20, y - 20, color, rotation);
  }

  if (["sc", "hdc", "dc", "dtr", "tr"].includes(type) && operation === "increase" && groupSize >= 2) {
    return drawMaillesDansLaMemeMaille(
      type as "sc" | "hdc" | "dc" | "dtr" | "tr",
      groupSize,
      x - 20,
      y - 20,
      color,
      rotation
    );
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
