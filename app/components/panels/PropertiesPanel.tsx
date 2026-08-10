"use client";

import Card from "@/app/components/ui/Card";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";
import { Settings2, MousePointerClick } from "lucide-react";
import { colors } from "@/app/theme/colors";
import Select from "@/app/components/ui/Select";
import { StitchType } from "@/app/lib/engine/model/Stitch";

interface PropertiesPanelProps {
  selected: PositionedStitch | null;
  onChangeType: (type: StitchType) => void;
  onUpdatePosition: (stitchId: string, offsetX: number, offsetY: number) => void;
  onResetPosition: (stitchId: string) => void;
}

const STITCH_OPTIONS = [
  { value: "ch", label: "ml — Maille en l'air" },
  { value: "slst", label: "mc — Maille coulée" },
  { value: "sc", label: "ms — Maille serrée" },
  { value: "hdc", label: "db — Demi-bride" },
  { value: "dc", label: "br — Bride" },
  { value: "fpdc", label: "brAV — Bride relief avant" },
  { value: "bpdc", label: "brAR — Bride relief arrière" },
  { value: "tr", label: "tb — Triple bride" },
];

export default function PropertiesPanel({
  selected,
  onChangeType,
  onUpdatePosition,
  onResetPosition,
}: PropertiesPanelProps) {
  const canChangeType = Boolean(
    selected &&
      selected.operation === "normal" &&
      STITCH_OPTIONS.some((option) => option.value === selected.type)
  );

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
              Maille sélectionnée
            </div>
            <div
              className="font-semibold text-lg"
              style={{ color: colors.text }}
            >
              {STITCH_OPTIONS.find((option) => option.value === selected.type)?.label ?? selected.type}
            </div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Rang {selected.round} — Maille {selected.order}
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
            className="rounded-xl p-4 space-y-3"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="font-semibold" style={{ color: colors.text }}>
              Position
            </div>
            <label className="block text-sm" style={{ color: colors.textSecondary }}>
              Décalage horizontal
              <input
                type="number"
                value={selected.offsetX ?? 0}
                onChange={(event) =>
                  onUpdatePosition(
                    selected.id,
                    Number(event.target.value),
                    selected.offsetY ?? 0
                  )
                }
                className="mt-1 w-full rounded-lg px-3 py-2"
                style={{
                  background: colors.workspace,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            </label>
            <label className="block text-sm" style={{ color: colors.textSecondary }}>
              Décalage vertical
              <input
                type="number"
                value={selected.offsetY ?? 0}
                onChange={(event) =>
                  onUpdatePosition(
                    selected.id,
                    selected.offsetX ?? 0,
                    Number(event.target.value)
                  )
                }
                className="mt-1 w-full rounded-lg px-3 py-2"
                style={{
                  background: colors.workspace,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            </label>
            <button
              onClick={() => onResetPosition(selected.id)}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            >
              Réinitialiser la position
            </button>
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
              {canChangeType ? (
                <Select
                  value={selected.type}
                  onChange={(event) =>
                    onChangeType(event.target.value as StitchType)
                  }
                  options={STITCH_OPTIONS}
                />
              ) : (
                selected.type
              )}
            </div>

            {!canChangeType && (
              <p
                className="mt-2 text-xs"
                style={{ color: colors.textSecondary }}
              >
                {selected.operation === "normal"
                  ? "Ce type spécial ne peut pas encore être modifié."
                  : `Cette maille appartient à une ${selected.operation === "increase"
                    ? "augmentation"
                    : "diminution"} et ne peut pas encore être modifiée seule.`}
              </p>
            )}
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
