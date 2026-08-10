import Card from "@/app/components/ui/Card";
import TextArea from "@/app/components/ui/TextArea";
import { colors } from "@/app/theme/colors";
import { FileText } from "lucide-react";
import { ParseIssue } from "@/app/lib/engine/model/ParseIssue";

type PatternPanelProps = {
  pattern: string;
  setPattern: (value: string) => void;
  issues: ParseIssue[];
};

export default function PatternPanel({
  pattern,
  setPattern,
  issues,
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

         </Card>
  );
}
