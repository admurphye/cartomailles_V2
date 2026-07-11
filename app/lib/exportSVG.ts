export async function exportSVG(
  setExportMode: (value: boolean) => void
) {
  setExportMode(true);

  await new Promise(resolve =>
    setTimeout(resolve, 100)
  );

  const svg =
  document.getElementById(
    "diagramme-flat"
  ) as SVGSVGElement | null;
  if (!svg) return;

  const serializer =
    new XMLSerializer();

  const source =
    serializer.serializeToString(svg);

  setExportMode(false);

  const blob = new Blob(
    [source],
    {
      type: "image/svg+xml;charset=utf-8",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "diagramme-crochet.svg";

  link.click();

  URL.revokeObjectURL(url);
}