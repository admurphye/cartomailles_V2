import { colors } from "@/app/theme/colors";

type SummaryPanelProps = {
  firstRoundCount: number;
  roundCounts: number[];
  analysis: string;
};

export default function SummaryPanel({
  firstRoundCount,
  roundCounts,
  analysis,
}: SummaryPanelProps) {
  return (
  <div
    style={{
      background: colors.workspace,
      border: `1px solid ${colors.border}`,
      borderRadius: "18px",
      padding: "20px",
      marginBottom: "20px",
    }}
  >
    <h3
      style={{
        marginTop: 0,
        marginBottom: "20px",
      }}
    >
      📊 Résumé
    </h3>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "15px",
      }}
    >
      <div
        style={{
          flex: 1,
          background: colors.workspace,
          borderRadius: "12px",
          padding: "15px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: colors.textSecondary }}>
          Premier rang
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {firstRoundCount}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: colors.workspace,
          borderRadius: "12px",
          padding: "15px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: colors.textSecondary }}>
          Tours
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {roundCounts.length}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: colors.workspace,
          borderRadius: "12px",
          padding: "15px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: colors.textSecondary }}>
          Mailles
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {roundCounts.length > 0
            ? roundCounts[roundCounts.length - 1]
            : 0}
        </div>
      </div>
    </div>

    <hr
      style={{
        borderColor: colors.border,
        margin: "25px 0",
      }}
    />

    <pre
      style={{
        fontSize: "14px",
        lineHeight: "1.6",
        color: colors.text,
        whiteSpace: "pre-wrap",
      }}
    >
      {analysis}
    </pre>
  </div>
);
}