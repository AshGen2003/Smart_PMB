/**
 * Plain-HTML legend for single-series, per-category-colored charts (a Pie,
 * or a Bar with one <Cell> per category) — recharts v3's <Legend> only
 * auto-populates from each chart *series* (one entry per <Bar>/<Line>
 * element), not from individual <Cell> colors within one series, and its
 * Props type no longer accepts a manual `payload` override (see
 * node_modules/recharts/types/component/Legend.d.ts — payload is Omit'd).
 * Rendered as a sibling below the chart's ResponsiveContainer, not inside
 * the SVG tree.
 */
export type ChartLegendItem = { label: string; color: string };

export default function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0.9rem",
        marginTop: "0.5rem",
        fontSize: "12px",
        color: "var(--text-muted)",
      }}
    >
      {items.map((item) => (
        <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
