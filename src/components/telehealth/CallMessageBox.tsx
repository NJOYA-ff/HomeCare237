/**
 * CallMessageBox
 *
 * The failure surface for the audio and video call screens, a fixed
 * configuration of the shared `MessageBox`.
 *
 * The colours here are the one deliberate exception to the app-wide rule in
 * MessageBox (confirm action coloured, dismiss action quiet). On a call failure
 * "Cancel" means giving up a call that has already failed and "Try again" means
 * attempting it again, and the design calls for both to be loud solid fills —
 * danger and primary respectively — because neither is the safe default. Every
 * other dialog in the app keeps the dismiss action quiet.
 *
 * A timeout is marked as a clock in the warning colour rather than an alert in
 * danger: "it is taking too long" and "the server refused" are different problems
 * and the user needs to tell them apart to decide whether retrying is worth
 * anything.
 *
 * Cancel dismisses the box only. It does not close the call screen behind it —
 * the caller decides what "giving up" means for its own screen (see the
 * `onCancel` prop), because on the audio screens cancelling means dropping back
 * to a ready-to-dial state, and on video it means leaving. All this component
 * guarantees is that the box goes away and the call screen does not.
 *
 * Callers own the error state and must clear it when either action fires; this
 * component only reports intent.
 */
import React from "react";
import { timeOutline } from "ionicons/icons";

import MessageBox from "../ui/MessageBox";

export interface CallMessageBoxProps {
  isOpen: boolean;
  /** Short headline, e.g. "Call not connected". */
  title: string;
  /** One or two sentences of plain-language detail. */
  message?: string;
  /**
   * Marks the failure as the connect timeout rather than a raised error.
   * Changes the icon, because "it is taking too long" and "the server refused"
   * are different problems and the user needs to tell them apart to decide
   * whether retrying is worth anything.
   */
  timedOut?: boolean;
  /**
   * Gives up on the call. Rendered in `ion-color-danger`, and expected to
   * dismiss the box — whether it also leaves the call screen is the caller's
   * call, since that differs per screen.
   */
  onCancel: () => void;
  /** Attempts the call again. Rendered in `ion-color-primary`. */
  onRetry: () => void;
  cancelLabel?: string;
  retryLabel?: string;
  className?: string;
}

const CallMessageBox: React.FC<CallMessageBoxProps> = ({
  isOpen,
  title,
  message,
  timedOut = false,
  onCancel,
  onRetry,
  cancelLabel = "Cancel",
  retryLabel = "Try again",
  className = "",
}) => (
  <MessageBox
    isOpen={isOpen}
    title={title}
    message={message}
    /* A timeout is a warning, not a failure of the app — it gets the clock and
       the warning colour; anything else is a raised error. */
    tone={timedOut ? "warning" : "danger"}
    icon={timedOut ? timeOutline : undefined}
    /* Cancel first: announced before the recovery action, and left of Try again
       to match the reading order. Both solid — the colour is the only thing
       distinguishing them. */
    actions={[
      { label: cancelLabel, color: "danger", onClick: onCancel },
      { label: retryLabel, color: "primary", onClick: onRetry },
    ]}
    /* Focus lands on Try again, not Cancel: retrying is what most people want
       here, and it is recoverable, whereas cancelling is not. */
    focusActionIndex={1}
    onDismiss={onCancel}
    className={className}
  />
);

export default CallMessageBox;
