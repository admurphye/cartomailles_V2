import Card from "@/app/components/ui/Card";
import Input from "@/app/components/ui/Input";
import { FolderOpen } from "lucide-react";

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
      icon={<FolderOpen size={17} strokeWidth={1.75} />}
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