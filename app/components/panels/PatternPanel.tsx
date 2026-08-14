import Card from "@/app/components/ui/Card";
import TextArea from "@/app/components/ui/TextArea";
import { colors } from "@/app/theme/colors";
import { FileText, Rows3 } from "lucide-react";
import { ParseIssue } from "@/app/lib/engine/model/ParseIssue";

type PatternPanelProps = {
  pattern: string;
  setPattern: (value: string) => void;
  issues: ParseIssue[];
  stitchCountsByRound: Array<{ round: number; count: number }>;
};

export default function PatternPanel({
  pattern,
  setPattern,
  issues,
  stitchCountsByRound,
}: PatternPanelProps) {
  const lineCount = pattern
    .split("\n")
    .filter((line) => line.trim() !== "").length;

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
        Colle ou écris ton patron crochet.
      </p>

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
