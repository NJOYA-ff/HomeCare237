import React from "react";
import MessageBox from "./MessageBox";

interface ConfirmDialogProps {
  isOpen: boolean;
  header: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (delete / clear). */
  destructive?: boolean;
  onConfirm: () => void;
  /** Called only when the dialog is dismissed without confirming. */
  onCancel: () => void;
}

/**
 * One consistent confirmation pattern across the app.
 *
 * A thin wrapper over the shared MessageBox for the common "Are you sure?"
 * shape, so a confirmation never has to be rebuilt from raw IonButtons.
 *
 * Colour follows the app-wide rule: the confirm action carries the meaning
 * (danger when destructive, primary otherwise) and the dismiss action stays
 * quiet, because backing out is the safe default. Focus lands on Cancel rather
 * than the confirm action, so a stray Enter cannot delete.
 *
 * `onCancel` fires for the cancel button and backdrop dismissal, but *not* after
 * a successful confirmation, so callers can safely treat it as "user backed out"
 * and run e.g. navigation.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  header,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}) => (
  <MessageBox
    isOpen={isOpen}
    title={header}
    message={message}
    /* A confirmation is a decision, not a failure — an info-toned icon keeps the
       red reserved for dialogs reporting something that actually went wrong. */
    tone={destructive ? "danger" : "info"}
    actions={[
      { label: cancelLabel, color: "medium", onClick: onCancel },
      {
        label: confirmLabel,
        color: destructive ? "danger" : "primary",
        onClick: onConfirm,
      },
    ]}
    onDismiss={onCancel}
  />
);

export default ConfirmDialog;
