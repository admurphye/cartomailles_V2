import Card from "@/app/components/ui/Card";
import Select from "@/app/components/ui/Select";

type Props = {
  diagramType: string;
  setDiagramType: (value: string) => void;
};

export default function PreferencesPanel({
  diagramType,
  setDiagramType,
}: Props) {
  return (
    <Card
      title="Préférences"
      icon={<span>⚙️</span>}
    >
      <label
        style={{
          display: "block",
          marginBottom: 10,
          fontWeight: 500,
        }}
      >
        Type
      </label>

      <Select
        value={diagramType}
        onChange={(e) =>
          setDiagramType(e.target.value)
        }
        options={[
          {
            value: "circular",
            label: "Circulaire",
          },
          {
            value: "flat",
            label: "Plat",
          },
        ]}
      />
    </Card>
  );
}