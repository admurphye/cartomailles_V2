import { colors } from "@/app/theme/colors";
import { ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  onClick: () => void;
};

export default function PrimaryButton({
  children,
  onClick,
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px",
        border: "none",
        borderRadius: "12px",
        background: colors.primary,
        color: colors.text,
        fontSize: "16px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 6px 18px rgba(217,140,168,0.30)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 10px 24px rgba(217,140,168,0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 6px 18px rgba(217,140,168,0.30)";
      }}
    >
      {children}
    </button>
  );
}