import { Link as CrochetLink } from "@/app/lib/engine/model/Link";
import { PositionedStitch } from "@/app/lib/engine/model/PositionedStitch";

import NormalLink from "./links/NormalLink";
import IncreaseLink from "./links/IncreaseLink";
import DecreaseLink from "./links/DecreaseLink";
import ChainLink from "./links/ChainLink";

interface Props {
  link: CrochetLink;
  stitches: PositionedStitch[];
}

export default function Link({
  link,
  stitches,
}: Props) {
  const from = stitches.find((s) => s.id === link.from);
  const to = stitches.find((s) => s.id === link.to);

  if (!from || !to) return null;

  switch (link.type) {
    case "increase":
      return (
        <IncreaseLink
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
        />
      );

    case "decrease":
      return (
        <DecreaseLink
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
        />
      );

    case "chain":
      return (
        <ChainLink
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
        />
      );

    default:
      return (
        <NormalLink
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
        />
      );
  }
}