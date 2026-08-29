import { describe, expect, it } from "vitest";
import { parsePattern } from "../engine/parser/parsePattern";
import { applyFlatRowDirections } from "../engine/layout/flatRowDirection";
import { layoutFlatGroups } from "../engine/layout/layoutFlatGroups";
import { detectWrittenPatternRows } from "./detectRows";
import {
  interpretWrittenPatternDocument,
  interpretWrittenPatternRow,
} from "./interpretRow";

function interpret(source: string) {
  const detected = detectWrittenPatternRows(source).document;
  return interpretWrittenPatternDocument(detected);
}

describe("interprétation minimale d'un patron écrit", () => {
  it.each([
    "Tour 1 : cercle magique, 6 ms",
    "Tour 1 : Faire un cercle magique, 6 ms",
    "Tour 1 : Faites un cercle magique et 6 ms",
    "Tour 1 : Réalisez un cercle magique puis 6 ms",
    "Tour 1 : Faire un cercle magique et crocheter 6 ms.",
    "Tour 1 : Faites un cercle magique puis crochetez 6 ms.",
    "Tour 1 : Créez un cercle magique, puis faites 6 ms.",
  ])("reconnaît un cercle magique rédactionnel : %s", (source) => {
    const detected = detectWrittenPatternRows(source).document;
    const row = interpretWrittenPatternDocument(detected).rows[0];

    expect(row.sourceText).toBe(source.replace(/^Tour 1\s*:\s*/, ""));
    expect(row.cartomaillesText).toBe("R1 1 mr, 6 ms");
    expect(row.issues).toEqual([]);

    const graph = parsePattern(row.cartomaillesText);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.type === "mr")).toHaveLength(1);
    expect(graph.stitches.filter((stitch) => stitch.type === "sc")).toHaveLength(6);
  });

  it.each([
    ["1 ml", "1 ml", "1 maille en l'air de début de rang"],
    ["deux mailles serrées", "2 ms", "2 mailles serrées"],
    ["3 demi-brides", "3 db", "3 demi-brides"],
    ["4 brides", "4 br", "4 brides"],
    ["2 doubles brides", "2 dbr", "2 doubles brides"],
    ["5 triples brides", "5 tb", "5 triples brides"],
    ["1 maille coulée", "1 mc", "1 maille coulée"],
  ])("traduit %s", (source, notation, description) => {
    const row = interpret(`Rang 1 : ${source}`).rows[0];

    expect(row.cartomaillesText).toBe(`R1 ${notation}`);
    expect(row.interpretation[0].description).toBe(description);
    expect(row.issues).toEqual([]);
  });

  it("distingue une chaîne de début d'un arceau", () => {
    const row = interpret("Rang 2 : 3 ml, 2 br, 1 ml, 1 br").rows[0];

    expect(row.interpretation.map((entry) => entry.description)).toEqual([
      "3 mailles en l'air de début de rang",
      "2 brides",
      "1 maille en l'air formant un arceau",
      "1 bride",
    ]);
  });

  it.each([
    ["2 mailles serrées dans la même maille", "1 aug(ms)"],
    ["2 demi-brides dans la même maille", "1 aug(db)"],
    ["2 brides dans la même maille", "1 aug(br)"],
    ["3 doubles brides dans la même maille", "1 same_3_dbr"],
    ["2 triples brides dans la même maille", "1 aug(tb)"],
  ])("traduit le partage de parent : %s", (source, notation) => {
    const row = interpret(`Rang 2 : ${source}`).rows[0];

    expect(row.cartomaillesText).toBe(`R2 ${notation}`);
    expect(row.interpretation[0].description).toContain("même maille parente");
  });

  it.each([
    ["sauter 1 maille", "1 skip", "1 maille sautée"],
    ["sautez trois mailles", "3 skip", "3 mailles sautées"],
  ])("traduit %s", (source, notation, description) => {
    const row = interpret(`Rang 2 : ${source}`).rows[0];

    expect(row.cartomaillesText).toBe(`R2 ${notation}`);
    expect(row.interpretation[0]).toMatchObject({
      kind: "skip",
      description,
    });
  });

  it.each([
    ["aug(ms)", "1 aug(ms)"],
    ["augmentation br", "1 aug(br)"],
    ["dim(db)", "1 dim(db)"],
    ["diminution dbr", "1 dim(dbr)"],
  ])("conserve les opérations explicites : %s", (source, notation) => {
    expect(interpret(`Rang 3 : ${source}`).rows[0].cartomaillesText)
      .toBe(`R3 ${notation}`);
  });

  it("marque une formulation inconnue comme bloquante sans l'inventer", () => {
    const row = interpret("Rang 1 : faire le motif fantaisie").rows[0];

    expect(row.cartomaillesText).toBe("");
    expect(row.review.status).toBe("needs-correction");
    expect(row.interpretation[0]).toMatchObject({
      kind: "unresolved",
      cartomaillesText: undefined,
    });
    expect(row.issues).toContainEqual(expect.objectContaining({
      code: "unresolved-instruction",
      severity: "error",
    }));
  });

  it("préserve les erreurs structurelles détectées avant l'interprétation", () => {
    const detected = detectWrittenPatternRows("Rang 1 :\nRang 1 : 6 ms").document;
    const interpreted = interpretWrittenPatternDocument(detected);

    expect(interpreted.rows[0].issues).toContainEqual(expect.objectContaining({ code: "empty-row" }));
    expect(interpreted.rows[1].issues).toContainEqual(expect.objectContaining({ code: "duplicate-row-number" }));
  });

  it("interprète l'exemple cible selon le contrat figé", () => {
    const source = "Rang 2 : 3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois.";
    const row = interpret(source).rows[0];

    expect(row.cartomaillesText).toBe("R2 3 ml, (1 aug(br), 1 ml, 1 skip) x5");
    expect(row.interpretation.map((entry) => entry.description)).toEqual([
      "3 mailles en l'air de début de rang",
      "2 brides ayant la même maille parente",
      "1 maille en l'air formant un arceau",
      "1 maille sautée",
      "Répéter le groupe précédent 5 fois",
    ]);
    expect(row.review.status).toBe("pending");

    const graph = parsePattern(`R1 10 ms\n${row.cartomaillesText}`);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 2 && stitch.type === "dc"))
      .toHaveLength(10);
  });

  it("interprète une répétition délimitée par des astérisques", () => {
    const source = "Rang 1 : 20 ms\nRang 2 : *1 ms, 2 ml, sauter 1 maille* répéter 10 fois";
    const document = interpret(source);
    const secondRow = document.rows[1];

    expect(secondRow.cartomaillesText)
      .toBe("R2 (1 ms, 2 ml, 1 skip) x10");
    expect(secondRow.issues).toEqual([]);

    const graph = parsePattern(document.rows.map((row) => row.cartomaillesText).join("\n"));
    const secondRound = graph.stitches.filter((stitch) => stitch.round === 2);
    expect(graph.issues).toEqual([]);
    expect(secondRound.filter((stitch) => stitch.type === "sc")).toHaveLength(10);
    expect(secondRound.filter((stitch) => stitch.role === "chainSpace")).toHaveLength(20);
  });

  it("calcule une répétition jusqu'à la fin avant de segmenter son motif", () => {
    const source = [
      "Rang 1 : Faites 15 mailles en l'air.",
      "Rang 2 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis crochetez 14 brides.",
      "Rang 3 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis répétez *2 mailles en l'air, sautez 2 mailles, 1 bride dans la maille suivante* jusqu'à la fin du rang.",
    ].join("\n");
    const document = interpret(source);
    const thirdRow = document.rows[2];
    const repeat = thirdRow.interpretation.find((entry) => entry.kind === "repeat");

    expect(thirdRow.cartomaillesText)
      .toBe("R3 3 ml, (2 ml, 2 skip, 1 br) x4");
    expect(repeat).toMatchObject({ repeatMode: "untilEnd", repeatCount: 4 });
    expect(thirdRow.issues).toContainEqual(expect.objectContaining({
      code: "until-end-remainder",
      message: "Le motif ne permet pas de terminer exactement le rang : 2 mailles restent non travaillées.",
      severity: "warning",
    }));

    const graph = parsePattern(
      document.rows.map((row) => row.cartomaillesText).join("\n")
    );
    const thirdRound = graph.stitches.filter((stitch) => stitch.round === 3);
    expect(graph.issues).toEqual([]);
    expect(thirdRound.filter((stitch) => stitch.role === "turningChain"))
      .toHaveLength(3);
    expect(thirdRound.filter((stitch) => stitch.role === "chainSpace"))
      .toHaveLength(8);
    expect(thirdRound.filter((stitch) => stitch.type === "dc")).toHaveLength(4);
  });

  it("termine exactement sans répétition partielle", () => {
    const document = interpret([
      "Rang 1 : 13 ms",
      "Rang 2 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis répétez *2 mailles en l'air, sautez 2 mailles, 1 bride dans la maille suivante* jusqu'à la fin.",
    ].join("\n"));

    expect(document.rows[1].cartomaillesText)
      .toBe("R2 3 ml, (2 ml, 2 skip, 1 br) x4");
    expect(document.rows[1].issues).toEqual([]);
  });

  it.each([
    "répétez *2 ml, sautez 2 mailles, 1 bride dans la maille suivante* jusqu'à la fin du rang",
    "répéter *2 ml, sautez 2 mailles, 1 bride dans la maille suivante* jusqu'à la fin",
    "*2 ml, sautez 2 mailles, 1 bride dans la maille suivante*, répétez jusqu'à la fin du rang",
    "*2 ml, sautez 2 mailles, 1 bride dans la maille suivante* jusqu'à la fin du rang",
    "*2 ml, sautez 2 mailles, 1 bride dans la maille suivante*, continuer ainsi jusqu'à la fin du rang",
  ])("reconnaît une variante de répétition jusqu'à la fin : %s", (instruction) => {
    const document = interpret(
      `Rang 1 : 13 ms\nRang 2 : 3 ml, elles comptent comme la première bride, ${instruction}`
    );

    expect(document.rows[1].cartomaillesText)
      .toBe("R2 3 ml, (2 ml, 2 skip, 1 br) x4");
    expect(document.rows[1].issues).toEqual([]);
    expect(document.rows[1].interpretation.at(-1)).toMatchObject({
      repeatMode: "untilEnd",
      repeatCount: 4,
    });
  });

  it("interprète des tours rédactionnels avec répétition jusqu'à la fin", () => {
    const source = `Tour 1 : Faites un cercle magique et crochetez 6 mailles serrées dans le cercle. Fermez par une maille coulée.
Tour 2 : Faites 3 mailles en l'air, puis une bride dans la même maille. Crochetez ensuite 2 brides dans chacune des mailles suivantes. Fermez le tour par une maille coulée dans la troisième maille en l'air du début.
Tour 3 : Faites 3 mailles en l'air. Crochetez 1 bride dans la même maille, puis 1 bride dans la maille suivante. Répétez *2 brides dans la maille suivante, 1 bride dans la maille suivante* jusqu'à la fin du tour.`;
    const document = interpret(source);

    expect(document.rows.map((row) => row.cartomaillesText)).toEqual([
      "R1 1 mr, 6 ms, 1 mc",
      "R2 3 ml, 1 br_same_parent, 5 aug(br), 1 mc",
      "R3 3 ml, 1 br_same_parent, 1 br, (1 aug(br), 1 br) x5",
    ]);
    expect(document.rows.map((row) => row.issues)).toEqual([[], [], []]);

    const graph = parsePattern(
      document.rows.map((row) => row.cartomaillesText).join("\n")
    );
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 1 && stitch.type === "sc"))
      .toHaveLength(6);
    expect(graph.stitches.filter((stitch) => stitch.round === 2 && stitch.type === "dc"))
      .toHaveLength(11);
    expect(graph.stitches.filter((stitch) => stitch.round === 3 && stitch.type === "dc"))
      .toHaveLength(17);
  });

  it.each([
    [6, "Crochetez 2 ms dans chaque maille du tour précédent.", "sc", "6 aug(ms)", 12],
    [8, "2 ms dans chacune des mailles.", "sc", "8 aug(ms)", 16],
    [12, "2 brides dans chaque maille.", "dc", "12 aug(br)", 24],
    [8, "faites 2 demi-brides dans chaque maille du rang précédent.", "hdc", "8 aug(db)", 16],
    [6, "2 mailles serrées dans chaque maille.", "sc", "6 aug(ms)", 12],
  ])(
    "répète une augmentation sur les %i mailles parentes : %s",
    (parentCount, instruction, stitchType, expectedInstruction, producedCount) => {
      const source = `Tour 1 : cercle magique, ${parentCount} ms\nTour 2 : ${instruction}`;
      const document = interpret(source);
      const secondRow = document.rows[1];

      expect(secondRow.sourceText).toBe(instruction);
      expect(secondRow.cartomaillesText).toBe(`R2 ${expectedInstruction}`);
      expect(secondRow.issues).toEqual([]);

      const graph = parsePattern(
        document.rows.map((row) => row.cartomaillesText).join("\n")
      );
      expect(graph.issues).toEqual([]);
      expect(graph.stitches.filter(
        (stitch) => stitch.round === 2 && stitch.type === stitchType
      )).toHaveLength(producedCount);
    }
  );

  it("distingue chaque maille de la même maille", () => {
    const document = interpret(
      "Tour 1 : cercle magique, 6 ms\nTour 2 : 2 ms dans la même maille"
    );

    expect(document.rows[1].cartomaillesText).toBe("R2 1 aug(ms)");
  });

  it.each([
    "Crochetez *1 ms dans la maille suivante, 2 ms dans la maille suivante*, répétez 6 fois.",
    "*1 ms dans la maille suivante, 2 ms dans la maille suivante* répétez 6 fois",
    "*1 ms dans la maille suivante, 2 ms dans la maille suivante*, répéter 6 fois",
    "*1 ms dans la maille suivante, 2 ms dans la maille suivante* à répéter 6 fois",
    "(1 ms dans la maille suivante, 2 ms dans la maille suivante), répétez 6 fois",
  ])("protège un bloc avant de segmenter ses instructions : %s", (instruction) => {
    const document = interpret(`Tour 3 : ${instruction}`);
    const row = document.rows[0];

    expect(row.sourceText).toBe(instruction);
    expect(row.cartomaillesText).toBe("R3 (1 ms, 1 aug(ms)) x6");
    expect(row.issues).toEqual([]);

    const graph = parsePattern(row.cartomaillesText);
    expect(graph.issues).toEqual([]);
    expect(graph.stitches.filter((stitch) => stitch.round === 3 && stitch.type === "sc"))
      .toHaveLength(18);
  });

  it.each([
    ["1 ms dans chacune des 2 mailles suivantes", "R4 2 ms", 2],
    ["1 ms dans les 3 mailles suivantes", "R4 3 ms", 3],
    ["1 br dans chacune des 4 mailles suivantes", "R4 4 br", 4],
    ["1 db dans les 5 mailles suivantes", "R4 5 db", 5],
    ["1 ms dans chacune des deux mailles suivantes", "R4 2 ms", 2],
    ["1 ms dans les deux mailles suivantes", "R4 2 ms", 2],
    ["2 ms dans chacune des 2 mailles suivantes", "R4 2 aug(ms)", 4],
  ])(
    "distingue la quantité par parent du nombre de parents : %s",
    (instruction, expectedNotation, producedCount) => {
      const row = interpret(`Tour 4 : ${instruction}`).rows[0];
      const graph = parsePattern(row.cartomaillesText);

      expect(row.cartomaillesText).toBe(expectedNotation);
      expect(row.issues).toEqual([]);
      expect(graph.issues).toEqual([]);
      expect(graph.stitches.filter((stitch) => stitch.type !== "mr"))
        .toHaveLength(producedCount);
    }
  );

  it("conserve 2 ms dans la maille suivante comme une augmentation unique", () => {
    const row = interpret("Tour 4 : 2 ms dans la maille suivante").rows[0];

    expect(row.cartomaillesText).toBe("R4 1 aug(ms)");
  });

  it.each([
    ["2 ms ensemble", "R5 1 dim(ms)"],
    ["crochetez 2 ms ensemble", "R5 1 dim(ms)"],
    ["2 brides ensemble", "R5 1 dim(br)"],
    ["crochetez 2 demi-brides ensemble", "R5 1 dim(db)"],
  ])("interprète une diminution au type explicite : %s", (instruction, notation) => {
    const row = interpret(`Tour 5 : ${instruction}`).rows[0];

    expect(row.cartomaillesText).toBe(notation);
    expect(row.issues).toEqual([]);
  });

  it.each([
    "crochetez les 2 mailles suivantes ensemble",
    "crocheter les 2 mailles suivantes ensemble",
    "faites les 2 mailles suivantes ensemble",
    "travailler les 2 mailles suivantes ensemble",
  ])("hérite prudemment le type d'une diminution : %s", (decrease) => {
    const row = interpret(
      `Tour 5 : Crochetez *1 ms dans chacune des 2 mailles suivantes, puis ${decrease}*, répétez 6 fois.`
    ).rows[0];

    expect(row.cartomaillesText).toBe("R5 (2 ms, 1 dim(ms)) x6");
    expect(row.issues).toEqual([]);
  });

  it("signale une diminution sans type fiable au lieu d'inventer", () => {
    const row = interpret(
      "Tour 5 : Crochetez *crochetez les 2 mailles suivantes ensemble*, répétez 6 fois."
    ).rows[0];

    expect(row.cartomaillesText).toBe("");
    expect(row.issues).toContainEqual(expect.objectContaining({
      code: "missing-decrease-stitch-type",
      message: "Type de maille manquant pour la diminution.",
    }));
  });

  it("ne modifie pas le texte source pendant l'interprétation", () => {
    const detected = detectWrittenPatternRows("Rang 1 :  6 MS.  ").document.rows[0];
    const interpreted = interpretWrittenPatternRow(detected);

    expect(interpreted.sourceText).toBe("6 MS.");
  });

  it("cible chaque arceau de 2 ML du rang précédent", () => {
    const source = [
      "Rang 1 : Faites 19 mailles en l'air.",
      "Rang 2 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis crochetez 18 brides.",
      "Rang 3 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis répétez *2 mailles en l'air, sautez 2 mailles, crochetez 2 brides dans la maille suivante* jusqu'à la fin du rang.",
      "Rang 4 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis crochetez 3 brides dans chaque arceau de 2 mailles en l'air du rang précédent.",
    ].join("\n");
    const document = interpret(source);

    expect(document.rows.map((row) => row.issues)).toEqual([[], [], [], []]);
    expect(document.rows[3].cartomaillesText)
      .toBe("R4 3 ml, 6 arch_3_br_2");

    const graph = applyFlatRowDirections(parsePattern(
      document.rows.map((row) => row.cartomaillesText).join("\n")
    ));
    const fourthRound = graph.stitches.filter((stitch) => stitch.round === 4);
    const startChain = fourthRound.filter((stitch) => stitch.role === "turningChain");
    const brides = fourthRound.filter((stitch) => stitch.type === "dc");
    const thirdRoundById = new Map(
      graph.stitches.filter((stitch) => stitch.round === 3)
        .map((stitch) => [stitch.id, stitch])
    );

    expect(startChain).toHaveLength(3);
    expect(brides).toHaveLength(18);
    for (const bride of brides) {
      const parents = graph.links
        .filter((link) => link.to === bride.id)
        .map((link) => thirdRoundById.get(link.from));
      expect(parents).toHaveLength(2);
      expect(parents.every((parent) => parent?.role === "chainSpace")).toBe(true);
    }

    const positioned = layoutFlatGroups(graph);
    for (let index = 0; index < brides.length; index += 3) {
      const group = brides.slice(index, index + 3);
      expect(new Set(group.map((bride) =>
        positioned.find((stitch) => stitch.id === bride.id)?.x
      )).size).toBe(3);
    }
  });

  it("applique un groupe complet dans chaque arceau en conservant la cible courante", () => {
    const source = [
      "Rang 1 : Faites 19 mailles en l'air.",
      "Rang 2 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis crochetez 18 brides.",
      "Rang 3 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis répétez *2 mailles en l'air, sautez 2 mailles, crochetez 2 brides dans la maille suivante* jusqu'à la fin du rang.",
      "Rang 4 : Faites 3 mailles en l'air, elles comptent comme la première bride, puis répétez *3 brides, 2 mailles en l'air, 3 brides dans le même arceau* dans chaque arceau de 2 mailles en l'air du rang précédent.",
    ].join("\n");
    const document = interpret(source);
    const fourthRow = document.rows[3];

    expect(fourthRow.issues).toEqual([]);
    expect(fourthRow.interpretation.at(-1)).toMatchObject({
      repeatMode: "forEachTarget",
      repeatCount: 6,
    });

    const graph = applyFlatRowDirections(parsePattern(
      document.rows.map((row) => row.cartomaillesText).join("\n")
    ));
    const fourthRound = graph.stitches.filter((stitch) => stitch.round === 4);
    const targetedBrides = fourthRound.filter(
      (stitch) => stitch.role === "chainSpaceTarget"
    );
    const newArches = fourthRound.filter((stitch) => stitch.role === "chainSpace");
    const thirdRoundById = new Map(
      graph.stitches.filter((stitch) => stitch.round === 3)
        .map((stitch) => [stitch.id, stitch])
    );

    expect(targetedBrides).toHaveLength(36);
    expect(newArches).toHaveLength(12);
    for (const bride of targetedBrides) {
      const parents = graph.links
        .filter((link) => link.to === bride.id)
        .map((link) => thirdRoundById.get(link.from));
      expect(parents).toHaveLength(2);
      expect(parents.every((parent) => parent?.role === "chainSpace")).toBe(true);
    }

    const positioned = layoutFlatGroups(graph);
    const targetCenters = new Map<string, Set<number>>();
    for (const bride of targetedBrides) {
      const parentKey = graph.links
        .filter((link) => link.to === bride.id)
        .map((link) => link.from)
        .sort()
        .join("-");
      const x = positioned.find((stitch) => stitch.id === bride.id)!.x;
      const centers = targetCenters.get(parentKey) ?? new Set<number>();
      centers.add(x);
      targetCenters.set(parentKey, centers);
    }
    expect(targetCenters.size).toBe(6);
    expect([...targetCenters.values()].every((centers) => centers.size === 6))
      .toBe(true);
    for (const [parentKey, centers] of targetCenters) {
      const parentXs = parentKey.split("-").map((parentId) =>
        positioned.find((stitch) => stitch.id === parentId)!.x
      );
      const targetX = parentXs.reduce((sum, x) => sum + x, 0) / parentXs.length;
      const motifCenterX =
        (Math.min(...centers) + Math.max(...centers)) / 2;
      expect(motifCenterX).toBeCloseTo(targetX);
    }
  });
});
