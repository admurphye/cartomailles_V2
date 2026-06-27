import { ReactNode, cloneElement, isValidElement } from "react";
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
  const styledIcon =
    isValidElement(icon)
      ? cloneElement(icon as React.ReactElement, {
          size: 18,
          strokeWidth: 1.75,
          color: colors.secondary,
        })
      : icon;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.xs,
        color: colors.text,
        fontWeight: 600,
        fontSize: typography.subtitle,
      }}
    >
      {styledIcon}
      <span>{title}</span>
    </div>
  );
}