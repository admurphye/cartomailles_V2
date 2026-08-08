"use client";

interface PatternEditorProps {
  pattern: string;
  onChange: (value: string) => void;
}

export default function PatternEditor({
  pattern,
  onChange,
}: PatternEditorProps) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-3">
        Patron
      </h2>

      <textarea
        value={pattern}
        onChange={(e) => onChange(e.target.value)}
        className="
          flex-1
          w-full
          resize-none
          rounded-lg
          border
          border-gray-600
          bg-[#1f1b24]
          text-white
          font-mono
          p-3
          outline-none
        "
      />
    </div>
  );
}