"use client";

import Card from "@/app/components/ui/Card";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Settings2, MousePointerClick } from "lucide-react";
import { colors } from "@/app/theme/colors";

interface PropertiesPanelProps {
  selected: PositionedStitch | null;
}

export default function PropertiesPanel({
  selected,
}: PropertiesPanelProps) {
  return (
    <Card
      title="Propriétés"
      icon={<Settings2 size={18} />}
    >
      {!selected ? (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center">

          <MousePointerClick
            size={56}
            color={colors.primary}
            strokeWidth={1.5}
          />

          <h3
            className="mt-6 text-lg font-semibold"
            style={{ color: colors.text }}
          >
            Aucune maille sélectionnée
          </h3>

          <p
            className="mt-3 text-sm leading-6"
            style={{ color: colors.textSecondary }}
          >
            Clique sur une maille du diagramme
            pour afficher et modifier
            ses propriétés.
          </p>

        </div>
      ) : (
        <div className="space-y-5">

          <div
            className="rounded-xl p-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="text-xs uppercase mb-1"
              style={{ color: colors.textSecondary }}
            >
              Identifiant
            </div>

            <div
              className="font-semibold"
              style={{ color: colors.text }}
            >
              {selected.id}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="text-xs uppercase mb-1"
              style={{ color: colors.textSecondary }}
            >
              Type
            </div>

            <div
              className="font-semibold"
              style={{ color: colors.text }}
            >
              {selected.type}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="text-xs uppercase mb-1"
              style={{ color: colors.textSecondary }}
            >
              Rang
            </div>

            <div
              className="font-semibold"
              style={{ color: colors.text }}
            >
              {selected.round}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="text-xs uppercase mb-1"
              style={{ color: colors.textSecondary }}
            >
              Position
            </div>

            <div
              className="font-semibold"
              style={{ color: colors.text }}
            >
              X : {Math.round(selected.x)}
              <br />
              Y : {Math.round(selected.y)}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="text-xs uppercase mb-1"
              style={{ color: colors.textSecondary }}
            >
              Ordre
            </div>

            <div
              className="font-semibold"
              style={{ color: colors.text }}
            >
              {selected.order}
            </div>
          </div>

        </div>
      )}
    </Card>
  );
}