"use client";

import { createContext, useContext, useState } from "react";
import {
  DEFAULT_DIAGRAM_PREFERENCES,
  DiagramPreferences,
} from "@/app/lib/diagramPreferences";

const STORAGE_KEY = "cartomailles_preferences";

type PreferencesContextValue = {
  preferences: DiagramPreferences;
  updatePreferences: (values: Partial<DiagramPreferences>) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadPreferences(): DiagramPreferences {
  if (typeof window === "undefined") return DEFAULT_DIAGRAM_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_DIAGRAM_PREFERENCES;

    const parsed = JSON.parse(stored) as Partial<DiagramPreferences> & {
      symbolColor?: string;
    };

    return {
      ...DEFAULT_DIAGRAM_PREFERENCES,
      ...parsed,
      evenSymbolColor:
        parsed.evenSymbolColor ?? parsed.symbolColor ?? DEFAULT_DIAGRAM_PREFERENCES.evenSymbolColor,
    };
  } catch {
    return DEFAULT_DIAGRAM_PREFERENCES;
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(loadPreferences);

  const save = (next: DiagramPreferences) => {
    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences: (values) => save({ ...preferences, ...values }),
        resetPreferences: () => save(DEFAULT_DIAGRAM_PREFERENCES),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences doit être utilisé dans PreferencesProvider");
  return context;
}
