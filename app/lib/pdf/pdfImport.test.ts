import { describe, expect, it } from "vitest";
import { cleanPdfText } from "./cleanPdfText";
import { detectAbbreviations } from "./detectAbbreviations";
import { detectPatternSections } from "./detectPatternSections";
import { detectPatternType } from "./detectPatternType";
import { normalizeCrochetText } from "./normalizeCrochetText";
import { validateImportedPattern } from "./validateImportedPattern";
import { extractPatternRows } from "./extractPatternRows";
import { detectPatternSizes, selectPatternSize } from "./detectPatternSizes";

describe("couche d'import PDF", () => {
  it("retire les pieds de page répétés en conservant les titres", () => {
    const cleaned = cleanPdfText({ fullText: "", pages: [
      { pageNumber: 1, text: "AILES\nTr 1: 6 ms\nMon patron © 2026\nwww.example.com" },
      { pageNumber: 2, text: "AILES\nTr 2: 6 aug ms\nMon patron © 2026" },
    ] });
    expect(cleaned.fullText).toContain("Tr 1: 6 ms");
    expect(cleaned.fullText).not.toContain("©");
    expect(cleaned.fullText).not.toContain("www.");
  });

  it("détecte les abréviations depuis leur description sans se fier au code seul", () => {
    const abbreviations = detectAbbreviations("ABRÉVIATIONS\nML: maille en l'air\nBR: bride\nDBR: double bride\nBR2ENS: diminution de brides\nSAUT: sauter une maille\nAILES");
    expect(abbreviations).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "ML", mappedType: "ml", confidence: 0.95 }),
      expect.objectContaining({ source: "DBR", mappedType: "dbr" }),
      expect.objectContaining({ source: "BR2ENS", mappedType: "dim(br)" }),
      expect.objectContaining({ source: "SAUT", mappedType: "skip" }),
    ]));
  });

  it("arrête les abréviations au prochain titre important", () => {
    const abbreviations = detectAbbreviations(`ABRÉVIATIONS
cm = cercle magique
m = maille
Tr = tour
ms = maille serrée
PIÈCE 1, 2 & 3
mains = décoration des mains`);

    expect(abbreviations.map((item) => item.source)).toEqual(["cm", "m", "Tr", "ms"]);
    expect(abbreviations.some((item) => item.source === "mains")).toBe(false);
  });

  it("reconnaît les termes structurels et le sens endroit/envers du glossaire", () => {
    const source = `GLOSSAIRE
m = maille
Tr = tour
Rg = rang
END = endroit
ENV = envers
CORPS`;
    const abbreviations = detectAbbreviations(source);
    expect(abbreviations).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "m", mappedType: "term:stitch" }),
      expect.objectContaining({ source: "Tr", mappedType: "label:round" }),
      expect.objectContaining({ source: "Rg", mappedType: "label:row" }),
      expect.objectContaining({ source: "END", mappedType: "side:right" }),
      expect.objectContaining({ source: "ENV", mappedType: "side:wrong" }),
    ]));

    const section = { id: "flat", title: "CORPS", sourceText: "Rg 1 (END): 5 ms\nRg 2 (ENV): 1 ml, 5 ms" };
    const rows = normalizeCrochetText(section, abbreviations);
    expect(rows.map((row) => row.direction)).toEqual(["left-to-right", "right-to-left"]);
  });

  it("extrait les comptes attendus et développe toutes les plages", () => {
    const rows = extractPatternRows({ fullText: "", pages: [{ pageNumber: 4, text: `AILES
Tr 2: (ms dans les 2 m suivantes, aug dans la m suivante) deux fois [8]
Tr 3-4: ms dans les 8 m [8]
Tr 6-16: ms dans les 18 m [18]
Rangs 20-22: 18 ms [18]` }] });

    expect(rows.find((row) => row.number === 2)).toMatchObject({ type: "round", originalText: "(ms dans les 2 m suivantes, aug dans la m suivante) deux fois", expectedCount: 8, pageNumber: 4 });
    expect(rows.filter((row) => row.number >= 6 && row.number <= 16)).toHaveLength(11);
    expect(rows.filter((row) => row.number >= 20 && row.number <= 22)).toHaveLength(3);
  });

  it("construit la hiérarchie Bird Garland et conserve les pages", () => {
    const pdf = { fullText: "", pages: [
      { pageNumber: 3, text: `OISEAUX
PIÈCE 1, 2 & 3
Tr 1-3: 6 ms [6]
PIÈCE 4
Tr 1-4: 8 ms [8]` },
      { pageNumber: 4, text: `AILES
Tr 1-18: 12 ms [12]
FLEURS
CENTRE
Tr 1-9: 6 ms [6]` },
      { pageNumber: 5, text: `PÉTALES
Tr 1-12: 12 ms [12]` },
    ] };
    pdf.fullText = pdf.pages.map((page) => page.text).join("\n");
    const sections = detectPatternSections(pdf);
    const byTitle = (title: string) => sections.find((section) => section.title === title)!;

    expect(byTitle("PIÈCE 1, 2 & 3").rowCount).toBe(3);
    expect(byTitle("PIÈCE 4").rowCount).toBe(4);
    expect(byTitle("AILES")).toMatchObject({ rowCount: 18, pageStart: 4, pageEnd: 4 });
    expect(byTitle("CENTRE")).toMatchObject({ rowCount: 9, pageStart: 4, pageEnd: 4 });
    expect(byTitle("PÉTALES")).toMatchObject({ rowCount: 12, pageStart: 5, pageEnd: 5 });
    expect(byTitle("AILES").parentId).toBe(byTitle("OISEAUX").id);
    expect(byTitle("CENTRE").parentId).toBe(byTitle("FLEURS").id);
  });

  it("détecte les tailles et ne conserve que les nombres de la taille choisie", () => {
    const pdf = { fullText: "", pages: [{ pageNumber: 2, text: `TAILLES: XS (S) M (L)
RANG 3 jusqu'au RANG 69 (77, 85, 94): 12 (14) 16 (18) ms` }] };
    pdf.fullText = pdf.pages[0].text;
    const sizes = detectPatternSizes(pdf);
    const medium = sizes.find((size) => size.label === "M")!;
    const selected = selectPatternSize(pdf, medium, sizes);

    expect(sizes.map((size) => size.label)).toEqual(["XS", "S", "M", "L"]);
    expect(selected.fullText).toContain("RANG 3 jusqu'au RANG 85: 16 ms");
    expect(pdf.fullText).toContain("69 (77, 85, 94)");
  });

  it("répète une bride dans toutes les mailles du rang", () => {
    const section = {
      id: "whole-row",
      title: "CORPS",
      sourceText: "Rang 1: br dans tout le rang [18]\nRang 2: ML 1, br tout le rang [18]",
    };
    const rows = validateImportedPattern(normalizeCrochetText(section, []));

    expect(rows[0].normalizedText).toBe("R1 18 br");
    expect(rows[1].normalizedText).toBe("R2 1 ml, 18 br");
    expect(rows.every((row) => row.status === "ok")).toBe(true);
  });

  it("sélectionne AILES et normalise le premier exemple Bird Garland", () => {
    const pdf = { fullText: "", pages: [{ pageNumber: 3, text: `AILES
Tr 1: commencer avec 6 ms dans cm [6]
Tr 2: aug dans les 6 m [12]
Tr 3-4: ms dans les 12 m [12]
Tr 5: (ms dans la m suivante, aug dans la m suivante) 6 fois [18]
ASSEMBLAGE
Coudre les pièces.` }] };
    pdf.fullText = pdf.pages[0].text;
    const section = detectPatternSections(pdf)[0];
    const detected = detectPatternType(section);
    const rows = validateImportedPattern(normalizeCrochetText(section, []));

    expect(section.title).toBe("AILES");
    expect(detected.type).toBe("circular");
    expect(rows.map((row) => row.normalizedText)).toEqual([
      "R1 mr, 6 ms",
      "R2 6 aug(ms)",
      "R3 12 ms",
      "R4 12 ms",
      "R5 (1 ms, 1 aug(ms)) x6",
    ]);
    expect(rows.every((row) => row.status === "ok")).toBe(true);
  });

  it("analyse une section Grisaille avec des rangs ENV et END", () => {
    const section = {
      id: "grisaille",
      title: "CORPS DU CHÂLE",
      sourceText: `Commencer avec une cercle magique.
Rang 1 (ENV): dans le cercle magique, 5 ml (compte comme 1 br + 2 ml), br, [2 ml, br] deux fois, tourner.
Rang 2 (END): 4 ml, 5br dans esp-2ml, [1 ml, 5br dans l'esp-2ml suivant] deux fois, 1 ml, br dans les 3 ml du début.`,
      pageStart: 4,
      pageEnd: 4,
      rowCount: 2,
    };
    const rows = validateImportedPattern(normalizeCrochetText(section, []));

    expect(rows).toHaveLength(2);
    expect(rows[0].normalizedText).toContain("R1 mr");
    expect(rows[1].normalizedText).toContain("R2 4 ml");
  });

  it("applique la même instruction à tous les rangs d'une plage jusqu'au rang indiqué", () => {
    const section = {
      id: "range",
      title: "CORPS",
      sourceText: "RANG 3 jusqu’au RANG 69: ms dans les 12 m [12]",
      rowCount: 67,
    };
    const rows = validateImportedPattern(normalizeCrochetText(section, []));

    expect(rows).toHaveLength(67);
    expect(rows[0].normalizedText).toBe("R3 12 ms");
    expect(rows.at(-1)?.normalizedText).toBe("R69 12 ms");
    expect(rows.every((row) => row.status === "ok")).toBe(true);
  });

  it("répète un rang référencé jusqu'au dernier rang demandé", () => {
    const section = {
      id: "repeat-row",
      title: "CORPS",
      sourceText: `rg 1 : 6ms
rg 2 : 1ml, 5ms
puis répéter rg 2 jusqu'au rang 69`,
    };
    const rows = validateImportedPattern(normalizeCrochetText(section, []));

    expect(rows).toHaveLength(69);
    expect(rows[0].normalizedText).toBe("R1 6ms");
    expect(rows[1].normalizedText).toBe("R2 1ml, 5ms");
    expect(rows[2].normalizedText).toBe("R3 1ml, 5ms");
    expect(rows.at(-1)?.normalizedText).toBe("R69 1ml, 5ms");
    expect(rows.every((row) => row.status === "ok")).toBe(true);
  });

  it("comprend la référence avec une liste de tailles dans le titre", () => {
    const section = {
      id: "repeat-sizes",
      title: "CORPS",
      sourceText: `RANG 1: 6 ms
RANG 2: 1 ml, 5 ms
RANG 3 jusqu’au RANG 69 (77, 85, 94, 102): répéter RANG 2.`,
    };
    const rows = validateImportedPattern(normalizeCrochetText(section, []));

    expect(rows).toHaveLength(69);
    expect(rows.slice(2).every((row) => row.normalizedText.endsWith("1 ml, 5 ms"))).toBe(true);
  });
});
