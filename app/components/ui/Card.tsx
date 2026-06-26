import { ReactNode } from "react";
import { colors } from "@/app/theme/colors";
import { radius } from "@/app/theme/radius";
import { spacing } from "@/app/theme/spacing";
import { shadows } from "@/app/theme/shadows";

type CardProps = {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export default function Card({
  title,
  icon,
  children,
}: CardProps) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.large,
        padding: spacing.lg,
        boxShadow: shadows.card,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.md,
            fontWeight: 600,
            color: colors.text,
            fontSize: 18,
          }}
        >
          {icon}
          {title}
        </div>
      )}

      {children}
    </div>
  );
}