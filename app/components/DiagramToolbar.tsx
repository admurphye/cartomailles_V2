import React from "react";

type DiagramToolbarProps = {
  diagramType: string;
  zoom: number;
  setZoom: React.Dispatch<
    React.SetStateAction<number>
  >;
  exportPNG: () => void;
  exportSVG: () => void;
  exportPDF: () => void;
};

export default function DiagramToolbar({
  diagramType,
  zoom,
  setZoom,
  exportPNG,
  exportSVG,
  exportPDF,
}: DiagramToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "15px",
      }}
    >
      <h3>
        📊 Diagramme{" "}
        {diagramType === "flat"
          ? "plat"
          : "circulaire"}
      </h3>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <button
          onClick={() =>
            setZoom((z) => z + 0.1)
          }
        >
          ➕
        </button>

        <button
          onClick={() =>
            setZoom((z) =>
              Math.max(0.5, z - 0.1)
            )
          }
        >
          ➖
        </button>

        <span
          style={{
            color: "#aaa",
            marginRight: "10px",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button onClick={exportPNG}>
          📸 PNG
        </button>

        <button onClick={exportSVG}>
          📐 SVG
        </button>

        <button onClick={exportPDF}>
          📄 PDF
        </button>
      </div>
    </div>
  );
}