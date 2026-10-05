import React from "react";

type SkeletonVariant =
  | "text"
  | "title"
  | "metric"
  | "pill"
  | "avatar"
  | "button"
  | "card";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
}

const toCss = (value?: string | number) =>
  typeof value === "number" ? `${value}px` : value;

/**
 * Single shimmering placeholder block.
 * Always `aria-hidden` — the surrounding group announces loading to AT.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  radius,
  className = "",
}) => (
  <span
    aria-hidden="true"
    className={`hc-skeleton hc-skeleton--${variant} ${className}`.trim()}
    style={{ width: toCss(width), height: toCss(height), borderRadius: toCss(radius) }}
  />
);

interface SkeletonGroupProps {
  /** Screen-reader message, e.g. "Loading your vitals". */
  label?: string;
  rows?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Accessible wrapper that announces a loading region once, then renders
 * shimmering placeholders instead of a full-page spinner.
 */
export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  label = "Loading",
  rows,
  className = "",
  children,
}) => (
  <div
    className={`hc-skeleton-group ${className}`.trim()}
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span className="hc-visually-hidden">{label}</span>
    {children ??
      Array.from({ length: rows ?? 3 }, (_, i) => <Skeleton key={i} variant="text" />)}
  </div>
);

interface SkeletonCardProps {
  /** Number of text lines under the card title. */
  lines?: number;
  /** Render the card as a metric tile (label + big value) instead of a list row. */
  metric?: boolean;
  className?: string;
}

/**
 * Placeholder that mirrors a real `IonCard` so layout does not shift on load.
 * Visual only — wrap in `SkeletonGroup` so assistive tech announces loading once.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  metric = false,
  className = "",
}) => (
  <div className={`hc-panel ${className}`.trim()} style={{ padding: 16 }} aria-hidden="true">
    {metric ? (
      <div className="hc-skeleton-group">
        <Skeleton variant="text" width="45%" />
        <Skeleton variant="metric" width="60%" />
      </div>
    ) : (
      <div className="hc-skeleton-group">
        <Skeleton variant="title" width="55%" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} variant="text" width={i === lines - 1 ? "70%" : "100%"} />
        ))}
      </div>
    )}
  </div>
);

interface SkeletonListProps {
  rows?: number;
  className?: string;
}

/**
 * Avatar + two-line row placeholders for list/detail screens.
 * Visual only — wrap in `SkeletonGroup`.
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  rows = 5,
  className = "",
}) => (
  <div
    className={`hc-skeleton-group ${className}`.trim()}
    style={{ gap: 14 }}
    aria-hidden="true"
  >
    {Array.from({ length: rows }, (_, i) => (
      <div className="hc-skeleton-row" key={i}>
        <Skeleton variant="avatar" />
        <div className="hc-skeleton-group" style={{ gap: 8 }}>
          <Skeleton variant="text" width="62%" />
          <Skeleton variant="text" width="85%" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
