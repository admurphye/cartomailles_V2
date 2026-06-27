import { ReactNode } from "react";
import { colors } from "@/app/theme/colors";
import { radius } from "@/app/theme/radius";
import { spacing } from "@/app/theme/spacing";

type ToolbarButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
};

export default function ToolbarButton({
  children,
  icon,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.xs,
        padding: "8px 14px",
        background: colors.card,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.medium,
        cursor: "pointer",
        transition: "0.2s",
      }}
    >
      {icon}
      {children}
    </button>
  );
}