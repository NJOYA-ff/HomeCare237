import React from "react";
import { IonCard, IonIcon } from "@ionic/react";
import { trendingDown, trendingUp } from "ionicons/icons";
import { sparkBarHeights } from "./softChartTheme";
import "./SoftChartCards.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiFooterItem {
  label: string;
  value: React.ReactNode;
}

export interface SoftKpiCardProps {
  /** Ionicon name shown in the rounded chip. */
  icon: string;
  label: string;
  value: React.ReactNode;
  /** Percentage change rendered as a green/rose pill (e.g. 43 → "+43%"). */
  delta?: number | null;
  /** Mini bar-strip series, oldest → newest. */
  series?: number[];
  /** Footer row ("This Month" / "Target") shown under a divider. */
  footers?: [KpiFooterItem, KpiFooterItem];
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export interface SoftChartCardProps {
  icon: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned control shown as a soft pill (e.g. "This week"). */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export interface SoftStatChip {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  color?: string;
}

export interface SoftLegendRow {
  label: string;
  /** Small muted text shown after the label (e.g. location or status). */
  hint?: string;
  value: React.ReactNode;
  delta?: number | null;
  /** Dot colour; `null` hides the dot (plain list rows). */
  color?: string | null;
  /** Optional 0–100 share rendered as a thin progress bar. */
  pct?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a percentage delta as the green/rose pill used across the cards. */
export function formatDelta(delta: number | null | undefined): string | null {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return null;
  const rounded = Math.round(delta);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function DeltaPill({
  delta,
  className = "",
}: {
  delta: number | null | undefined;
  className?: string;
}) {
  const text = formatDelta(delta);
  if (!text) return null;
  const direction = (delta ?? 0) >= 0 ? "up" : "down";
  return (
    <span className={`soft-delta soft-delta--${direction} ${className}`.trim()}>
      <IonIcon icon={direction === "up" ? trendingUp : trendingDown} />
      {text}
    </span>
  );
}

// ─── KPI stat card (reference: top-row revenue/customers/goal cards) ─────────

export const SoftKpiCard: React.FC<SoftKpiCardProps> = ({
  icon,
  label,
  value,
  delta,
  series,
  footers,
  onClick,
  className = "",
  children,
}) => {
  const bars = series && series.length > 0 ? sparkBarHeights(series) : [];

  return (
    <IonCard
      className={`soft-kpi ${onClick ? "soft-kpi--tappable" : ""} ${className}`.trim()}
      onClick={onClick}
    >
      <div className="soft-kpi__head">
        <span className="soft-kpi__icon" aria-hidden="true">
          <IonIcon icon={icon} />
        </span>
        <span className="soft-kpi__label">{label}</span>
      </div>

      <div className="soft-kpi__value-row">
        <span className="soft-kpi__value">{value}</span>
        <DeltaPill delta={delta} />
      </div>

      {bars.length > 0 && (
        <div
          className="soft-kpi__spark"
          role="img"
          aria-label={`${label} trend`}
        >
          {bars.map((height, i) => (
            <span
              key={i}
              className={`soft-kpi__bar ${
                i === bars.length - 1 ? "soft-kpi__bar--current" : ""
              }`.trim()}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      )}

      {footers && (
        <div className="soft-kpi__footers">
          {footers.map((footer) => (
            <div key={footer.label} className="soft-kpi__footer">
              <span className="soft-kpi__footer-label">{footer.label}</span>
              <span className="soft-kpi__footer-value">{footer.value}</span>
            </div>
          ))}
        </div>
      )}

      {children}
    </IonCard>
  );
};

// ─── Chart card with icon/title/subtitle/pill header ─────────────────────────

export const SoftChartCard: React.FC<SoftChartCardProps> = ({
  icon,
  title,
  subtitle,
  action,
  className = "",
  children,
}) => (
  <IonCard className={`soft-chart-card ${className}`.trim()}>
    <div className="soft-chart-card__head">
      <span className="soft-chart-card__icon" aria-hidden="true">
        <IonIcon icon={icon} />
      </span>
      <div className="soft-chart-card__titles">
        <h3 className="soft-chart-card__title">{title}</h3>
        {subtitle && <p className="soft-chart-card__subtitle">{subtitle}</p>}
      </div>
      {action && <span className="soft-chart-card__action">{action}</span>}
    </div>
    {children}
  </IonCard>
);

// ─── Stat chips row (reference: Order/Revenue/Return/Avg. cart) ──────────────

export const SoftStatChips: React.FC<{ chips: SoftStatChip[] }> = ({ chips }) => (
  <div className="soft-stat-chips">
    {chips.map((chip) => (
      <div key={chip.label} className="soft-stat-chip">
        <span className="soft-stat-chip__label">{chip.label}</span>
        <span className="soft-stat-chip__row">
          <span
            className="soft-stat-chip__value"
            style={chip.color ? { color: chip.color } : undefined}
          >
            {chip.value}
          </span>
          <DeltaPill delta={chip.delta} />
        </span>
      </div>
    ))}
  </div>
);

// ─── Legend/list rows (reference: buyer insights + inventory rows) ───────────

export const SoftLegendRows: React.FC<{ rows: SoftLegendRow[] }> = ({ rows }) => (
  <div className="soft-legend-rows">
    {rows.map((row, index) => (
      <div key={`${row.label}-${index}`} className="soft-legend-row">
        <div className="soft-legend-row__main">
          {row.color !== null && (
            <span
              className="soft-legend-row__dot"
              style={{ background: row.color ?? "#7c5cff" }}
              aria-hidden="true"
            />
          )}
          <span className="soft-legend-row__label">{row.label}</span>
          {row.hint && <span className="soft-legend-row__hint">{row.hint}</span>}
          <span className="soft-legend-row__value">{row.value}</span>
          <DeltaPill delta={row.delta} />
        </div>
        {row.pct !== undefined && (
          <div className="soft-legend-row__track" aria-hidden="true">
            <span
              className="soft-legend-row__fill"
              style={{
                width: `${Math.max(0, Math.min(100, row.pct))}%`,
                background: row.color ?? undefined,
              }}
            />
          </div>
        )}
      </div>
    ))}
  </div>
);

export default SoftKpiCard;