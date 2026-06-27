import Card from "@/app/components/ui/Card";
import { CROCHET_SYMBOLS } from "@/app/lib/crochetSymbols";

export default function SymbolsPanel() {
  return (
    <Card
      title="Symboles"
      icon={<span>🧶</span>}
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

        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
          }}
        >
          {Object.entries(CROCHET_SYMBOLS).map(
            ([key, value]) => (
              <li key={key}>
                {key} — {value.name}
              </li>
            )
          )}
        </ul>
      </details>
    </Card>
  );
}