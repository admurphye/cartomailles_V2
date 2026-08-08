"use client";

import { ReactNode, useState } from "react";
import { Tool } from "@/app/lib/engine/model/Tool";

type Props = {
  children: ReactNode;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;

  offset: {
    x: number;
    y: number;
  };

  setOffset: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
    }>
  >;

  tool: Tool;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export default function DiagramCanvas({
  children,
  zoom,
  setZoom,
  offset,
  setOffset,
  tool,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inverseZoom = 100 / zoom;

  const [lastMouse, setLastMouse] = useState({
    x: 0,
    y: 0,
  });

  const zoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  };

  const zoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-auto bg-white"
      onWheel={handleWheel}
      onMouseDown={(e) => {
        if (tool !== "pan") return;

        setIsDragging(true);

        setLastMouse({
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseMove={(e) => {
        if (tool !== "pan") return;
        if (!isDragging) return;

        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;

        setOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));

        setLastMouse({
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      style={{
        cursor:
          tool === "pan"
            ? isDragging
              ? "grabbing"
              : "grab"
            : "default",
      }}
    >
      <div
        style={{
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${inverseZoom}%`,
            height: `${inverseZoom}%`,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            transition: "transform 0.08s ease-out",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
