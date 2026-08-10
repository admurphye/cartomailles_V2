"use client";

import Editor from "./components/editor/Editor";
import PasswordGate from "./components/PasswordGate";
import { PreferencesProvider } from "./components/preferences/PreferencesContext";

export default function EditorPage() {
  return (
    <PasswordGate>
      <PreferencesProvider>
        <Editor />
      </PreferencesProvider>
    </PasswordGate>
  );
}
