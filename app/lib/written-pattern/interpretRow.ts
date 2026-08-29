import type {
  WrittenPatternDocument,
  WrittenPatternInterpretationItem,
  WrittenPatternIssue,
  WrittenPatternRow,
} from "./types";
import { normalizeWrittenPatternText } from "./normalizeWrittenPatternText";
import { parsePattern } from "../engine/parser/parsePattern";

const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
};

type StitchVocabulary = {
  code: string;
  singular: string;
  plural: string;
  pattern: string;
};

const STITCHES: StitchVocabulary[] = [
  { code: "dbr", singular: "double bride", plural: "doubles brides", pattern: "(?:dbr|doubles?\\s+brides?)" },
  { code: "tb", singular: "triple bride", plural: "triples brides", pattern: "(?:tb|tbr|triples?\\s+brides?)" },
  { code: "db", singular: "demi-bride", plural: "demi-brides", pattern: "(?:db|demi[-\\s]?brides?)" },
  { code: "br", singular: "bride", plural: "brides", pattern: "(?:br|brides?)" },
  { code: "ms", singular: "maille serrée", plural: "mailles serrées", pattern: "(?:ms|mailles?\\s+serr[ée]es?)" },
  { code: "mc", singular: "maille coulée", plural: "mailles coulées", pattern: "(?:mc|mailles?\\s+coul[ée]es?)" },
  { code: "ml", singular: "maille en l'air", plural: "mailles en l'air", pattern: "(?:ml|mailles?\\s+en\\s+l['’]air)" },
];

const NUMBER = "(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)";

function numberValue(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : WORD_NUMBERS[value.toLowerCase()];
}

function quantityLabel(count: number, stitch: StitchVocabulary): string {
  return `${count} ${count === 1 ? stitch.singular : stitch.plural}`;
}

function item(
  id: string,
  kind: WrittenPatternInterpretationItem["kind"],
  sourceText: string,
  description: string,
  cartomaillesText?: string,
  issues: WrittenPatternIssue[] = []
): WrittenPatternInterpretationItem {
  return { id, kind, sourceText, description, cartomaillesText, issues };
}

function interpretSegment(
  sourceText: string,
  id: string,
  isFirst: boolean,
  inheritedStitch?: StitchVocabulary,
  previousChainSpaces: number[] = []
): WrittenPatternInterpretationItem {
  const normalized = sourceText.trim().replace(/^puis\s+/i, "");

  const inferredDecrease = normalized.match(
    /^(?:crocheter|crochetez|faire|faites|travailler|travaillez)\s+les\s+(\d+|deux)\s+mailles\s+suivantes\s+ensemble$/i
  );
  if (inferredDecrease) {
    if (!inheritedStitch) {
      return item(
        id,
        "unresolved",
        sourceText,
        "Type de maille manquant pour la diminution",
        undefined,
        [{
          code: "missing-decrease-stitch-type",
          message: "Type de maille manquant pour la diminution.",
          severity: "error",
        }]
      );
    }
    if (numberValue(inferredDecrease[1]) !== 2) {
      return item(
        id,
        "unresolved",
        sourceText,
        "Seules deux mailles ensemble sont actuellement prises en charge",
        undefined,
        [{
          code: "unsupported-decrease-parent-count",
          message: "La diminution doit indiquer exactement deux mailles ensemble.",
          severity: "error",
        }]
      );
    }
    return item(
      id,
      "stitch",
      sourceText,
      `Diminution de ${inheritedStitch.plural} héritée du motif`,
      `1 dim(${inheritedStitch.code})`
    );
  }

  if (/^(?:un\s+)?cercle\s+magique$/i.test(normalized)) {
    return item(
      id,
      "stitch",
      sourceText,
      "Cercle magique",
      "1 mr"
    );
  }

  const skip = normalized.match(new RegExp(`^(?:sauter|sautez?)\\s+${NUMBER}\\s+mailles?$`, "i"));
  if (skip) {
    const count = numberValue(skip[1]);
    return item(
      id,
      "skip",
      sourceText,
      `${count} ${count === 1 ? "maille sautée" : "mailles sautées"}`,
      `${count} skip`
    );
  }

  for (const stitch of STITCHES) {
    const chainSpaceTarget = normalized.match(new RegExp(
      `^${NUMBER}\\s+${stitch.pattern}\\s+(?:dans|sous)\\s+(chaque|l['’]arceau\\s+suivant|le\\s+prochain\\s+arceau)\\s*(?:arceau|espace)?(?:\\s+de\\s+${NUMBER}\\s+(?:ml|mailles?\\s+en\\s+l['’]air))?(?:\\s+du\\s+rang\\s+pr[ée]c[ée]dent)?$`,
      "i"
    ));
    if (chainSpaceTarget) {
      const stitchesPerSpace = numberValue(chainSpaceTarget[1]);
      const everySpace = /^chaque$/i.test(chainSpaceTarget[2]);
      const requestedChainCount = chainSpaceTarget[3]
        ? numberValue(chainSpaceTarget[3])
        : undefined;
      const matchingSpaces = previousChainSpaces.filter((count) =>
        requestedChainCount === undefined || count === requestedChainCount
      );
      const targetCount = everySpace ? matchingSpaces.length : Math.min(1, matchingSpaces.length);
      const issues: WrittenPatternIssue[] = targetCount > 0 ? [] : [{
        code: "missing-chain-space-target",
        message: requestedChainCount === undefined
          ? "Aucun arceau disponible dans le rang précédent."
          : `Aucun arceau de ${requestedChainCount} mailles en l'air trouvé dans le rang précédent.`,
        severity: "error",
      }];
      return item(
        id,
        "stitch",
        sourceText,
        `${stitchesPerSpace} ${stitch.plural} dans ${everySpace ? "chaque" : "le prochain"} arceau`,
        targetCount > 0
          ? `${targetCount} arch_${stitchesPerSpace}_${stitch.code}_${requestedChainCount ?? "any"}`
          : undefined,
        issues
      );
    }

    const explicitDecrease = normalized.match(new RegExp(
      `^${NUMBER}\\s+${stitch.pattern}\\s+ensemble$`,
      "i"
    ));
    if (explicitDecrease && numberValue(explicitDecrease[1]) === 2) {
      return item(
        id,
        "stitch",
        sourceText,
        `Diminution de ${stitch.plural}`,
        `1 dim(${stitch.code})`
      );
    }

    const consecutiveParents = normalized.match(new RegExp(
      `^${NUMBER}\\s+${stitch.pattern}\\s+dans\\s+(?:chacune\\s+des\\s+|les\\s+)${NUMBER}\\s+mailles\\s+suivantes$`,
      "i"
    ));
    if (consecutiveParents) {
      const stitchesPerParent = numberValue(consecutiveParents[1]);
      const parentCount = numberValue(consecutiveParents[2]);
      const notation = stitchesPerParent === 1
        ? `${parentCount} ${stitch.code}`
        : stitchesPerParent === 2
          ? `${parentCount} aug(${stitch.code})`
          : `${parentCount} same_${stitchesPerParent}_${stitch.code}`;
      return item(
        id,
        "stitch",
        sourceText,
        `${quantityLabel(stitchesPerParent, stitch)} dans chacune des ${parentCount} mailles parentes suivantes`,
        notation
      );
    }

    const nextParent = normalized.match(new RegExp(
      `^${NUMBER}\\s+${stitch.pattern}\\s+dans\\s+la\\s+maille\\s+suivante$`,
      "i"
    ));
    if (nextParent) {
      const count = numberValue(nextParent[1]);
      const notation = count === 1
        ? `1 ${stitch.code}`
        : count === 2
          ? `1 aug(${stitch.code})`
          : `1 same_${count}_${stitch.code}`;
      return item(
        id,
        "stitch",
        sourceText,
        `${quantityLabel(count, stitch)} dans la maille parente suivante`,
        notation
      );
    }

    const sameParent = normalized.match(new RegExp(
      `^${NUMBER}\\s+${stitch.pattern}\\s+dans\\s+la\\s+m[êe]me\\s+maille$`,
      "i"
    ));
    if (sameParent) {
      const count = numberValue(sameParent[1]);
      const notation = count === 2
        ? `1 aug(${stitch.code})`
        : `1 same_${count}_${stitch.code}`;
      return item(
        id,
        "stitch",
        sourceText,
        `${quantityLabel(count, stitch)} ayant la même maille parente`,
        notation
      );
    }
  }

  const operation = normalized.match(/^(aug|augmentation|dim|diminution)\s*\(?\s*([a-z]+)\s*\)?$/i);
  if (operation) {
    const operationName = /^aug/i.test(operation[1]) ? "aug" : "dim";
    const stitch = STITCHES.find(({ code }) => code === operation[2].toLowerCase());
    if (stitch) {
      return item(
        id,
        "stitch",
        sourceText,
        `${operationName === "aug" ? "Augmentation" : "Diminution"} de ${stitch.plural}`,
        `1 ${operationName}(${stitch.code})`
      );
    }
  }

  for (const stitch of STITCHES) {
    const simple = normalized.match(new RegExp(`^${NUMBER}\\s+${stitch.pattern}$`, "i"));
    if (simple) {
      const count = numberValue(simple[1]);
      const role = stitch.code === "ml"
        ? isFirst
          ? " de début de rang"
          : " formant un arceau"
        : "";
      return item(
        id,
        "stitch",
        sourceText,
        `${quantityLabel(count, stitch)}${role}`,
        `${count} ${stitch.code}`
      );
    }
  }

  const issue: WrittenPatternIssue = {
    code: "unresolved-instruction",
    message: `Instruction non comprise : « ${sourceText.trim()} »`,
    severity: "error",
  };
  return item(
    id,
    "unresolved",
    sourceText,
    "Instruction non comprise — correction manuelle nécessaire",
    undefined,
    [issue]
  );
}

function extractRepeat(sourceText: string): {
  instructionText: string;
  repeatSource?: string;
  repeatCount?: number;
} {
  const match = sourceText.match(/(?:\.\s*)?\b(r[ée]p[ée]ter\s+(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+fois)\s*\.?\s*$/i);
  if (!match || match.index === undefined) return { instructionText: sourceText };
  const instructionText = sourceText
    .slice(0, match.index)
    .trim()
    .replace(/^\*([\s\S]+)\*$/, "$1")
    .trim();
  return {
    instructionText,
    repeatSource: match[1],
    repeatCount: numberValue(match[2]),
  };
}

function extractProtectedRepeat(sourceText: string): {
  prefix: string;
  content: string;
  repeatSource: string;
  repeatMode: "count" | "untilEnd";
  repeatCount?: number;
} | null {
  const match = sourceText.match(
    /^\s*(?:(?:crocheter|crochetez)\s+)?(?:\*([^*]+)\*|\(([^()]*)\))\s*,?\s*(?:[àa]\s+)?(r[ée]p[ée](?:ter|tez)\s+(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+fois)\s*\.?\s*$/i
  );
  if (match) {
    return {
      prefix: "",
      content: (match[1] ?? match[2]).trim(),
      repeatSource: match[3],
      repeatMode: "count",
      repeatCount: numberValue(match[4]),
    };
  }

  const untilEnd = sourceText.match(
    /^\s*(.*?)\s*(?:,?\s*(?:puis\s+)?r[ée]p[ée](?:ter|tez)\s+)?\*([^*]+)\*\s*,?\s*(?:(?:r[ée]p[ée](?:ter|tez)|continuer\s+ainsi)\s+)?jusqu['’]\s*[àa]\s+la\s+fin(?:\s+du\s+(?:rang|tour))?\s*\.?\s*$/i
  );
  if (!untilEnd) return null;

  return {
    prefix: untilEnd[1].replace(/[,;\s]+$/, "").trim(),
    content: untilEnd[2].trim(),
    repeatSource: sourceText.slice(untilEnd[1].length).trim(),
    repeatMode: "untilEnd",
  };
}

function extractForEachChainSpace(sourceText: string): {
  prefix: string;
  content: string;
  chainCount?: number;
  source: string;
} | null {
  const match = sourceText.match(
    /^\s*(.*?)\s*(?:,?\s*(?:puis\s+)?r[ée]p[ée](?:ter|tez)\s+)\*([^*]+)\*\s+dans\s+chaque\s+(?:arceau|espace)(?:\s+de\s+(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+(?:ml|mailles?\s+en\s+l['’]air))?(?:\s+du\s+rang\s+pr[ée]c[ée]dent)?\s*\.?\s*$/i
  );
  if (!match) return null;
  return {
    prefix: match[1].replace(/[,;\s]+$/, "").trim(),
    content: match[2].trim(),
    chainCount: match[3] ? numberValue(match[3]) : undefined,
    source: sourceText.slice(match[1].length).trim(),
  };
}

function consumedParents(fragments: string[]): number {
  if (fragments.length === 0) return 0;
  const graph = parsePattern(`R1 100 ms\nR2 ${fragments.join(", ")}`);
  return graph.rounds[1]?.instructions.reduce((total, instruction) =>
    total + (instruction.role === "turningChain" || instruction.role === "sameParent"
      ? 0
      : instruction.count * instruction.consumes), 0) ?? 0;
}

function stitchForNotation(notation?: string): StitchVocabulary | undefined {
  if (!notation) return undefined;
  return STITCHES.find((stitch) => new RegExp(
    `(?:^|[_(\\s])${stitch.code}(?:$|[)\\s])`,
    "i"
  ).test(notation));
}

export function interpretWrittenPatternRow(
  row: WrittenPatternRow,
  previousStitchCount?: number,
  previousChainSpaces: number[] = []
): WrittenPatternRow {
  const normalizedSource = normalizeWrittenPatternText(row.sourceText);
  const forEachChainSpace = extractForEachChainSpace(normalizedSource);
  if (forEachChainSpace) {
    const prefixSegments = forEachChainSpace.prefix
      .split(/[,;]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const prefixInstructions = prefixSegments.map((segment, index) =>
      interpretSegment(
        segment,
        `${row.id}-prefix-${index + 1}`,
        index === 0,
        undefined,
        previousChainSpaces
      )
    );
    const prefixFragments = prefixInstructions
      .map((entry) => entry.cartomaillesText)
      .filter((value): value is string => Boolean(value));
    const matchingTargets = previousChainSpaces
      .filter((count) =>
        forEachChainSpace.chainCount === undefined || count === forEachChainSpace.chainCount
      )
      .map((count, index) => ({ count, index }));
    const groupSegments = forEachChainSpace.content
      .split(/[,;]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const groupInstructions: WrittenPatternInterpretationItem[] = [];
    const groupFragments: string[] = [];

    for (const target of matchingTargets) {
      for (const [segmentIndex, sourceSegment] of groupSegments.entries()) {
        const segment = sourceSegment.replace(/\s+dans\s+(?:ce\s+|le\s+)?m[êe]me\s+arceau\s*$/i, "");
        const interpreted = interpretSegment(
          segment,
          `${row.id}-target-${target.index + 1}-${segmentIndex + 1}`,
          false,
          undefined,
          previousChainSpaces
        );
        const simpleStitch = interpreted.cartomaillesText?.match(
          /^(\d+)\s+(ms|db|br|dbr|tb|tbr)$/i
        );
        if (simpleStitch) {
          interpreted.cartomaillesText =
            `1 archat_${target.index}_${simpleStitch[1]}_${simpleStitch[2].toLowerCase()}_${forEachChainSpace.chainCount ?? "any"}`;
          interpreted.description += " dans l'arceau courant";
        }
        groupInstructions.push(interpreted);
        if (interpreted.cartomaillesText) {
          groupFragments.push(interpreted.cartomaillesText);
        }
      }
    }

    const targetIssues: WrittenPatternIssue[] = matchingTargets.length > 0 ? [] : [{
      code: "missing-chain-space-target",
      message: forEachChainSpace.chainCount === undefined
        ? "Aucun arceau disponible dans le rang précédent."
        : `Aucun arceau de ${forEachChainSpace.chainCount} mailles en l'air trouvé dans le rang précédent.`,
      severity: "error",
    }];
    const repeatItem = item(
      `${row.id}-repeat-targets`,
      "repeat",
      forEachChainSpace.source,
      `Répéter le groupe dans chacun des ${matchingTargets.length} arceaux correspondants`,
      groupFragments.length > 0 ? groupFragments.join(", ") : undefined,
      targetIssues
    );
    repeatItem.repeatMode = "forEachTarget";
    repeatItem.repeatCount = matchingTargets.length;
    const interpretation = [...prefixInstructions, ...groupInstructions, repeatItem];
    const issues = [
      ...row.issues,
      ...interpretation.flatMap((entry) => entry.issues),
    ];

    return {
      ...row,
      interpretation,
      cartomaillesText: groupFragments.length > 0
        ? `R${row.number} ${[...prefixFragments, ...groupFragments].join(", ")}`
        : "",
      issues,
      review: issues.some((issue) => issue.severity === "error")
        ? { status: "needs-correction" }
        : { status: "pending" },
    };
  }
  const protectedRepeat = extractProtectedRepeat(normalizedSource);
  if (protectedRepeat) {
    const prefixSegments = protectedRepeat.prefix
      .split(/[,;]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const segments = protectedRepeat.content
      .split(/[,;]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    let inheritedStitch: StitchVocabulary | undefined;
    const prefixInstructions = prefixSegments.map((segment, index) => {
      const interpreted = interpretSegment(
        segment,
        `${row.id}-prefix-${index + 1}`,
        index === 0,
        undefined,
        previousChainSpaces
      );
      inheritedStitch = stitchForNotation(interpreted.cartomaillesText) ?? inheritedStitch;
      return interpreted;
    });
    const instructions = segments.map((segment, index) => {
      const interpreted = interpretSegment(
        segment,
        `${row.id}-item-${index + 1}`,
        false,
        inheritedStitch,
        previousChainSpaces
      );
      inheritedStitch = stitchForNotation(interpreted.cartomaillesText) ??
        inheritedStitch;
      return interpreted;
    });
    const fragments = instructions
      .map((entry) => entry.cartomaillesText)
      .filter((value): value is string => Boolean(value));
    const prefixFragments = prefixInstructions
      .map((entry) => entry.cartomaillesText)
      .filter((value): value is string => Boolean(value));
    const repeatIssues = [...prefixInstructions, ...instructions]
      .flatMap((entry) => entry.issues);
    let calculatedRepeatCount = protectedRepeat.repeatCount;
    const calculationIssues: WrittenPatternIssue[] = [];

    if (protectedRepeat.repeatMode === "untilEnd") {
      if (previousStitchCount === undefined) {
        calculationIssues.push({
          code: "missing-previous-row-count",
          message: "Impossible de répéter jusqu'à la fin sans connaître le nombre de mailles du rang précédent.",
          severity: "error",
        });
      } else {
        const explicitCountedStartChain =
          /elles\s+comptent\s+comme\s+(?:(?:la\s+)?premi[èe]re|une)\s+bride/i
            .test(row.sourceText) &&
          !/elles\s+ne\s+comptent\s+pas/i.test(row.sourceText);
        const alreadyConsumed = consumedParents(prefixFragments) +
          (explicitCountedStartChain ? 1 : 0);
        const motifConsumption = consumedParents(fragments);
        const available = Math.max(0, previousStitchCount - alreadyConsumed);

        if (motifConsumption === 0) {
          calculationIssues.push({
            code: "repeat-without-parent-consumption",
            message: "Le motif répété ne consomme aucune maille du rang précédent.",
            severity: "error",
          });
        } else {
          calculatedRepeatCount = Math.floor(available / motifConsumption);
          const remainder = available % motifConsumption;
          if (remainder > 0) {
            calculationIssues.push({
              code: "until-end-remainder",
              message: `Le motif ne permet pas de terminer exactement le rang : ${remainder} ${remainder === 1 ? "maille reste" : "mailles restent"} non travaillée${remainder === 1 ? "" : "s"}.`,
              severity: "warning",
            });
          }
        }
      }
    }

    const repeatNotation = fragments.length === instructions.length
      && calculatedRepeatCount !== undefined
      ? `(${fragments.join(", ")}) x${calculatedRepeatCount}`
      : undefined;
    const repeatItem = item(
      `${row.id}-repeat`,
      "repeat",
      protectedRepeat.repeatSource,
      protectedRepeat.repeatMode === "untilEnd"
        ? `Répéter le groupe jusqu'à la fin du rang (${calculatedRepeatCount ?? "?"} fois)`
        : `Répéter le groupe précédent ${calculatedRepeatCount} fois`,
      repeatNotation,
      repeatNotation ? calculationIssues : [...calculationIssues, {
        code: "empty-repeat",
        message: "Le groupe répété contient une instruction non comprise.",
        severity: "error",
      }]
    );
    repeatItem.repeatMode = protectedRepeat.repeatMode;
    repeatItem.repeatCount = calculatedRepeatCount;
    const interpretation = [
      ...prefixInstructions,
      ...instructions,
      repeatItem,
    ];
    const issues = [
      ...row.issues,
      ...repeatIssues,
      ...interpretation.at(-1)!.issues,
    ];

    return {
      ...row,
      interpretation,
      cartomaillesText: repeatNotation
        ? `R${row.number} ${[...prefixFragments, repeatNotation].join(", ")}`
        : "",
      issues,
      review: issues.some((issue) => issue.severity === "error")
        ? { status: "needs-correction" }
        : { status: "pending" },
    };
  }

  const { instructionText, repeatSource, repeatCount } = extractRepeat(normalizedSource);
  const segments = instructionText
    .split(/[,;.]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const interpretation = segments.map((segment, index) =>
    interpretSegment(
      segment,
      `${row.id}-item-${index + 1}`,
      index === 0,
      undefined,
      previousChainSpaces
    )
  );

  const fragments = interpretation
    .map((entry) => entry.cartomaillesText)
    .filter((value): value is string => Boolean(value));

  if (repeatSource && repeatCount !== undefined) {
    const firstIsLeadingChain = /^\d+\s+ml$/i.test(fragments[0] ?? "");
    const repeatedFragments = firstIsLeadingChain ? fragments.slice(1) : fragments;
    const repeatIssue: WrittenPatternIssue[] = repeatedFragments.length === 0
      ? [{
          code: "empty-repeat",
          message: "Aucune instruction ne précède la répétition.",
          severity: "error",
        }]
      : [];
    interpretation.push(item(
      `${row.id}-repeat`,
      "repeat",
      repeatSource,
      `Répéter le groupe précédent ${repeatCount} fois`,
      repeatedFragments.length > 0 ? `(${repeatedFragments.join(", ")}) x${repeatCount}` : undefined,
      repeatIssue
    ));

    if (repeatedFragments.length > 0) {
      fragments.splice(
        firstIsLeadingChain ? 1 : 0,
        repeatedFragments.length,
        `(${repeatedFragments.join(", ")}) x${repeatCount}`
      );
    }
  }

  const interpretationIssues = interpretation.flatMap((entry) => entry.issues);
  const issues = [...row.issues, ...interpretationIssues];

  return {
    ...row,
    interpretation,
    cartomaillesText: fragments.length > 0
      ? `R${row.number} ${fragments.join(", ")}`
      : "",
    issues,
    review: issues.some((issue) => issue.severity === "error")
      ? { status: "needs-correction" }
      : { status: "pending" },
  };
}

function interpretEditorialRound(
  row: WrittenPatternRow,
  previousStitchCount?: number
): { row: WrittenPatternRow; stitchCount: number } | null {
  const source = normalizeWrittenPatternText(row.sourceText).toLowerCase();
  const closure = /fermez[\s\S]*maille\s+coul[ée]e/.test(source) ? ", 1 mc" : "";
  const magicRing = source.match(new RegExp(
    `cercle\\s+magique[\\s\\S]*?${NUMBER}\\s+(?:ms|mailles?\\s+serr[ée]es?)`,
    "i"
  ));

  if (magicRing) {
    const count = numberValue(magicRing[1]);
    const notation = `R${row.number} 1 mr, ${count} ms${closure}`;
    return {
      stitchCount: count,
      row: {
        ...row,
        cartomaillesText: notation,
        interpretation: [item(
          `${row.id}-editorial`,
          "stitch",
          row.sourceText,
          `Cercle magique contenant ${count} mailles serrées${closure ? ", fermé par une maille coulée" : ""}`,
          notation.replace(/^R\d+\s+/, "")
        )],
        issues: [],
        review: { status: "pending" },
      },
    };
  }

  if (previousStitchCount === undefined) return null;
  const leadingChain = source.match(new RegExp(
    `${NUMBER}\\s+mailles?\\s+en\\s+l['’]air`,
    "i"
  ));

  for (const stitch of leadingChain
    ? []
    : STITCHES.filter(({ code }) => !["ml", "mc"].includes(code))) {
    const inEveryParent = source.match(new RegExp(
      `${NUMBER}\\s+${stitch.pattern}\\s+dans\\s+(?:chaque\\s+maille|chacune\\s+des\\s+mailles)(?:\\s+(?:du|de\\s+la)\\s+(?:tour|rang)\\s+pr[ée]c[ée]dent)?`,
      "i"
    ));
    if (!inEveryParent) continue;

    const stitchesPerParent = numberValue(inEveryParent[1]);
    const instruction = stitchesPerParent === 1
      ? `${previousStitchCount} ${stitch.code}`
      : stitchesPerParent === 2
        ? `${previousStitchCount} aug(${stitch.code})`
        : `${previousStitchCount} same_${stitchesPerParent}_${stitch.code}`;
    const notation = `R${row.number} ${instruction}${closure}`;

    return {
      stitchCount: previousStitchCount * stitchesPerParent,
      row: {
        ...row,
        cartomaillesText: notation,
        interpretation: [item(
          `${row.id}-every-parent`,
          "repeat",
          row.sourceText,
          `${stitchesPerParent} ${stitch.plural} dans chacune des ${previousStitchCount} mailles parentes`,
          instruction
        )],
        issues: [],
        review: { status: "pending" },
      },
    };
  }

  if (!leadingChain || !/bride\s+dans\s+la\s+m[êe]me\s+maille/i.test(source)) {
    return null;
  }

  const chainCount = numberValue(leadingChain[1]);
  const fragments = [`${chainCount} ml`, "1 br_same_parent"];
  let consumedParents = 1;
  let producedStitches = 2;

  if (/puis\s+1\s+bride\s+dans\s+la\s+maille\s+suivante/i.test(source)) {
    fragments.push("1 br");
    consumedParents++;
    producedStitches++;
  }

  if (/2\s+brides\s+dans\s+chacune\s+des\s+mailles\s+suivantes/i.test(source)) {
    const repeats = Math.max(0, previousStitchCount - consumedParents);
    fragments.push(`${repeats} aug(br)`);
    producedStitches += repeats * 2;
    consumedParents += repeats;
  }

  const repeatUntilEnd = source.match(
    /r[ée]p[ée]tez?\s+\*\s*2\s+brides\s+dans\s+la\s+maille\s+suivante\s*,\s*1\s+bride\s+dans\s+la\s+maille\s+suivante\s*\*\s+jusqu['’]\s*[àa]\s+la\s+fin\s+du\s+tour/i
  );
  if (repeatUntilEnd) {
    const repeats = Math.floor(
      Math.max(0, previousStitchCount - consumedParents) / 2
    );
    fragments.push(`(1 aug(br), 1 br) x${repeats}`);
    producedStitches += repeats * 3;
    consumedParents += repeats * 2;
  }

  if (fragments.length === 2) return null;
  if (closure) fragments.push("1 mc");
  const notation = `R${row.number} ${fragments.join(", ")}`;

  return {
    stitchCount: producedStitches,
    row: {
      ...row,
      cartomaillesText: notation,
      interpretation: [item(
        `${row.id}-editorial`,
        "stitch",
        row.sourceText,
        `Tour rédactionnel interprété sur ${previousStitchCount} mailles parentes`,
        notation.replace(/^R\d+\s+/, "")
      )],
      issues: [],
      review: { status: "pending" },
    },
  };
}

export function interpretWrittenPatternDocument(
  document: WrittenPatternDocument
): WrittenPatternDocument {
  let previousStitchCount: number | undefined;
  let previousChainSpaces: number[] = [];
  const notationLines: string[] = [];
  return {
    ...document,
    rows: document.rows.map((row) => {
      const editorial = interpretEditorialRound(row, previousStitchCount);
      if (editorial) {
        previousStitchCount = editorial.stitchCount;
        if (editorial.row.cartomaillesText) {
          notationLines.push(editorial.row.cartomaillesText);
        }
        previousChainSpaces = [];
        return editorial.row;
      }
      const interpreted = interpretWrittenPatternRow(
        row,
        previousStitchCount,
        previousChainSpaces
      );
      if (interpreted.cartomaillesText) {
        notationLines.push(interpreted.cartomaillesText);
        const graph = parsePattern(notationLines.join("\n"));
        const currentStitches = graph.stitches.filter(
          (stitch) => stitch.round === row.number
        );
        previousStitchCount = currentStitches.filter(
          (stitch) => stitch.round === row.number && stitch.countsAsStitch
        ).length;
        previousChainSpaces = [];
        for (const stitch of currentStitches.filter(
          (candidate) => candidate.role === "chainSpace"
        )) {
          const currentLength = previousChainSpaces.length - 1;
          const previousChainStitches = currentStitches.filter(
            (candidate) => candidate.role === "chainSpace" && candidate.order < stitch.order
          );
          const previousStitch = previousChainStitches.at(-1);
          if (previousStitch && previousStitch.order === stitch.order - 1 && currentLength >= 0) {
            previousChainSpaces[currentLength]++;
          } else {
            previousChainSpaces.push(1);
          }
        }
      }
      return interpreted;
    }),
  };
}
