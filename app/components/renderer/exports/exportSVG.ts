export function exportSVG(
  diagram: SVGSVGElement,
  projectName: string
) {
  const svg = diagram.cloneNode(true) as SVGSVGElement;
  const viewBox = svg.viewBox.baseVal;

  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  if (viewBox.width > 0 && viewBox.height > 0) {
    svg.setAttribute("width", String(viewBox.width));
    svg.setAttribute("height", String(viewBox.height));
  }

  const serializer =
    new XMLSerializer();

  const source =
    serializer.serializeToString(svg);

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
    `${projectName || "diagramme"}.svg`;

  link.click();

  URL.revokeObjectURL(url);
}
