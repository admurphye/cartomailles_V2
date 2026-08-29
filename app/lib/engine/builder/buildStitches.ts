import { CrochetPattern } from "../model/CrochetPattern";
import { Stitch } from "../model/Stitch";

export function buildStitches(pattern: CrochetPattern): Stitch[] {

  const stitches: Stitch[] = [];

  let id = 1;

  for (const round of pattern.rounds) {

    let order = 1;

    for (const instruction of round.instructions) {

      for (let i = 0; i < instruction.count; i++) {

        for (let j = 0; j < instruction.produces; j++) {

         stitches.push({
  id: String(id++),

  type: instruction.type,

  // Une cible d'arceau regroupe plusieurs brides par leur parent commun,
  // mais chaque bride reste un symbole simple dans le rendu.
  operation: instruction.role === "chainSpaceTarget"
    ? "normal"
    : instruction.operation,
  groupSize: Math.max(instruction.consumes, instruction.produces),
  role: instruction.role,
  // Une chaînette tournante remplace une seule maille, quelle que soit sa
  // hauteur : seule sa dernière ml compte comme maille du nouveau rang.
  countsAsStitch: instruction.role === "turningChain"
    ? instruction.countsAsStitch &&
      i === instruction.count - 1 && j === instruction.produces - 1
    : instruction.countsAsStitch,

  round: round.number,

  order: order++,

  x: 0,
  y: 0,

  parents: [],
  children: [],

  selected: false,
  locked: false,
});

        }

      }

    }

  }

  return stitches;
}
