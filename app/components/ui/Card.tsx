import { ReactNode } from "react";
import { colors } from "@/app/theme/colors";
import { radius } from "@/app/theme/radius";
import { spacing } from "@/app/theme/spacing";
import { shadows } from "@/app/theme/shadows";

type CardProps = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export default function Card({
  title,
  subtitle,
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
  <>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.xs,
        fontWeight: 600,
        color: colors.text,
        fontSize: 18,
      }}
    >
        
      {icon}
      {title}
    </div>

    <div
      style={{
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: spacing.lg,
        lineHeight: 1.5,
      }}
    >
      Choisissez la forme du diagramme.
    </div>
  </>
)}

      {children}
    </div>
  );
}