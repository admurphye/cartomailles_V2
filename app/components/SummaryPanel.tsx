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
  <>
      <h3>📊 Résumé</h3>

      <p>
        🪄 Premier rang : {firstRoundCount}
      </p>

      <p>
        🔄 Tours : {roundCounts.length}
      </p>

      <p>
        🧵 Mailles finales :{" "}
        {roundCounts.length > 0
          ? roundCounts[roundCounts.length - 1]
          : 0}
      </p>

      <hr
        style={{
          borderColor: "#333",
          margin: "10px 0",
        }}
      />

      <pre
        style={{
          fontSize: "14px",
          lineHeight: "1.6",
          color: "#ddd",
        }}
      >
        {analysis}
      </pre>
    </>
);
}