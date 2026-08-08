import { colors } from "@/app/theme/colors";

interface Props {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function NormalLink({
  x1,
  y1,
  x2,
  y2,
}: Props) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={colors.border}
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}