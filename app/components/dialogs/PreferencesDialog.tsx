"use client";

import { X } from "lucide-react";
import { usePreferences } from "../preferences/PreferencesContext";
import { DiagramPreferences } from "@/app/lib/diagramPreferences";

type Props = { isOpen: boolean; onClose: () => void };

const numberSettings: Array<{
  key: keyof Pick<DiagramPreferences, "symbolSize" | "strokeWidth" | "flatSpacing" | "circularSpacing" | "grannySpacing">;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "symbolSize", label: "Taille des symboles", min: 0.7, max: 1.5, step: 0.1 },
  { key: "strokeWidth", label: "Épaisseur des traits", min: 1, max: 4, step: 0.5 },
  { key: "flatSpacing", label: "Espacement des rangs plats", min: 40, max: 100, step: 5 },
  { key: "circularSpacing", label: "Espacement des tours circulaires", min: 40, max: 100, step: 5 },
  { key: "grannySpacing", label: "Espacement des tours granny", min: 45, max: 110, step: 5 },
];

export default function PreferencesDialog({ isOpen, onClose }: Props) {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[#5B2E4D] bg-[#2B2434] p-6 text-[#FBF7F2] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Paramètres du diagramme</h2>
          <button onClick={onClose} aria-label="Fermer"><X /></button>
        </div>

        <div className="mt-6 space-y-5">
          {numberSettings.map((setting) => (
            <label key={setting.key} className="block text-sm">
              <span className="flex justify-between"><span>{setting.label}</span><strong>{preferences[setting.key]}</strong></span>
              <input
                type="range"
                min={setting.min}
                max={setting.max}
                step={setting.step}
                value={preferences[setting.key]}
                onChange={(event) => updatePreferences({ [setting.key]: Number(event.target.value) })}
                className="mt-2 w-full accent-[#D98CA8]"
              />
            </label>
          ))}

          <label className="flex items-center justify-between text-sm">
            Afficher les numéros des rangs plats
            <input type="checkbox" checked={preferences.showRowNumbers} onChange={(event) => updatePreferences({ showRowNumbers: event.target.checked })} className="size-5 accent-[#D98CA8]" />
          </label>

          <label className="flex items-center justify-between text-sm">
            Couleur des rangs impairs
            <input type="color" value={preferences.oddSymbolColor} onChange={(event) => updatePreferences({ oddSymbolColor: event.target.value })} className="h-9 w-14 rounded border-0 bg-transparent" />
          </label>

          <label className="flex items-center justify-between text-sm">
            Couleur des rangs pairs
            <input type="color" value={preferences.evenSymbolColor} onChange={(event) => updatePreferences({ evenSymbolColor: event.target.value })} className="h-9 w-14 rounded border-0 bg-transparent" />
          </label>

          <label className="block text-sm">
            Type de diagramme par défaut
            <select value={preferences.defaultDiagramType} onChange={(event) => updatePreferences({ defaultDiagramType: event.target.value as DiagramPreferences["defaultDiagramType"] })} className="mt-2 w-full rounded-lg border border-[#5B2E4D] bg-[#241F2B] px-3 py-2">
              <option value="circular">Circulaire</option>
              <option value="flat">Plat</option>
              <option value="granny">Granny</option>
            </select>
          </label>
        </div>

        <div className="mt-7 flex justify-between gap-3">
          <button onClick={resetPreferences} className="rounded-lg border border-[#5B2E4D] px-4 py-2 text-sm">Réinitialiser</button>
          <button onClick={onClose} className="rounded-lg bg-[#D98CA8] px-5 py-2 font-semibold text-white">Terminé</button>
        </div>
      </div>
    </div>
  );
}
