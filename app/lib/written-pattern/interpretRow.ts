import type {
  WrittenPatternDocument,
  WrittenPatternInterpretationItem,
  WrittenPatternIssue,
  WrittenPatternRow,
} from "./types";

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
  isFirst: boolean
): WrittenPatternInterpretationItem {
  const normalized = sourceText.trim().replace(/^puis\s+/i, "");

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
  return {
    instructionText: sourceText.slice(0, match.index).trim(),
    repeatSource: match[1],
    repeatCount: numberValue(match[2]),
  };
}

export function interpretWrittenPatternRow(row: WrittenPatternRow): WrittenPatternRow {
  const { instructionText, repeatSource, repeatCount } = extractRepeat(row.sourceText);
  const segments = instructionText
    .split(/[,;.]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const interpretation = segments.map((segment, index) =>
    interpretSegment(segment, `${row.id}-item-${index + 1}`, index === 0)
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

export function interpretWrittenPatternDocument(
  document: WrittenPatternDocument
): WrittenPatternDocument {
  return {
    ...document,
    rows: document.rows.map(interpretWrittenPatternRow),
  };
}

