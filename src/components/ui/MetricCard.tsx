import React from "react";
import { IonCard, IonCardContent, IonIcon } from "@ionic/react";

type MetricTone = "blue" | "green" | "amber" | "red" | "violet" | "neutral";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: string;
  tone?: MetricTone;
  onClick?: () => void;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  note,
  icon,
  tone = "blue",
  onClick,
  className = "",
}) => {
  const Tag = onClick ? "button" : "div";

  return (
    <IonCard className={`hc-metric-card hc-metric-card--${tone} ${className}`.trim()}>
      <IonCardContent>
        <Tag className="hc-metric-card__inner" onClick={onClick}>
          <div>
            <span className="hc-metric-card__label">{label}</span>
            <strong className="hc-metric-card__value">{value}</strong>
            {note && <span className="hc-metric-card__note">{note}</span>}
          </div>
          {icon && (
            <span className="hc-metric-card__icon">
              <IonIcon icon={icon} />
            </span>
          )}
        </Tag>
      </IonCardContent>
    </IonCard>
  );
};

export default MetricCard;
