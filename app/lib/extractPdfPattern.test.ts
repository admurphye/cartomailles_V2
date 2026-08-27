import { describe, expect, it } from "vitest";
import { parsePattern } from "./engine/parser/parsePattern";
import { prepareExtractedPdfPattern } from "./extractPdfPattern";

describe("import d'un patron PDF", () => {
  it("isole le corps du châle et traduit les notations de Grisaille", () => {
    const extracted = `Matériel et échantillon
LE TUTORIEL COMMENCE
CORPS DU CHÂLE
Commencer avec une cercle magique.
Rang 1 (ENV): dans le cercle magique, 5 ml (compte comme 1 br + 2 ml), br, [2 ml, br] deux fois, tourner. 4br, 3 esp-2ml
Rang 2 (END): 4 ml, 5br dans esp-2ml, [1 ml, 5br dans l'esp-2ml suivant] deux fois, 1 ml, br dans 3ème ml du déb. 2br, 3 groupes de 5br
Rang 3: 4 ml, brRAR autour de chacune des 5 br suivantes, 1 ml, br dans l'esp-1ml suivant.
Rang 4: 4 ml, 5br dans le premier esp-1ml, 1 ml, brRAV5ens sur les 5br suivantes.
FINITION`;

    const pattern = prepareExtractedPdfPattern(extracted);
    const graph = parsePattern(pattern);

    expect(pattern).toContain("R1 mr, 5 ml, br, 2 ml, br, 2 ml, br");
    expect(pattern).toContain("R3 4 ml, 5 brar, 1 ml, br");
    expect(pattern).toContain("R4 4 ml, fan_5_dc, 1 ml, cluster5_fpdc");
    expect(graph.rounds.map((round) => round.number)).toEqual([1, 2, 3, 4]);
    expect(graph.issues).toEqual([]);
  });

  it("signale une répétition dépendante d'une maille marquée", () => {
    const pattern = prepareExtractedPdfPattern(`CORPS DU CHÂLE
Rang 1: 5 br.
Rang 2: 4 ml, *1 ml, 5br dans br suivante; rép de * jusqu'à la m marquée centrale.
FINITION`);
    const graph = parsePattern(pattern);

    expect(pattern).toContain("conditional_repeat");
    expect(graph.issues).toContainEqual({
      round: 2,
      message: "Répétition conditionnelle liée à une maille marquée : vérification manuelle nécessaire",
    });
  });
});
