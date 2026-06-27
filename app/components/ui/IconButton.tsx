import { ReactNode } from "react";
import { colors } from "@/app/theme/colors";
import { radius } from "@/app/theme/radius";

type IconButtonProps = {
  icon: ReactNode;
  onClick: () => void;
};

export default function IconButton({
  icon,
  onClick,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.medium,
        color: colors.text,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}