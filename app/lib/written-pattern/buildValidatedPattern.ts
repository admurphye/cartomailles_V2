import { isWrittenPatternReady } from "./model";
import type { WrittenPatternDocument } from "./types";

/**
 * Assemble l'entrée finale du moteur sans la réinterpréter. Une valeur n'est
 * produite qu'après validation humaine de tous les rangs.
 */
export function buildValidatedCartomaillesPattern(
  document: WrittenPatternDocument
): string | null {
  if (!isWrittenPatternReady(document)) return null;

  return document.rows
    .map((row) => row.cartomaillesText.trim())
    .join("\n");
}

