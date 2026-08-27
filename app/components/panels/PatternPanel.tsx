import Card from "@/app/components/ui/Card";
import TextArea from "@/app/components/ui/TextArea";
import { colors } from "@/app/theme/colors";
import { ChangeEvent, useRef, useState } from "react";
import { FilePenLine, FileText, Rows3, Upload } from "lucide-react";
import { ParseIssue } from "@/app/lib/engine/model/ParseIssue";
import PdfImportDialog from "@/app/components/pdf-import/PdfImportDialog";
import type { ImportedPatternType } from "@/app/lib/pdf/types";
import DiagramImportDialog from "@/app/components/chart-import/DiagramImportDialog";
import WrittenPatternDialog from "@/app/components/written-pattern/WrittenPatternDialog";

type PatternPanelProps = {
  pattern: string;
  setPattern: (value: string) => void;
  onImportPattern: (value: string, type: ImportedPatternType) => void;
  issues: ParseIssue[];
  stitchCountsByRound: Array<{ round: number; count: number }>;
};

export default function PatternPanel({
  pattern,
  setPattern,
  onImportPattern,
  issues,
  stitchCountsByRound,
}: PatternPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [lastPdfFile, setLastPdfFile] = useState<File | null>(null);
  const [diagramFile, setDiagramFile] = useState<File | null>(null);
  const [writtenPatternOpen, setWrittenPatternOpen] = useState(false);
  const lineCount = pattern
    .split("\n")
    .filter((line) => line.trim() !== "").length;

  const handlePdfImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPdfFile(file);
  };

  const handleDiagramImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setDiagramFile(file);
  };

  return (
    <Card
      title="Patron"
      icon={<FileText size={17} strokeWidth={1.75} />}
      style={{
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          marginTop: 0,
          marginBottom: 15,
        }}
      >
        Colle, écris ou importe ton patron crochet.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handlePdfImport}
        style={{ display: "none" }}
      />
      <input ref={diagramInputRef} type="file" accept="image/svg+xml,image/png,image/jpeg,application/pdf,.svg,.png,.jpg,.jpeg,.pdf" onChange={handleDiagramImport} style={{ display: "none" }} />
      <button
        type="button"
        onClick={() => setWrittenPatternOpen(true)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12, padding: "9px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.primary, fontWeight: 600, cursor: "pointer" }}
      >
        <FilePenLine size={16} />
        Interpréter un patron écrit
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 12,
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          color: colors.primary,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Upload size={16} />
        Importer un PDF
      </button>

      <button
        type="button"
        onClick={() => diagramInputRef.current?.click()}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12, padding: "9px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.workspace, color: colors.text, fontWeight: 600, cursor: "pointer" }}
      >
        Importer un diagramme
      </button>

      {lastPdfFile && !pdfFile && (
        <button
          type="button"
          onClick={() => setPdfFile(lastPdfFile)}
          style={{
            marginTop: -4,
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            background: colors.workspace,
            color: colors.text,
            cursor: "pointer",
          }}
        >
          Revoir l’analyse PDF
        </button>
      )}

      {pdfFile && <PdfImportDialog file={pdfFile} onClose={() => setPdfFile(null)} onConfirm={(value, type) => { setLastPdfFile(pdfFile); onImportPattern(value, type); setPdfFile(null); }} />}
      {diagramFile && <DiagramImportDialog file={diagramFile} onClose={() => setDiagramFile(null)} onConfirm={(value, type) => { onImportPattern(value, type); setDiagramFile(null); }} />}
      {writtenPatternOpen && (
        <WrittenPatternDialog
          onClose={() => setWrittenPatternOpen(false)}
          onConfirm={(value) => {
            onImportPattern(value, "unknown");
            setWrittenPatternOpen(false);
          }}
        />
      )}

      <TextArea
        value={pattern}
        onChange={(e) =>
          setPattern(e.target.value)
        }
        rows={10}
        style={{
          flex: 1,
          minHeight: 0,
          resize: "none",
        }}
        placeholder={`Exemple :

6 ms
6 aug (ms)
12 br
12tbr`}
      />

      <p
        style={{
          color: colors.textSecondary,
          marginTop: 15,
          marginBottom: 20,
        }}
      >
        📄 {lineCount} ligne(s)
      </p>

      {issues.length > 0 && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d97706",
            background: "#fef3c7",
            color: "#92400e",
            fontSize: 13,
          }}
        >
          <strong>Patron à vérifier</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {issues.map((issue, index) => (
              <li key={`${issue.round}-${index}`}>
                Rang {issue.round} : {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          padding: 13,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: colors.workspace,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: colors.text,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: stitchCountsByRound.length > 0 ? 10 : 0,
          }}
        >
          <Rows3 size={16} strokeWidth={1.75} />
          Total des mailles par rang
        </div>

        {stitchCountsByRound.length === 0 ? (
          <div style={{ color: colors.textSecondary, fontSize: 13 }}>
            Aucun rang pour le moment.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 7,
              maxHeight: 150,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {stitchCountsByRound.map(({ round, count }) => (
              <div
                key={round}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: colors.textSecondary,
                  fontSize: 13,
                }}
              >
                <span>Rang {round}</span>
                <strong style={{ color: colors.primary, fontSize: 14 }}>
                  {count} {count > 1 ? "mailles" : "maille"}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>

         </Card>
  );
}
