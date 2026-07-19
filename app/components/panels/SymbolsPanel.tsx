import Card from "@/app/components/ui/Card";
import { CROCHET_SYMBOLS } from "@/app/lib/crochetSymbols";
import { Shapes } from "lucide-react";

export default function SymbolsPanel() {
  return (
    <Card
      title="Symboles"
      icon={<Shapes size={17} strokeWidth={1.75} />}
    >
      <details>
        <summary
          style={{
            cursor: "pointer",
            marginBottom: "15px",
          }}
        >
          Afficher les symboles
        </summary>

        <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
  }}
>
  {Object.entries(CROCHET_SYMBOLS).map(([key, value]) => (
    <div
      key={key}
      style={{
        background: "#2B2334",
        border: "1px solid #4A3A57",
        borderRadius: "12px",
        padding: "12px",
        cursor: "pointer",
        transition: "0.2s",
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: "18px",
          color: "#FBF7F2",
        }}
      >
        {key}
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "#C9B8D6",
          marginTop: "4px",
        }}
      >
        {value.name}
      </div>
    </div>
  ))}
</div>
      </details>
    </Card>
  );
}