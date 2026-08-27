"use client";
/* eslint-disable @next/next/no-img-element -- les aperçus blob: locaux ne passent pas par l'optimiseur Next.js */

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { parseCartomaillesSvg, type ImportedChart } from "@/app/lib/chart-import/parseCartomaillesSvg";
import { analyzeRasterChart } from "@/app/lib/chart-import/localRasterAnalysis";
import { analysisToPattern, type VisionChartAnalysis } from "@/app/lib/chart-import/visionAnalysis";
import type { ImportedPatternType } from "@/app/lib/pdf/types";
import { colors } from "@/app/theme/colors";

type Props = { file: File; onClose: () => void; onConfirm: (pattern: string, type: ImportedPatternType) => void };

export default function DiagramImportDialog({ file, onClose, onConfirm }: Props) {
  const [chart, setChart] = useState<ImportedChart | null>(null);
  const [vision, setVision] = useState<VisionChartAnalysis | null>(null);
  const [pattern, setPattern] = useState("");
  const [diagramType, setDiagramType] = useState<ImportedPatternType>("circular");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSvg = /svg/i.test(file.type) || file.name.toLowerCase().endsWith(".svg");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const preview = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
  useEffect(() => {
    if (!isSvg) return;
    void file.text().then((source) => {
      const result = parseCartomaillesSvg(source);
      if (!result.symbols.length) throw new Error("Ce SVG ne contient pas les métadonnées Cartomailles nécessaires à une traduction fiable.");
      setChart(result);
      setPattern(result.pattern);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Impossible d’analyser ce diagramme."));
  }, [file, isSvg]);

  const analyzeWithVision = async () => {
    setLoading(true); setError(null); setVision(null);
    try {
      const result = await analyzeRasterChart(file, diagramType);
      setVision(result); setPattern(analysisToPattern(result));
      if (!result.rows.length) setError("Aucun rang suffisamment fiable n’a été détecté.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible d’analyser ce diagramme."); }
    finally { setLoading(false); }
  };

  const rounds = new Set(chart?.symbols.map((symbol) => symbol.round) ?? []).size;
  const warnings = vision ? [...vision.warnings, ...vision.rows.flatMap((row) => row.warnings.map((warning) => `Rang ${row.number} : ${warning}`))] : [];
  return <div role="dialog" aria-modal="true" aria-label="Importer un diagramme" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0008", display: "grid", placeItems: "center", padding: 24 }}><div style={{ width: "min(1050px, 96vw)", maxHeight: "92vh", overflow: "auto", background: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>Importer un diagramme</h2><button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
    <p style={{ color: colors.textSecondary }}>Analyse locale et gratuite : aucun fichier n’est envoyé sur Internet.</p>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(300px, 1fr)", gap: 18 }}><section><h3>Diagramme source</h3><div style={{ background: "white", color: "#333", borderRadius: 8, padding: 10, minHeight: 360, display: "grid", placeItems: "center" }}>{isPdf ? <div style={{ textAlign: "center" }}><p style={{ fontSize: 54, margin: 0 }}>📄</p><strong>{file.name}</strong><p>Le PDF sera lu page par page par l’analyse visuelle.</p></div> : <img src={preview} alt="Diagramme importé" style={{ display: "block", maxWidth: "100%", maxHeight: 520, objectFit: "contain" }} />}</div></section>
      <section><h3>Analyse</h3>{!isSvg && <><label style={{ display: "block", marginBottom: 12 }}>Disposition du diagramme <select value={diagramType} disabled={loading} onChange={(event) => setDiagramType(event.target.value as ImportedPatternType)}><option value="circular">Circulaire</option><option value="flat">Plat</option><option value="granny">Granny</option></select></label><button type="button" onClick={analyzeWithVision} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: 0, borderRadius: 8, background: colors.primary, color: "white", fontWeight: 700 }}>{loading && <LoaderCircle size={17} />}{loading ? "Analyse locale en cours…" : "Analyser gratuitement"}</button></>}{error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}{chart && <p>✅ {chart.symbols.length} symbole(s) détecté(s) sur {rounds} rang(s) grâce aux métadonnées SVG.</p>}{vision && <><p>Confiance globale : <strong>{Math.round(vision.confidence * 100)} %</strong> — {vision.rows.length} rang(s) détecté(s).</p>{warnings.length > 0 && <div style={{ color: "#92400e", background: "#fef3c7", padding: 10, borderRadius: 8 }}><strong>À vérifier</strong><ul>{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}</>}{(chart || vision) && <><h3>Patron proposé</h3><textarea value={pattern} onChange={(event) => setPattern(event.target.value)} style={{ width: "100%", minHeight: 260, boxSizing: "border-box" }} /></>}</section></div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}><button type="button" onClick={onClose}>Annuler</button><button type="button" disabled={(!chart && !vision) || !pattern.trim()} onClick={() => onConfirm(pattern, diagramType)} style={{ background: colors.primary, color: "white", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700 }}>Utiliser ce patron</button></div>
  </div></div>;
}
