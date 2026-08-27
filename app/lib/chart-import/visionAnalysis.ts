import type { ImportedPatternType } from "@/app/lib/pdf/types";

export type VisionChartAnalysis = {
  diagramType: ImportedPatternType;
  confidence: number;
  rows: Array<{ number: number; normalizedText: string; confidence: number; warnings: string[] }>;
  warnings: string[];
};

export const visionChartSchema = {
  type: "object",
  additionalProperties: false,
  required: ["diagramType", "confidence", "rows", "warnings"],
  properties: {
    diagramType: { type: "string", enum: ["circular", "flat", "granny"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "normalizedText", "confidence", "warnings"],
        properties: {
          number: { type: "integer", minimum: 1 },
          normalizedText: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          warnings: { type: "array", items: { type: "string" } },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

export const visionChartPrompt = `Tu analyses un diagramme de crochet et tu le transcris en patron Cartomailles.
Lis uniquement les symboles réellement visibles. N'invente jamais une maille cachée ou ambiguë.
Repère le type du diagramme : circular, flat ou granny. Regroupe les symboles par rang/tour, du centre vers l'extérieur pour un ouvrage circulaire, et dans le sens indiqué par les flèches pour un ouvrage plat.
Utilise exclusivement ces abréviations dans normalizedText : ml, mc, ms, demi-br, br, db, tb, aug, dim, sauter.
Une ligne doit commencer par R suivi de son numéro, par exemple : "R1 6 ml, 1 mc".
Les répétitions certaines peuvent utiliser la forme "(3 br, 2 ml) x4". Si un symbole, un sens ou un regroupement est incertain, ajoute un avertissement précis et baisse la confiance. Si aucun rang fiable n'est visible, renvoie rows vide.`;

export function parseVisionChartAnalysis(value: unknown): VisionChartAnalysis {
  if (!value || typeof value !== "object") throw new Error("Réponse d’analyse invalide.");
  const candidate = value as Partial<VisionChartAnalysis>;
  if (!["circular", "flat", "granny"].includes(candidate.diagramType ?? "")) throw new Error("Type de diagramme invalide.");
  if (typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1) throw new Error("Indice de confiance invalide.");
  if (!Array.isArray(candidate.rows) || !Array.isArray(candidate.warnings)) throw new Error("Rangs d’analyse invalides.");
  const rows = candidate.rows.map((row) => {
    if (!row || !Number.isInteger(row.number) || row.number < 1 || typeof row.normalizedText !== "string" || typeof row.confidence !== "number" || row.confidence < 0 || row.confidence > 1 || !Array.isArray(row.warnings) || !row.warnings.every((item) => typeof item === "string")) throw new Error("Un rang analysé est invalide.");
    return row;
  });
  if (!candidate.warnings.every((item) => typeof item === "string")) throw new Error("Avertissements invalides.");
  return { diagramType: candidate.diagramType!, confidence: candidate.confidence, rows, warnings: candidate.warnings };
}

export function analysisToPattern(analysis: VisionChartAnalysis): string {
  return analysis.rows.sort((a, b) => a.number - b.number).map((row) => {
    const text = row.normalizedText.trim();
    return /^R\s*\d+/i.test(text) ? text : `R${row.number} ${text}`;
  }).join("\n");
}
