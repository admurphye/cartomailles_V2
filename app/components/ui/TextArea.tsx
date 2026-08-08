import { CSSProperties } from "react";
import { colors } from "@/app/theme/colors";

type TextAreaProps = {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  placeholder?: string;
  rows?: number;
  style?: CSSProperties;
};

export default function TextArea({
  value,
  onChange,
  placeholder,
  rows = 10,
  style,
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        minHeight: "220px",
        padding: "12px",
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        background: colors.workspace,
        color: colors.text,
        resize: "vertical",
        fontSize: "15px",
        outline: "none",
        ...style,
      }}
    />
  );
}
