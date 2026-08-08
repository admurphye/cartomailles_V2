import { CSSProperties } from "react";
import { colors } from "@/app/theme/colors";

type InputProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  ariaLabel?: string;
  style?: CSSProperties;
};

export default function Input({
  value,
  onChange,
  placeholder,
  ariaLabel,
  style,
}: InputProps) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        background: colors.workspace,
        color: colors.text,
        fontSize: "15px",
        outline: "none",
        ...style,
      }}
    />
  );
}
