import { PositionedGroup } from "../model/PositionedGroup";
import { PositionedStitch } from "../model/PositionedStitch";

export function explodeGroups(
  groups: PositionedGroup[]
): PositionedStitch[] {

  const stitches: PositionedStitch[] = [];

  const spacing = 16;

  for (const group of groups) {

    const count = group.stitches.length;

    for (let i = 0; i < count; i++) {

      const offset =
        (i - (count - 1) / 2) * spacing;

      let x: number;
let y: number;

if (group.orientation === "horizontal") {

  x = group.centerX + offset;
  y = group.centerY;

} else {

  x =
    group.centerX +
    offset * Math.cos(group.rotation + Math.PI / 2);

  y =
    group.centerY +
    offset * Math.sin(group.rotation + Math.PI / 2);

}

      stitches.push({
        ...group.stitches[i],
        x,
        y,
        rotation: group.rotation * 180 / Math.PI,
      });

    }

  }

  return stitches;
}
