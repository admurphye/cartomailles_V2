"use client";

import { X } from "lucide-react";
import { useModalAccessibility } from "@/app/hooks/useModalAccessibility";
import { drawCrochetSymbol } from "@/app/components/renderer/drawCrochetSymbol";
import { StitchType } from "@/app/lib/engine/model/Stitch";
import { InstructionOperation } from "@/app/lib/engine/model/Instruction";

type Props = { isOpen: boolean; onClose: () => void };

type LegendEntry = {
  name: string;
  abbreviation: string;
  type: StitchType;
  operation?: InstructionOperation;
  groupSize?: number;
  isSkip?: boolean;
};

const legendEntries: LegendEntry[] = [
  { name: "Anneau magique", abbreviation: "mr / cm", type: "mr" },
  { name: "Maille en l’air", abbreviation: "ml", type: "ch" },
  { name: "Maille coulée", abbreviation: "mc", type: "slst" },
  { name: "Maille serrée", abbreviation: "ms", type: "sc" },
  { name: "Demi-bride", abbreviation: "db", type: "hdc" },
  { name: "Bride", abbreviation: "br", type: "dc" },
  { name: "Double bride", abbreviation: "dbr", type: "dtr" },
  { name: "Triple bride", abbreviation: "tb", type: "tr" },
  { name: "Bride relief avant", abbreviation: "brAV", type: "fpdc" },
  { name: "Bride relief arrière", abbreviation: "brAR", type: "bpdc" },
  { name: "Point popcorn", abbreviation: "pop", type: "popcorn" },
  {
    name: "Sauter une ou plusieurs mailles",
    abbreviation: "sauter 1 maille / sauter 3 mailles",
    type: "sc",
    isSkip: true,
  },
  { name: "2 brides dans la même maille", abbreviation: "2BE", type: "dc", operation: "increase", groupSize: 2 },
  { name: "2 mailles serrées dans la même maille", abbreviation: "2 ms dans la même maille", type: "sc", operation: "increase", groupSize: 2 },
  { name: "2 demi-brides dans la même maille", abbreviation: "2 db dans la même maille", type: "hdc", operation: "increase", groupSize: 2 },
  { name: "2 doubles brides dans la même maille", abbreviation: "2 dbr dans la même maille", type: "dtr", operation: "increase", groupSize: 2 },
  { name: "2 triples brides dans la même maille", abbreviation: "2 tb dans la même maille", type: "tr", operation: "increase", groupSize: 2 },
  { name: "3 brides dans la même maille", abbreviation: "3BE", type: "dc", operation: "increase", groupSize: 3 },
  { name: "3 demi-brides ensemble", abbreviation: "3DBE", type: "hdc", operation: "decrease", groupSize: 3 },
  { name: "3 doubles brides ensemble", abbreviation: "3DBRE", type: "dtr", operation: "decrease", groupSize: 3 },
  { name: "3 triples brides ensemble", abbreviation: "3TBR", type: "tr", operation: "decrease", groupSize: 3 },
  { name: "Éventail de 5 brides", abbreviation: "5BE", type: "dc", operation: "increase", groupSize: 5 },
  { name: "Éventail de 6 brides", abbreviation: "6BE", type: "dc", operation: "increase", groupSize: 6 },
  { name: "Éventail de 9 brides", abbreviation: "9BE", type: "dc", operation: "increase", groupSize: 9 },
];

export default function StitchLegendDialog({ isOpen, onClose }: Props) {
  const dialogRef = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stitch-legend-title"
        tabIndex={-1}
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#5B2E4D] bg-[#2B2434] p-6 text-[#FBF7F2] shadow-2xl outline-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="stitch-legend-title" className="text-xl font-bold">
              Légende des mailles
            </h2>
            <p className="mt-1 text-sm text-[#D7C9CF]">
              Abréviations reconnues dans le patron et symboles correspondants.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la légende">
            <X />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {legendEntries.map((entry) => (
            <div
              key={`${entry.abbreviation}-${entry.groupSize ?? 1}`}
              className="flex min-h-20 items-center gap-4 rounded-xl border border-[#5B2E4D] bg-[#241F2B] px-4 py-3"
            >
              <svg
                viewBox="-16 -16 72 72"
                preserveAspectRatio="xMidYMid meet"
                className="h-16 w-16 shrink-0 overflow-visible rounded-lg border border-[#E6DFE8] bg-white"
                aria-hidden="true"
              >
                {entry.isSkip ? (
                  <>
                    <path
                      d="M7 27 C13 12, 27 12, 33 27"
                      fill="none"
                      stroke="#241F2B"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                    <path
                      d="M28 24 L33 27 L30 32"
                      fill="none"
                      stroke="#241F2B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : drawCrochetSymbol(
                    entry.type,
                    entry.operation ?? "normal",
                    20,
                    20,
                    "#241F2B",
                    0,
                    entry.groupSize ?? 1
                  )}
              </svg>
              <div className="min-w-0">
                <div className="font-medium">{entry.name}</div>
                <div className="mt-1 text-sm text-[#D7C9CF]">
                  Patron : <strong className="text-[#D98CA8]">{entry.abbreviation}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#D98CA8] px-5 py-2 font-semibold text-white"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
