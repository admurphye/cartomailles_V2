export function saveProject(data: {
  projectName: string;
  pattern: string;
  diagramType: string;
}) {

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
    `${data.projectName || "projet"}.json`;

  link.click();

  URL.revokeObjectURL(url);
}