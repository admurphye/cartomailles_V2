export type ImportedChartSymbol = {
  type: string;
  operation: string;
  round: number;
  order: number;
  role: string;
  groupSize: number;
};

export type ImportedChart = { symbols: ImportedChartSymbol[]; pattern: string };

const CODE: Record<string, string> = { mr: "mr", ch: "ml", slst: "mc", sc: "ms", hdc: "db", dc: "br", fpdc: "brav", bpdc: "brar", popcorn: "popcorn", tr: "tbr", dtr: "dbr" };

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1];
}

function symbolToken(symbol: ImportedChartSymbol) {
  const code = CODE[symbol.type] ?? symbol.type;
  if (symbol.operation === "decrease") return symbol.groupSize === 5 && symbol.type === "fpdc" ? "cluster5_fpdc" : `dim(${code})`;
  if (symbol.operation === "increase") {
    if (symbol.type === "dc" && [5, 6, 9].includes(symbol.groupSize)) return `fan_${symbol.groupSize}_dc`;
    return `aug(${code})`;
  }
  return code;
}

export function parseCartomaillesSvg(source: string): ImportedChart {
  const tags = source.match(/<g\b[^>]*class=["'][^"']*crochet-symbol[^"']*["'][^>]*>/gi) ?? [];
  const symbols = tags.map((tag) => ({
    type: attr(tag, "data-stitch-type") ?? "unknown",
    operation: attr(tag, "data-stitch-operation") ?? "normal",
    round: Number(attr(tag, "data-stitch-round") ?? 0),
    order: Number(attr(tag, "data-stitch-order") ?? 0),
    role: attr(tag, "data-stitch-role") ?? "normal",
    groupSize: Number(attr(tag, "data-stitch-group-size") ?? 1),
  })).filter((symbol) => symbol.type !== "unknown" && symbol.round > 0)
    .sort((a, b) => a.round - b.round || a.order - b.order);

  const rounds = [...new Set(symbols.map((symbol) => symbol.round))];
  const pattern = rounds.map((round) => {
    const items = symbols.filter((symbol) => symbol.round === round);
    const tokens: string[] = [];
    for (let index = 0; index < items.length;) {
      const item = items[index];
      const step = item.operation === "increase" ? Math.max(1, item.groupSize) : 1;
      const token = symbolToken(item);
      let repeats = 1;
      while (index + repeats * step < items.length && symbolToken(items[index + repeats * step]) === token) repeats++;
      tokens.push(`${repeats > 1 ? `${repeats} ` : ""}${token}`);
      index += repeats * step;
    }
    return `R${round} ${tokens.join(", ")}`;
  }).join("\n");
  return { symbols, pattern };
}
