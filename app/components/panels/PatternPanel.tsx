import Card from "@/app/components/ui/Card";
import TextArea from "@/app/components/ui/TextArea";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { colors } from "@/app/theme/colors";

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
      icon={<span>📝</span>}
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
6 mailles serrées
6 augmentations
2 mailles serrées, 1 augmentation x6
3 mailles serrées, 1 augmentation x6`}
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