import Card from "@/app/components/ui/Card";
import TextArea from "@/app/components/ui/TextArea";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { colors } from "@/app/theme/colors";
import { FileText } from "lucide-react";

type PatternPanelProps = {
  pattern: string;
  setPattern: (value: string) => void;
  generateFromText: () => void;
};

export default function PatternPanel({
  pattern,
  setPattern,
  generateFromText,
}: PatternPanelProps) {
  const lineCount = pattern
    .split("\n")
    .filter((line) => line.trim() !== "").length;

  return (
    <Card
      title="Patron"
      icon={<FileText size={17} strokeWidth={1.75} />}
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
        placeholder={`Exemple :

Cercle magique
6 ms
6 aug
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

      <PrimaryButton
        onClick={generateFromText}
      >
        🧶 Créer le diagramme
      </PrimaryButton>
    </Card>
  );
}