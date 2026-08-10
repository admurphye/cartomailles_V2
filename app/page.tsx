"use client";

import Editor from "./components/editor/Editor";
import PasswordGate from "./components/PasswordGate";

export default function EditorPage() {
  return (
    <PasswordGate>
      <Editor />
    </PasswordGate>
  );
}
