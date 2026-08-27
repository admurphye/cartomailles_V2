"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { colors } from "@/app/theme/colors";
import { extractPdfText } from "@/app/lib/pdf/extractPdfText";
import { cleanPdfText } from "@/app/lib/pdf/cleanPdfText";
import { detectPatternSections } from "@/app/lib/pdf/detectPatternSections";
import { detectAbbreviations } from "@/app/lib/pdf/detectAbbreviations";
import { detectPatternType } from "@/app/lib/pdf/detectPatternType";
import { normalizeCrochetText } from "@/app/lib/pdf/normalizeCrochetText";
import { validateImportedPattern } from "@/app/lib/pdf/validateImportedPattern";
import { detectPatternSizes, selectPatternSize } from "@/app/lib/pdf/detectPatternSizes";
import type { ExtractedPdf, ImportedAbbreviation, ImportedPatternSize, ImportedPatternType, ImportedRow, ImportedSection } from "@/app/lib/pdf/types";

const STITCH_OPTIONS = [
  ["", "Non déterminé"],
  ["dim(ms)", "DIM — 2 mailles serrées ensemble"],
  ["dim(db)", "DIM — 2 demi-brides ensemble"],
  ["dim(br)", "DIM — 2 brides ensemble"],
  ["dim(dbr)", "DIM — 2 doubles brides ensemble"],
  ["dim(tbr)", "DIM — 2 triples brides ensemble"],
  ["dim(brav)", "DIM — 2 brides relief avant ensemble"],
  ["dim(brar)", "DIM — 2 brides relief arrière ensemble"],
  ["mr", "Cercle magique"],
  ["ml", "Maille en l'air"],
  ["mc", "Maille coulée"],
  ["ms", "Maille serrée"],
  ["db", "Demi-bride"],
  ["br", "Bride"],
  ["brav", "Bride relief avant"],
  ["brar", "Bride relief arrière"],
  ["popcorn", "Point popcorn"],
  ["tbr", "Triple bride"],
  ["dbr", "Double bride"],
  ["skip", "Sauter une maille"],
  ["aug(ms)", "Augmentation de mailles serrées"],
  ["aug(db)", "Augmentation de demi-brides"],
  ["aug(br)", "Augmentation de brides"],
  ["aug(dbr)", "Augmentation de doubles brides"],
  ["aug(tbr)", "Augmentation de triples brides"],
  ["fan_5_dc", "Éventail de 5 brides"],
  ["fan_6_dc", "Éventail de 6 brides"],
  ["fan_9_dc", "Éventail de 9 brides"],
  ["cluster5_fpdc", "5 brides relief avant ensemble"],
  ["term:stitch", "Maille (terme du patron)"],
  ["label:round", "Marqueur de tour"],
  ["label:row", "Marqueur de rang"],
  ["side:right", "Endroit — gauche vers droite"],
  ["side:wrong", "Envers — droite vers gauche"],
];

const selectStyle = {
  minHeight: 36,
  padding: "6px 30px 6px 9px",
  borderRadius: 7,
  border: `1px solid ${colors.border}`,
  backgroundColor: "#ffffff",
  color: "#1f1727",
  colorScheme: "light" as const,
  fontSize: 14,
};

type Props = { file: File; onClose: () => void; onConfirm: (pattern: string, type: ImportedPatternType) => void };

export default function PdfImportDialog({ file, onClose, onConfirm }: Props) {
  const [sections, setSections] = useState<ImportedSection[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [abbreviations, setAbbreviations] = useState<ImportedAbbreviation[]>([]);
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawPdf, setRawPdf] = useState<ExtractedPdf | null>(null);
  const [cleanedPdf, setCleanedPdf] = useState<ExtractedPdf | null>(null);
  const [debugView, setDebugView] = useState<"text" | "sections" | null>(null);
  const [sizes, setSizes] = useState<ImportedPatternSize[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const selected = sections.find((section) => section.id === selectedId);
  const detected = useMemo(() => selected ? detectPatternType(selected) : { type: "unknown" as const, confidence: 0.3 }, [selected]);

  useEffect(() => {
    let active = true;
    void extractPdfText(file).then((extracted) => {
      if (active) setRawPdf(extracted);
      return cleanPdfText(extracted);
    }).then((pdf) => {
      if (!active) return;
      setCleanedPdf(pdf);
      const foundSizes = detectPatternSizes(pdf);
      setSizes(foundSizes);
      setSelectedSizeId(foundSizes[0]?.id ?? "");
      const sizedPdf = foundSizes[0] ? selectPatternSize(pdf, foundSizes[0], foundSizes) : pdf;
      const found = detectPatternSections(sizedPdf);
      setSections(found);
      setSelectedId(found[0]?.id ?? "");
      setAbbreviations(detectAbbreviations(sizedPdf));
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Impossible de lire ce PDF.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [file]);

  const changeSize = (sizeId: string) => {
    setSelectedSizeId(sizeId);
    setRows([]);
    if (!cleanedPdf) return;
    const size = sizes.find((item) => item.id === sizeId);
    const sizedPdf = size ? selectPatternSize(cleanedPdf, size, sizes) : cleanedPdf;
    const found = detectPatternSections(sizedPdf);
    setSections(found);
    setSelectedId(found[0]?.id ?? "");
    setAbbreviations(detectAbbreviations(sizedPdf));
  };

  const analyze = () => {
    if (!selected) {
      setAnalysisError("Sélectionnez d’abord une partie du patron.");
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const normalizedRows = validateImportedPattern(
        normalizeCrochetText(selected, abbreviations)
      );
      if (normalizedRows.length === 0) {
        setAnalysisError(
          "Aucun rang ou tour n’a été trouvé dans cette partie. Essayez une autre partie du patron."
        );
        return;
      }
      setRows(normalizedRows);
    } catch (reason) {
      setAnalysisError(
        reason instanceof Error
          ? `Impossible d’analyser cette partie : ${reason.message}`
          : "Impossible d’analyser cette partie."
      );
    } finally {
      setAnalyzing(false);
    }
  };
  const validCount = rows.filter((row) => row.status === "ok").length;

  return <div role="dialog" aria-modal="true" aria-label="Import du patron" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0008", display: "grid", placeItems: "center", padding: 24 }}>
    <div style={{ width: "min(980px, 95vw)", maxHeight: "90vh", overflow: "auto", background: colors.surface, color: colors.text, borderRadius: 14, padding: 24, border: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ margin: 0 }}>Import du patron</h2><button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: 0, color: colors.text, cursor: "pointer" }}><X /></button></div>
      <p style={{ color: colors.textSecondary }}>{file.name}</p>
      {loading && <p>Lecture et analyse du PDF…</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && rows.length === 0 && <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button type="button" onClick={() => setDebugView(debugView === "text" ? null : "text")}>Voir le texte extrait</button>
          <button type="button" onClick={() => setDebugView(debugView === "sections" ? null : "sections")}>Voir les sections détectées</button>
        </div>
        {debugView === "text" && <div style={{ maxHeight: 360, overflow: "auto", padding: 12, background: "#fff", color: "#1f1727", borderRadius: 8 }}>
          {rawPdf?.pages.map((page) => <section key={page.pageNumber}><h4>Page {page.pageNumber}</h4><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{page.text}</pre></section>)}
        </div>}
        {debugView === "sections" && <div style={{ maxHeight: 360, overflow: "auto", padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
          <p style={{ color: colors.textSecondary }}>Texte nettoyé : {cleanedPdf?.pages.length ?? 0} page(s)</p>
          {sections.map((section) => { const numbers = section.rows?.map((row) => row.number) ?? []; return <div key={section.id} style={{ marginLeft: (section.level ?? 1) > 1 ? 24 : 0, marginBottom: 12 }}><strong>{section.title}</strong><div>page(s) {section.pageStart}{section.pageEnd !== section.pageStart ? `–${section.pageEnd}` : ""}</div><div>{section.rows?.[0]?.type === "round" ? "Tours" : "Rangs"} détectés : {numbers.length ? `${Math.min(...numbers)}–${Math.max(...numbers)} (${numbers.length})` : "aucun"}</div></div>; })}
        </div>}
        <h3>Parties trouvées dans le patron</h3>
        {sizes.length > 1 && <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><strong>Taille à analyser</strong><select style={selectStyle} value={selectedSizeId} onChange={(event) => changeSize(event.target.value)}>{sizes.map((size) => <option key={size.id} value={size.id} style={{ backgroundColor: "#fff", color: "#1f1727" }}>{size.label}</option>)}</select></label>}
        <div style={{ display: "grid", gap: 8 }}>{sections.map((section) => <label key={section.id} style={{ marginLeft: (section.level ?? 1) > 1 ? 24 : 0, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 8 }}><input type="radio" checked={selectedId === section.id} onChange={() => setSelectedId(section.id)} /> {section.title} — {section.rowCount ?? 0} rang(s), page(s) {section.pageStart}{section.pageEnd !== section.pageStart ? `–${section.pageEnd}` : ""}</label>)}</div>
        <p>Type détecté : <strong>{detected.type === "unknown" ? "Non déterminé" : detected.type}</strong> — confiance {Math.round(detected.confidence * 100)} %</p>
        {abbreviations.length > 0 && <><h3>Abréviations détectées</h3><div style={{ display: "grid", gridTemplateColumns: "120px 1fr 240px", alignItems: "center", gap: 8 }}>{abbreviations.map((abbr, index) => <div key={`${abbr.source}-${index}`} style={{ display: "contents" }}><strong>{abbr.source}</strong><span>{abbr.description}</span><select aria-label={`Interprétation de ${abbr.source}`} style={selectStyle} value={abbr.mappedType ?? ""} onChange={(event) => setAbbreviations((current) => current.map((item, i) => i === index ? { ...item, mappedType: event.target.value || undefined } : item))}>{STITCH_OPTIONS.map(([value, label]) => <option key={value} value={value} style={{ backgroundColor: "#ffffff", color: "#1f1727" }}>{label}</option>)}</select></div>)}</div></>}
        {analysisError && <p role="alert" style={{ color: "#dc2626", fontWeight: 600 }}>{analysisError}</p>}
        <button type="button" disabled={!selected || analyzing} onClick={analyze} style={{ marginTop: 20, padding: "10px 16px", borderRadius: 8, border: 0, background: colors.primary, color: "white", fontWeight: 700, cursor: !selected || analyzing ? "not-allowed" : "pointer", opacity: !selected || analyzing ? 0.6 : 1 }}>{analyzing ? "Analyse…" : "Analyser cette partie"}</button>
      </>}
      {rows.length > 0 && <><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}><button type="button" onClick={() => setDebugView(debugView === "text" ? null : "text")}>Voir le PDF extrait</button><button type="button" onClick={() => setDebugView(debugView === "sections" ? null : "sections")}>Voir les sections détectées</button></div>{debugView === "text" && <div style={{ maxHeight: 360, overflow: "auto", padding: 12, background: "#fff", color: "#1f1727", borderRadius: 8 }}>{rawPdf?.pages.map((page) => <section key={page.pageNumber}><h4>Page {page.pageNumber}</h4><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{page.text}</pre></section>)}</div>}{debugView === "sections" && <div style={{ maxHeight: 360, overflow: "auto", padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8 }}>{sections.map((section) => { const numbers = section.rows?.map((row) => row.number) ?? []; return <div key={section.id} style={{ marginLeft: (section.level ?? 1) > 1 ? 24 : 0, marginBottom: 12 }}><strong>{section.title}</strong><div>page(s) {section.pageStart}{section.pageEnd !== section.pageStart ? `–${section.pageEnd}` : ""}</div><div>{section.rows?.[0]?.type === "round" ? "Tours" : "Rangs"} détectés : {numbers.length ? `${Math.min(...numbers)}–${Math.max(...numbers)} (${numbers.length})` : "aucun"}</div></div>; })}</div>}<h3>Vérification des rangs</h3><p>{validCount}/{rows.length} rang(s) compris sans avertissement. Corrigez l’interprétation Cartomailles si nécessaire.</p><div style={{ display: "grid", gap: 14 }}>{rows.map((row, index) => <section key={`${row.number}-${index}`} style={{ border: `1px solid ${row.status === "ok" ? "#16a34a" : row.status === "unsupported" ? "#dc2626" : "#d97706"}`, borderRadius: 10, padding: 12 }}><strong>{row.status === "ok" ? "✅" : row.status === "unsupported" ? "❌" : "⚠️"} Rang {row.number}{row.pageNumber ? ` — page ${row.pageNumber}` : ""}{row.expectedCount !== undefined ? ` — ${row.expectedCount} mailles attendues` : ""}{row.direction ? ` — ${row.direction === "left-to-right" ? "END : gauche → droite" : "ENV : droite → gauche"}` : ""} — confiance {Math.round(row.confidence * 100)} %</strong><p style={{ color: colors.textSecondary, marginBottom: 6 }}>Texte PDF : {row.originalText}</p><textarea value={row.normalizedText} onChange={(event) => setRows((current) => validateImportedPattern(current.map((item, i) => i === index ? { ...item, normalizedText: event.target.value } : item)))} style={{ width: "100%", minHeight: 58, boxSizing: "border-box" }} />{row.warnings.map((warning) => <div key={warning} style={{ color: "#d97706", fontSize: 13 }}>{warning}</div>)}</section>)}</div><div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}><button type="button" onClick={() => { setDebugView(null); setRows([]); }}>Retour aux parties</button><button type="button" onClick={() => onConfirm(rows.map((row) => row.normalizedText).join("\n"), detected.type)} style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: colors.primary, color: "white", fontWeight: 700 }}>Générer le diagramme</button></div></>}
    </div>
  </div>;
}
