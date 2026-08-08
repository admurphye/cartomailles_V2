import Card from "@/app/components/ui/Card";
import Select from "@/app/components/ui/Select";
import { Settings } from "lucide-react";

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
  icon={<Settings size={17} strokeWidth={1.75} />}
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