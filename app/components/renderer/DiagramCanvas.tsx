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
    setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(1))));
  };

  const zoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(1))));
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn();
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomOut();
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      resetView();
      return;
    }

    if (tool !== "pan") return;

    const movement: Record<string, { x: number; y: number }> = {
      ArrowUp: { x: 0, y: -20 },
      ArrowDown: { x: 0, y: 20 },
      ArrowLeft: { x: -20, y: 0 },
      ArrowRight: { x: 20, y: 0 },
    };
    const delta = movement[event.key];

    if (delta) {
      event.preventDefault();
      setOffset((current) => ({
        x: current.x + delta.x,
        y: current.y + delta.y,
      }));
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-auto bg-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D98CA8]"
      role="region"
      aria-label="Zone du diagramme"
      aria-describedby="diagram-canvas-help"
      tabIndex={0}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => {
        if (tool !== "pan") return;

        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);

        setLastMouse({
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onPointerMove={(e) => {
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
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setIsDragging(false);
      }}
      onPointerCancel={() => setIsDragging(false)}
      style={{
        touchAction: tool === "pan" ? "none" : "auto",
        cursor:
          tool === "pan"
            ? isDragging
              ? "grabbing"
              : "grab"
            : "default",
      }}
    >
      <span id="diagram-canvas-help" className="sr-only">
        Utilisez plus et moins pour zoomer, zéro pour réinitialiser la vue.
        Avec l’outil Déplacer la vue, utilisez les flèches pour déplacer le diagramme.
      </span>
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
