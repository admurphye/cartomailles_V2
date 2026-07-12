import { ReactNode } from "react";
import { colors } from "@/app/theme/colors";
import { spacing } from "@/app/theme/spacing";
import { typography } from "@/app/theme/typography";

type PanelTitleProps = {
  title: string;
  icon?: ReactNode;
};

export default function PanelTitle({
  title,
  icon,
}: PanelTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.xs,
        color: colors.text,
        fontWeight: 600,
        fontSize: typography.h3,
      }}
    >
      {icon}
      <span>{title}</span>
    </div>
  );
}