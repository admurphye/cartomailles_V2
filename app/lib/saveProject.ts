import { StitchAdjustments } from "./engine/model/StitchAdjustments";
import { DiagramAnnotation } from "./annotations";

export type CartomaillesProject = {
  format: "cartomailles";
  version: 1;
  projectName: string;
  pattern: string;
  diagramType: "circular" | "flat" | "granny";
  adjustments?: StitchAdjustments;
  annotations?: DiagramAnnotation[];
};

export function saveProject(data: CartomaillesProject) {

  const blob = new Blob(
    [
      JSON.stringify(
        data,
        null,
        2
      ),
    ],
    {
      type: "application/json",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `${data.projectName || "projet"}.cartomailles`;

  link.click();

  URL.revokeObjectURL(url);
}
