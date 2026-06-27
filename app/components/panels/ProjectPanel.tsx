import Card from "@/app/components/ui/Card";
import Input from "@/app/components/ui/Input";

type ProjectPanelProps = {
  projectName: string;
  setProjectName: (value: string) => void;
};

export default function ProjectPanel({
  projectName,
  setProjectName,
}: ProjectPanelProps) {
  return (
    <Card
      title="Projet"
      icon={<span>📁</span>}
    >
      <Input
        value={projectName}
        onChange={(e) =>
          setProjectName(e.target.value)
        }
        placeholder="Nom du projet"
      />
    </Card>
  );
}