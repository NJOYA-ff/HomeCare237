/**
 * ResultSheet
 *
 * Bottom-sheet result feedback for actions that talk to the network (e.g.
 * booking an appointment). Styled like the doctor-rating sheet on the patient
 * appointments page: 24px rounded top corners, centred icon + copy and
 * pill-shaped actions.
 *
 *   success → one "OK" action that simply acknowledges the result
 *   error   → a "Retry" action that re-runs the failed request, plus an
 *             optional "Close" action so the patient is never trapped
 *
 * Callers own the outcome state; the sheet only renders it. Every action
 * handler is expected to close the sheet (or the parent closes it), and
 * `onDismiss` only covers backdrop / hardware-back / Escape dismissals.
 */
import React, { useId } from "react";
import { IonButton, IonIcon, IonModal } from "@ionic/react";
import { alertCircle, checkmarkCircle, refresh } from "ionicons/icons";

export type ResultSheetStatus = "success" | "error";

export interface ResultSheetProps {
  isOpen: boolean;
  status: ResultSheetStatus;
  title: string;
  message?: string;
  /** Primary action label. Defaults to "OK" for success and "Retry" for errors. */
  actionLabel?: string;
  /** Primary action handler (acknowledge the success / retry the failure). */
  onAction?: () => void;
  /** Optional secondary action; rendered only when label *and* handler exist. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Fired when the sheet is dismissed without pressing an action button. */
  onDismiss?: () => void;
  className?: string;
}

const RESULT_ICONS: Record<ResultSheetStatus, string> = {
  success: checkmarkCircle,
  error: alertCircle,
};

const ResultSheet: React.FC<ResultSheetProps> = ({
  isOpen,
  status,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  onDismiss,
  className = "",
}) => {
  const titleId = useId();
  const messageId = useId();

  const isSuccess = status === "success";
  const actionText = actionLabel ?? (isSuccess ? "OK" : "Retry");
  const showSecondary = Boolean(secondaryLabel && onSecondary);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={() => onDismiss?.()}
      className={`hc-result-sheet-modal ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
    >
      <div
        className={`hc-result-sheet hc-result-sheet--${status}`}
        aria-live={isSuccess ? "polite" : "assertive"}
      >
        <div className="hc-result-sheet__icon" aria-hidden="true">
          <IonIcon icon={RESULT_ICONS[status]} />
        </div>

        <h2 className="hc-result-sheet__title" id={titleId}>
          {title}
        </h2>

        {message && (
          <p className="hc-result-sheet__message" id={messageId}>
            {message}
          </p>
        )}

        <div className="hc-result-sheet__actions">
          {showSecondary && (
            <IonButton
              fill="outline"
              color="medium"
              className="hc-result-sheet__secondary"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </IonButton>
          )}

          <IonButton
            fill="solid"
            color="primary"
            className="hc-result-sheet__primary"
            onClick={onAction}
          >
            <IonIcon
              slot="start"
              icon={isSuccess ? checkmarkCircle : refresh}
              aria-hidden="true"
            />
            {actionText}
          </IonButton>
        </div>
      </div>
    </IonModal>
  );
};

export default ResultSheet;
