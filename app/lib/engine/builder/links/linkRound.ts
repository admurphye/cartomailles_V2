import { CrochetPattern } from "../../model/CrochetPattern";
import { Stitch } from "../../model/Stitch";
import { Link } from "../../model/Link";

export function linkRound(
  pattern: CrochetPattern,
  stitches: Stitch[],
  links: Link[]
) {
  let linkId = 1;

  // Regroupement des mailles par rang
  const stitchesByRound = new Map<number, Stitch[]>();

  for (const stitch of stitches) {
    if (!stitchesByRound.has(stitch.round)) {
      stitchesByRound.set(stitch.round, []);
    }

    stitchesByRound.get(stitch.round)!.push(stitch);
  }

  // Tri des mailles
  for (const round of stitchesByRound.values()) {
    round.sort((a, b) => a.order - b.order);
  }

  // Liens internes aux chaînettes, y compris au premier rang/tour.
  for (const round of pattern.rounds) {
    const current = stitchesByRound.get(round.number) ?? [];
    let childCursor = 0;
    let previousChainStitch: Stitch | null = null;

    for (const instruction of round.instructions) {
      for (let repeat = 0; repeat < instruction.count; repeat++) {
        const children = current.slice(
          childCursor,
          childCursor + instruction.produces
        );

        if (instruction.type === "ch") {
          for (const child of children) {
            if (previousChainStitch) {
              links.push({
                id: String(linkId++),
                from: previousChainStitch.id,
                to: child.id,
                type: "chain",
              });
            }

            previousChainStitch = child;
          }
        } else {
          previousChainStitch = null;
        }

        childCursor += instruction.produces;
      }
    }
  }

  // Liens entre les rangs
  for (let r = 1; r < pattern.rounds.length; r++) {
    const previous =
      stitchesByRound.get(pattern.rounds[r - 1].number) ?? [];

    const current =
      stitchesByRound.get(pattern.rounds[r].number) ?? [];

    let parentCursor = 0;
    let childCursor = 0;

    for (const instruction of pattern.rounds[r].instructions) {
      for (let repeat = 0; repeat < instruction.count; repeat++) {
        const parents = previous.slice(
          parentCursor,
          parentCursor + instruction.consumes
        );

        const children = current.slice(
          childCursor,
          childCursor + instruction.produces
        );

        if (instruction.type === "ch") {
          childCursor += instruction.produces;
          continue;
        }

        for (const parent of parents) {
          for (const child of children) {
            links.push({
              id: String(linkId++),
              from: parent.id,
              to: child.id,
              type:
                instruction.produces > instruction.consumes
                  ? "increase"
                  : instruction.produces < instruction.consumes
                  ? "decrease"
                  : "normal",
            });
          }
        }

        parentCursor += instruction.consumes;
        childCursor += instruction.produces;
      }
    }
  }
}
