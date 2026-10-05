import type {
  Chart,
  ChartOptions,
  ChartType,
  Plugin,
  ScriptableContext,
} from "chart.js";

/**
 * Soft pastel dashboard chart theme.
 *
 * Matches the light lavender admin dashboard reference:
 * - white rounded cards with soft shadows
 * - violet (#7c5cff) as the primary series colour
 * - smooth area lines with round data points
 * - faint horizontal-only grid, muted grey axis text
 * - white rounded tooltips with a light violet border
 * - donut/ring charts with a big centre value (gauge style)
 */

export const SOFT_COLORS = {
  violet: "#7c5cff",
  indigo: "#6d3af5",
  lavender: "#a78bfa",
  sky: "#60a5fa",
  mint: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  ink: "#232839",
  panel: "#ffffff",
  track: "#efe9fb",
  grid: "rgba(148, 153, 175, 0.18)",
  axis: "rgba(148, 153, 175, 0.35)",
  text: "#3b4054",
  muted: "#9298ad",
};

export const softPalette = [
  SOFT_COLORS.violet,
  SOFT_COLORS.lavender,
  SOFT_COLORS.sky,
  SOFT_COLORS.mint,
  SOFT_COLORS.amber,
  SOFT_COLORS.rose,
  SOFT_COLORS.indigo,
  "#c084fc",
];

/** Faint lavender wash so charts sit on the soft card like the reference. */
export const softChartPlugin: Plugin = {
  id: "softChartBackdrop",
  beforeDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const { left, top, width, height } = chartArea;
    ctx.save();

    const wash = ctx.createLinearGradient(0, top, 0, top + height);
    wash.addColorStop(0, "rgba(124, 92, 255, 0.05)");
    wash.addColorStop(1, "rgba(124, 92, 255, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(left, top, width, height);
    ctx.restore();
  },
};

/** Gentle top-to-transparent area fill under the line. */
export function softLineFill(color: string) {
  return (context: ScriptableContext<"line">) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return `${color}33`;

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `${color}59`);
    gradient.addColorStop(0.6, `${color}1f`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
  };
}

export const softTooltip = {
  backgroundColor: "rgba(255, 255, 255, 0.98)",
  borderColor: "rgba(124, 92, 255, 0.25)",
  borderWidth: 1,
  titleColor: SOFT_COLORS.ink,
  bodyColor: SOFT_COLORS.text,
  titleFont: { size: 12, weight: "bold" as const, family: "Inter, system-ui, sans-serif" },
  bodyFont: { size: 11, family: "Inter, system-ui, sans-serif" },
  padding: 10,
  cornerRadius: 10,
  displayColors: true,
  boxPadding: 5,
};

export const softLegend = {
  position: "bottom" as const,
  labels: {
    usePointStyle: true,
    pointStyle: "circle" as const,
    padding: 14,
    boxWidth: 8,
    boxHeight: 8,
    color: SOFT_COLORS.muted,
    font: { size: 11, family: "Inter, system-ui, sans-serif" },
  },
};

export const softScales = {
  x: {
    border: { display: false },
    grid: { display: false, drawTicks: false },
    ticks: {
      color: SOFT_COLORS.muted,
      font: { size: 11, family: "Inter, system-ui, sans-serif" },
    },
  },
  y: {
    beginAtZero: true,
    border: { display: false },
    grid: {
      color: SOFT_COLORS.grid,
      drawTicks: false,
    },
    ticks: {
      color: SOFT_COLORS.muted,
      font: { size: 11, family: "Inter, system-ui, sans-serif" },
      padding: 8,
    },
  },
};

export interface SoftCenterTextConfig {
  value?: string | number;
  label?: string;
  color?: string;
  subColor?: string;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    softCenterText?: SoftCenterTextConfig;
  }
}

/** Big centre value + muted caption, like the gauge card in the reference. */
export const softCenterTextPlugin: Plugin = {
  id: "softCenterText",
  afterDraw(chart: Chart) {
    const cfg = (
      chart.options.plugins as { softCenterText?: SoftCenterTextConfig } | undefined
    )?.softCenterText;
    if (!cfg || (cfg.value === undefined && !cfg.label)) return;

    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const arc = chart.getDatasetMeta(0)?.data?.[0] as { x?: number; y?: number } | undefined;
    const cx = typeof arc?.x === "number" ? arc.x : (chartArea.left + chartArea.right) / 2;
    const cy = typeof arc?.y === "number" ? arc.y : (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (cfg.value !== undefined) {
      ctx.fillStyle = cfg.color ?? SOFT_COLORS.ink;
      ctx.font = "700 26px Inter, system-ui, sans-serif";
      ctx.fillText(String(cfg.value), cx, cy - (cfg.label ? 9 : 0));
    }
    if (cfg.label) {
      ctx.fillStyle = cfg.subColor ?? SOFT_COLORS.muted;
      ctx.font = "500 11px Inter, system-ui, sans-serif";
      ctx.fillText(cfg.label, cx, cy + (cfg.value !== undefined ? 15 : 0));
    }
    ctx.restore();
  },
};

export const softDoughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "72%",
  plugins: {
    legend: softLegend,
    tooltip: softTooltip,
  },
  animation: {
    animateRotate: true,
    duration: 1100,
    easing: "easeOutQuart",
  },
};

// ─── Soft gauge (Customer-Insights style) ─────────────────────────────────────

/** Light lavender track used for the unfilled part of the gauge fan. */
export const SOFT_GAUGE_TRACK = "#ece7fb";

function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const clamped = Math.max(0, Math.min(1, t));
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r1 + (r2 - r1) * clamped)}${toHex(g1 + (g2 - g1) * clamped)}${toHex(
    b1 + (b2 - b1) * clamped,
  )}`;
}

/**
 * Builds the segmented fan data used by the soft gauge: `segments` equal
 * slices where the first `percent`% are violet (light → deep gradient) and
 * the remainder use the lavender track colour.
 */
export function buildSoftGauge(
  percent: number,
  segments = 26,
): { data: number[]; backgroundColor: string[] } {
  const pct = Math.max(0, Math.min(100, percent));
  const filled = Math.round((pct / 100) * segments);
  const data = new Array(segments).fill(1);
  const backgroundColor = data.map((_, i) => {
    if (i >= filled) return SOFT_GAUGE_TRACK;
    const t = filled <= 1 ? 1 : i / (filled - 1);
    return mixHex(SOFT_COLORS.lavender, SOFT_COLORS.indigo, t);
  });
  return { data, backgroundColor };
}

/**
 * Semicircle fan gauge matching the reference dashboard: 210° arc opening
 * downward, thin rounded segments and a big centre value drawn by
 * `softCenterTextPlugin`.
 */
export const softGaugeOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  circumference: 210,
  rotation: 255,
  cutout: "72%",
  layout: { padding: 6 },
  elements: {
    arc: {
      borderRadius: 6,
      borderWidth: 0,
    },
  },
  plugins: {
    legend: { display: false },
    // Segment tooltips carry no meaning on the fan gauge.
    tooltip: { enabled: false },
  },
  animation: {
    animateRotate: true,
    duration: 1200,
    easing: "easeOutQuart",
  },
};

// ─── KPI card helpers ─────────────────────────────────────────────────────────

/**
 * Normalises a series into bar heights (18–100) for the mini sparkline strip
 * drawn in the KPI cards. A flat series returns uniform mid-height bars.
 */
export function sparkBarHeights(series: number[], min = 18, max = 100): number[] {
  if (series.length === 0) return [];
  const finite = series.map((v) => (Number.isFinite(v) ? v : 0));
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  if (hi === lo) {
    const mid = Math.round((min + max) / 2);
    return finite.map(() => mid);
  }
  return finite.map((v) => Math.round(min + ((v - lo) / (hi - lo)) * (max - min)));
}

/**
 * Percentage change of the last value against the previous one, or `null`
 * when a meaningful ratio cannot be computed (fewer than two points or a
 * zero baseline).
 */
export function seriesDelta(series: number[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2];
  const curr = series[series.length - 1];
  if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Key format used to bucket data by month: "Sep 26". */
export function monthKeyFor(date: Date): string {
  return `${MONTH_ABBR[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
}

/** The `count` month keys ending with the current month, oldest first. */
export function recentMonthKeys(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKeyFor(d));
  }
  return keys;
}

/**
 * Counts how many dates fall in each bucket (keys produced by
 * `recentMonthKeys`/`monthKeyFor`), oldest first. Unparseable dates are
 * skipped so partial datasets still render honestly.
 */
export function bucketByMonth(
  dates: Array<Date | null | undefined>,
  keys: string[],
): number[] {
  const counts = keys.map(() => 0);
  dates.forEach((date) => {
    if (!date || Number.isNaN(date.getTime())) return;
    const idx = keys.indexOf(monthKeyFor(date));
    if (idx >= 0) counts[idx] += 1;
  });
  return counts;
}

export const softBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: softTooltip,
  },
  scales: softScales,
  animation: {
    duration: 900,
    easing: "easeOutQuart",
  },
};

export const softHorizontalBarOptions: ChartOptions<"bar"> = {
  ...softBarOptions,
  indexAxis: "y",
};

export const softLineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index",
  },
  plugins: {
    legend: softLegend,
    tooltip: softTooltip,
  },
  scales: softScales,
  elements: {
    line: {
      tension: 0.42,
      borderWidth: 3,
      borderCapStyle: "round",
      borderJoinStyle: "round",
    },
    point: {
      radius: 3.5,
      hoverRadius: 6.5,
      hitRadius: 14,
      borderWidth: 2,
      backgroundColor: SOFT_COLORS.violet,
    },
  },
  animation: {
    duration: 1200,
    easing: "easeOutQuart",
  },
};
