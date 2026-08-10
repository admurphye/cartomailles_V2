import React from "react";

//
// ======================================================
// TIGE
// ======================================================
// Utilisée par :
// - Bride
// - Double bride
// - Triple bride
// - Brides relief
//
export function drawStem(
  x: number,
  y: number,
  color: string
) {
  return (
    <line
      x1={x + 20}
      y1={y + 8}
      x2={x + 20}
      y2={y + 36}
      stroke={color}
      strokeWidth="2"
    />
  );
}

//
// ======================================================
// BARRE HORIZONTALE
// ======================================================
// level :
// 1 = Bride
// 2 = Double bride
// 3 = Triple bride
//
export function drawBar(
  x: number,
  y: number,
  color: string,
  level: number
) {

  const yy = y + 8 + (level - 1) * 8;

  return (
    <line
      x1={x + 12}
      y1={yy}
      x2={x + 28}
      y2={yy}
      stroke={color}
      strokeWidth="2"
    />
  );

}

//
// ======================================================
// BARRE DEMI-BRIDE
// ======================================================
// Utilisée uniquement par la demi-bride.
//
export function drawHalfBar(
  x: number,
  y: number,
  color: string
) {
  return (
    <line
      x1={x + 14}
      y1={y + 12}
      x2={x + 26}
      y2={y + 18}
      stroke={color}
      strokeWidth="2"
    />
  );
}

//
// ======================================================
// DIAGONALE DE LA BRIDE
// ======================================================
// Utilisée par :
// - Bride relief avant
// - Bride relief arrière
//
export function drawDiagonal(
  x: number,
  y: number,
  color: string
) {
  return (
    <line
      x1={x + 16}
      y1={y + 20}
      x2={x + 24}
      y2={y + 28}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}
//
// ======================================================
// CERCLE
// ======================================================
// Cercle SVG parfait.
// Servira de base aux boucles des symboles.
//
export function drawCircle(
  x: number,
  y: number,
  color: string,
  radius = 8
) {
  return (
    <circle
      cx={x}
      cy={y}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );
}
//
// ======================================================
// CERCLE OUVERT
// ======================================================
// Cercle incomplet.
// opening = ouverture en degrés.
//
export function drawOpenCircle(
  x: number,
  y: number,
  color: string,
  radius = 8
) {
  return (
    <path
      d={`
        M ${x} ${y - radius}

        A ${radius} ${radius} 0 1 1 ${x - 0.01} ${y - radius}
      `}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="38 12"
    />
  );
}
//
// ======================================================
// ARC RELIEF AVANT
// ======================================================
// À peaufiner jusqu'à obtenir le vrai symbole.
//
export function drawFrontPostArc(
  x: number,
  y: number,
  color: string
) {
  return (
    <path
      d={`
     M ${x + 20} ${y + 36}

      C ${x + 10} ${y + 36},
        ${x + 10} ${y + 48},
        ${x + 20} ${y + 48}
      `}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

//
// ======================================================
// ARC RELIEF ARRIÈRE
// ======================================================
// Même arc que le relief avant,
// mais inversé.
//
export function drawBackPostArc(
  x: number,
  y: number,
  color: string
) {
  return (
    <path
      d={`
        M ${x + 20} ${y + 36}

        C ${x + 30} ${y + 36},
          ${x + 30} ${y + 48},
          ${x + 20} ${y + 48}
      `}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}
//
// ======================================================
// TIGE INCLINÉE GAUCHE
// ======================================================
//
export function drawTigeInclineeGauche(
  x: number,
  y: number,
  color: string
) {
  return (
    <line
      x1={x + 12}
      y1={y + 6}
      x2={x + 24}
      y2={y + 34}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}
//
// ======================================================
// TIGE INCLINÉE DROITE
// ======================================================
//
export function drawTigeInclineeDroite(
  x: number,
  y: number,
  color: string
) {
  return (
    <line
      x1={x + 34}
      y1={y + 6}
      x2={x + 24}
      y2={y + 34}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}
