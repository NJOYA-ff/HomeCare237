import React from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { alertCircleOutline } from "ionicons/icons";

interface ErrorStateProps {
  /** Short, human explanation. Avoid technical jargon here. */
  title: string;
  /** What the user can do next, in one sentence. */
  description?: string;
  /** Technical message (error code, network detail) shown muted below the copy. */
  detail?: string;
  /** Primary recovery action. Label defaults to "Try again". */
  onRetry?: () => void;
  retryLabel?: string;
  /** Optional secondary escape hatch, e.g. "Go back" or "Check connection". */
  onSecondary?: () => void;
  secondaryLabel?: string;
  icon?: string;
  className?: string;
}

/**
 * Recovery-oriented counterpart to `EmptyState`.
 *
 * Roadmap: error states must never be a dead end, so the component always
 * renders at least one action and keeps the technical detail visually quiet
 * instead of dumping a raw exception into the layout.
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  detail,
  onRetry,
  retryLabel = "Try again",
  onSecondary,
  secondaryLabel,
  icon = alertCircleOutline,
  className = "",
}) => (
  <div className={`hc-error-state ${className}`.trim()} role="alert">
    <div className="hc-error-state__icon">
      <IonIcon icon={icon} />
    </div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {(onRetry || (onSecondary && secondaryLabel)) && (
      <div className="hc-error-state__actions">
        {onRetry && (
          <IonButton size="small" onClick={onRetry}>
            {retryLabel}
          </IonButton>
        )}
        {onSecondary && secondaryLabel && (
          <IonButton size="small" fill="outline" onClick={onSecondary}>
            {secondaryLabel}
          </IonButton>
        )}
      </div>
    )}
    {detail && <span className="hc-error-state__detail">{detail}</span>}
  </div>
);

export default ErrorState;
