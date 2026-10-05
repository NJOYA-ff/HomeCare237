import React from "react";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  tone = "neutral",
  className = "",
}) => (
  <span className={`hc-status-badge hc-status-badge--${tone} ${className}`.trim()}>
    {children}
  </span>
);

export default StatusBadge;
