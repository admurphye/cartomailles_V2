import { ReactNode, useState } from "react";
import { colors } from "@/app/theme/colors";
import { radius } from "@/app/theme/radius";

type IconButtonProps = {
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  label?: string;
  disabled?: boolean;
};

export default function IconButton({
  icon,
  onClick,
  active,
  label,
  disabled = false,
}: IconButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 38,
        height: 38,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: disabled
  ? colors.surface
  : active
  ? colors.primary
  : hover
  ? colors.rowOdd
  : colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.medium,
        color: disabled ? colors.textSecondary : colors.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.15s ease",
        boxShadow: active
  ? "0 0 0 2px rgba(255,255,255,0.15)"
  : hover
          ? "0 4px 10px rgba(0,0,0,0.20)"
          : "0 1px 3px rgba(0,0,0,0.10)",
        transform: !disabled && hover ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {icon}
    </button>
  );
}
