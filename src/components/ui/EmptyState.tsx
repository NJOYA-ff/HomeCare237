import React from "react";
import { IonButton, IonIcon } from "@ionic/react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => (
  <div className={`hc-empty-state ${className}`.trim()}>
    {icon && (
      <div className="hc-empty-state__icon">
        <IonIcon icon={icon} />
      </div>
    )}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {actionLabel && onAction && (
      <IonButton onClick={onAction} size="small">
        {actionLabel}
      </IonButton>
    )}
  </div>
);

export default EmptyState;
