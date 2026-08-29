import { Token } from "../model/Token";
import { Instruction } from "../model/Instruction";
import { parseExpression } from "./parseExpression";
import { ParseIssue } from "../model/ParseIssue";

export function parseTokens(tokens: Token[]): {
  instructions: Instruction[];
  issues: ParseIssue[];
} {
  const instructions: Instruction[] = [];
  const issues: ParseIssue[] = [];

  let currentRound = 1;

  for (let i = 0; i < tokens.length; i++) {
    const value = tokens[i].value.toLowerCase();
  if (value === "eol") {
      currentRound++;
      continue;
    }

    if (value === ",") {
      continue;
    }
    // Détection d'un rang : R1, R2...
    const roundMatch = value.match(/^r(\d+)$/);

    if (roundMatch) {
      currentRound = Number(roundMatch[1]);
      continue;
    }

   let count = Number(value);
let stitchToken: string | undefined;

if (Number.isNaN(count)) {

  // Cas : aug(ms), ms, db...
  count = 1;
  stitchToken = value;

} else {

  // Cas : 6 ms
  stitchToken = tokens[i + 1]?.value;

  // On saute le token de la maille
  i++;

}

if (!stitchToken) {
  issues.push({
    round: currentRound,
    message: `Maille attendue après « ${value} »`,
  });
  continue;
}

const parsed = parseExpression(stitchToken);

if (!parsed) {
  issues.push({
    round: currentRound,
    message: stitchToken === "conditional_repeat"
      ? "Répétition conditionnelle liée à une maille marquée : vérification manuelle nécessaire"
      : `Symbole non reconnu : « ${stitchToken} »`,
  });
  continue;
}
if (!stitchToken) {
  continue;
}

    instructions.push({
  type: parsed.type,
  count,
  consumes: parsed.consumes,
  produces: parsed.produces,
  role: parsed.role ?? (parsed.type === "mr" ? "magicRing" : "normal"),
  // Le cercle magique est un support de départ rendu dans le diagramme,
  // mais il ne constitue jamais une maille crochetée.
  countsAsStitch: parsed.type !== "mr",
  round: currentRound,
  operation: parsed.operation,
  target: parsed.target,
});
  }

  const firstRound = Math.min(
    ...instructions.map((instruction) => instruction.round)
  );

  const instructionsByRound = new Map<number, Instruction[]>();

  instructions.forEach((instruction) => {
    const round = instructionsByRound.get(instruction.round) ?? [];
    round.push(instruction);
    instructionsByRound.set(instruction.round, round);
  });

  instructionsByRound.forEach((roundInstructions, roundNumber) => {
    const isFoundationChain =
      roundNumber === firstRound &&
      roundInstructions.length > 0 &&
      roundInstructions.every((instruction) => instruction.type === "ch");

    let isLeadingChain = roundNumber > firstRound;

    roundInstructions.forEach((instruction, index) => {
      if (instruction.type !== "ch") {
        isLeadingChain = false;
        return;
      }

      if (isFoundationChain) {
        instruction.role = "foundationChain";
        return;
      }

      if (isLeadingChain) {
        instruction.role = "turningChain";
        // Une seule instruction peut constituer la chaîne de début. Une
        // seconde séquence de ML appartient déjà au motif du rang (arceau),
        // même si aucune maille travaillée n'a encore été rencontrée.
        isLeadingChain = false;
        return;
      }

      instruction.role =
        index > 0 && index < roundInstructions.length - 1
          ? "chainSpace"
          : "freeChain";
    });
  });

  return { instructions, issues };
}
