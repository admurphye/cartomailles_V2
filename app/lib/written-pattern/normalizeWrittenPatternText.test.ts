import { describe, expect, it } from "vitest";
import { normalizeWrittenPatternText } from "./normalizeWrittenPatternText";

describe("normalisation du texte d'un patron écrit", () => {
  it.each([
    "faire un cercle magique",
    "faites un cercle magique",
    "réaliser un cercle magique",
    "réalisez un cercle magique",
    "créer un cercle magique",
    "créez un cercle magique",
    "former un cercle magique",
    "formez un cercle magique",
  ])("normalise « %s »", (source) => {
    expect(normalizeWrittenPatternText(source)).toBe("cercle magique");
  });

  it.each([
    ["Faire un cercle magique, 6 ms", "cercle magique, 6 ms"],
    ["Faites un cercle magique et 6 ms", "cercle magique, 6 ms"],
    ["Réalisez un cercle magique puis 6 ms", "cercle magique, 6 ms"],
    ["Faire un cercle magique et crocheter 6 ms.", "cercle magique, 6 ms."],
    ["Faites un cercle magique puis crochetez 6 ms.", "cercle magique, 6 ms."],
    ["Créez un cercle magique, puis faites 6 ms.", "cercle magique, 6 ms."],
  ])("produit une notation intermédiaire compatible : %s", (source, expected) => {
    expect(normalizeWrittenPatternText(source)).toBe(expected);
  });

  it.each([
    ["crocheter 6 ms", "6 ms"],
    ["crochetez 6 mailles serrées", "6 mailles serrées"],
    ["travaillez 2 brides", "2 brides"],
  ])("retire un verbe seulement devant une instruction : %s", (source, expected) => {
    expect(normalizeWrittenPatternText(source)).toBe(expected);
  });

  it("conserve les coordinations internes à une instruction", () => {
    expect(normalizeWrittenPatternText("1 ms et 1 br dans la même maille"))
      .toBe("1 ms et 1 br dans la même maille");
  });
});
