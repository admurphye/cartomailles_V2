"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { useModalAccessibility } from "@/app/hooks/useModalAccessibility";
import { colors } from "@/app/theme/colors";
import { detectWrittenPatternRows } from "@/app/lib/written-pattern/detectRows";
import { interpretWrittenPatternDocument } from "@/app/lib/written-pattern/interpretRow";
import { isWrittenPatternReady } from "@/app/lib/written-pattern/model";
import { buildValidatedCartomaillesPattern } from "@/app/lib/written-pattern/buildValidatedPattern";
import {
  applyManualCartomaillesCorrection,
  reanalyzeWrittenPatternRow,
  validateWrittenPatternRow,
} from "@/app/lib/written-pattern/review";
import type {
  WrittenPatternDocument,
  WrittenPatternIssue,
} from "@/app/lib/written-pattern/types";

type Props = {
  onClose: () => void;
  onConfirm: (pattern: string) => void;
};

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  padding: 10,
  background: "#ffffff",
  color: "#1f1727",
  font: "inherit",
};

export default function WrittenPatternDialog({ onClose, onConfirm }: Props) {
  const dialogRef = useModalAccessibility(true, onClose);
  const [sourceText, setSourceText] = useState("");
  const [document, setDocument] = useState<WrittenPatternDocument | null>(null);
  const [detectionIssues, setDetectionIssues] = useState<WrittenPatternIssue[]>([]);

  const analyze = () => {
    const detected = detectWrittenPatternRows(sourceText);
    setDetectionIssues(detected.issues);
    setDocument(interpretWrittenPatternDocument(detected.document));
  };

  const updateRow = (
    rowId: string,
    update: (row: WrittenPatternDocument["rows"][number]) => WrittenPatternDocument["rows"][number]
  ) => {
    setDocument((current) => current ? {
      ...current,
      rows: current.rows.map((row) => row.id === rowId ? update(row) : row),
    } : current);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#0009", display: "grid", placeItems: "center", padding: 24 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="written-pattern-title"
        tabIndex={-1}
        style={{ width: "min(980px, 96vw)", maxHeight: "92vh", overflow: "auto", borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, padding: 24 }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 id="written-pattern-title" style={{ margin: 0 }}>Interpréter un patron écrit</h2>
            <p style={{ color: colors.textSecondary, marginBottom: 0 }}>
              Le diagramme actuel ne sera pas modifié pendant cette vérification.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: 0, background: "none", color: colors.text, cursor: "pointer" }}><X /></button>
        </header>

        {!document ? (
          <section style={{ marginTop: 22 }}>
            <label htmlFor="written-pattern-source" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Texte du patron</label>
            <textarea
              id="written-pattern-source"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              rows={12}
              placeholder="Rang 1 : 6 mailles serrées\nRang 2 : 3 ml, 2 brides dans la même maille…"
              style={{ ...fieldStyle, resize: "vertical" }}
            />
            <button type="button" onClick={analyze} disabled={!sourceText.trim()} style={{ marginTop: 14, padding: "10px 16px", border: 0, borderRadius: 8, background: colors.primary, color: "#261923", fontWeight: 700, cursor: sourceText.trim() ? "pointer" : "not-allowed", opacity: sourceText.trim() ? 1 : 0.55 }}>
              Détecter et interpréter les rangs
            </button>
          </section>
        ) : (
          <section style={{ marginTop: 22 }}>
            {detectionIssues.map((issue, index) => (
              <p key={`${issue.code}-${index}`} role={issue.severity === "error" ? "alert" : undefined} style={{ color: issue.severity === "error" ? "#fca5a5" : "#fcd34d" }}>
                {issue.message}
              </p>
            ))}

            <div style={{ display: "grid", gap: 16 }}>
              {document.rows.map((row) => {
                const validated = row.review.status === "validated";
                return (
                  <article key={row.id} style={{ padding: 16, borderRadius: 12, border: `1px solid ${validated ? colors.success : colors.border}`, background: colors.workspace }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <h3 style={{ margin: 0 }}>{row.kind === "round" ? "Tour" : "Rang"} {row.number}</h3>
                      <span style={{ color: validated ? colors.success : colors.textSecondary, fontSize: 13 }}>
                        {validated ? "Validé" : row.review.status === "needs-correction" ? "Correction nécessaire" : "À valider"}
                      </span>
                    </div>

                    <label style={{ display: "block", marginTop: 14, marginBottom: 6, fontWeight: 600 }}>Texte source modifiable</label>
                    <textarea
                      value={row.sourceText}
                      onChange={(event) => updateRow(row.id, (current) => reanalyzeWrittenPatternRow(current, event.target.value))}
                      rows={3}
                      style={{ ...fieldStyle, resize: "vertical" }}
                    />

                    <div style={{ marginTop: 14 }}>
                      <strong>Interprétation</strong>
                      {row.interpretation.length === 0 ? (
                        <p style={{ color: colors.textSecondary }}>Aucune instruction comprise.</p>
                      ) : (
                        <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
                          {row.interpretation.map((entry) => (
                            <li key={entry.id} style={{ color: entry.kind === "unresolved" ? "#fca5a5" : colors.textSecondary, marginBottom: 5 }}>
                              {entry.description}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <label style={{ display: "block", marginTop: 12, marginBottom: 6, fontWeight: 600 }}>Notation Cartomailles modifiable</label>
                    <input
                      value={row.cartomaillesText}
                      onChange={(event) => updateRow(row.id, (current) => applyManualCartomaillesCorrection(current, event.target.value))}
                      style={fieldStyle}
                    />

                    {row.issues.length > 0 && (
                      <ul style={{ color: "#fca5a5", margin: "10px 0", paddingLeft: 22 }}>
                        {row.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
                      </ul>
                    )}

                    <button
                      type="button"
                      onClick={() => updateRow(row.id, (current) => validateWrittenPatternRow(current))}
                      disabled={validated}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, background: validated ? colors.success : colors.surface, color: validated ? "#172014" : colors.text, cursor: validated ? "default" : "pointer" }}
                    >
                      <Check size={16} /> {validated ? "Rang validé" : "Valider ce rang"}
                    </button>
                  </article>
                );
              })}
            </div>

            <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20 }}>
              <button type="button" onClick={() => { setDocument(null); setDetectionIssues([]); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.workspace, color: colors.text, cursor: "pointer" }}>
                <RotateCcw size={16} /> Revenir au texte collé
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <strong style={{ color: isWrittenPatternReady(document) ? colors.success : colors.textSecondary }}>
                  {isWrittenPatternReady(document) ? "Tous les rangs sont validés" : "Validation requise avant génération"}
                </strong>
                <button
                  type="button"
                  disabled={!isWrittenPatternReady(document)}
                  onClick={() => {
                    const pattern = buildValidatedCartomaillesPattern(document);
                    if (pattern) onConfirm(pattern);
                  }}
                  style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: colors.primary, color: "#261923", fontWeight: 700, cursor: isWrittenPatternReady(document) ? "pointer" : "not-allowed", opacity: isWrittenPatternReady(document) ? 1 : 0.5 }}
                >
                  Générer le diagramme
                </button>
              </div>
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
