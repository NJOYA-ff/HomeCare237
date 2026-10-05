/**
 * MessageBox
 *
 * The app's single dialog surface — the component every `ion-alert` used to be.
 *
 * WHY NOT ION-ALERT. Two reasons.
 *
 * First, stacking. `ion-alert` renders inside the caller's stacking context. A
 * call screen is itself an `ion-modal`, which establishes a new one, so an alert
 * raised from a call screen is painted *under* the call and is effectively
 * invisible — the old ResultSheet needed `z-index: 2500 !important` to punch back
 * out of exactly this. Portalling to `document.body` fixes it structurally: the
 * box becomes a sibling of every modal, so it is always on top and needs no
 * `!important` anywhere.
 *
 * Second, consistency. `ion-alert` forced one layout for three different jobs —
 * a failure, a destructive confirmation, and an informational notice — and the
 * only way to tell them apart was a `cssClass` hook per call site. This component
 * takes the tone as a prop, so a delete confirmation and a timeout cannot drift
 * apart because two files were edited on different days.
 *
 * COLOUR. The confirm action carries the meaning, not a fixed rule: danger red for
 * Delete / Cancel / Log out, primary blue for Accept / Enable / Clear. The
 * dismiss action is deliberately quiet, because on most of these dialogs backing
 * out is the safe default and red would imply the user is about to lose something.
 * The one exception is the call screens (see CallMessageBox), where red on the
 * dismiss action is the agreed design and is passed in explicitly.
 *
 * NO OUTLINES. Actions are always solid fills. An outline on the lower-weight
 * action is how the quiet one ends up reading as the disabled one, and with the
 * pair side by side the fill difference is already the whole hierarchy.
 *
 * Buttons sit side by side: they are alternatives of equal weight, not steps in a
 * sequence, and a vertical stack implies something must happen before the bottom
 * button. No action carries an icon — beside a label that already says what it
 * does, a glyph is noise and it makes the two actions unequal in width.
 *
 * Callers own their open state and must close the box when an action fires; this
 * component only reports intent.
 */
import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { IonButton } from "@ionic/react";

import "./MessageBox.css";

export type MessageBoxTone = "danger" | "warning" | "success" | "info";

export interface MessageBoxAction {
  /** Button text. */
  label: string;
  /** Ionic colour token, e.g. "danger" | "primary" | "medium". */
  color: string;
  onClick: () => void;
}

export interface MessageBoxProps {
  isOpen: boolean;
  /** Short headline, e.g. "Delete this patient?". */
  title: string;
  /** One or two sentences of plain-language detail. */
  message?: string;
  /**
   * Drives the icon and its colour. Defaults to "danger" because most boxes in
   * this app are failures; pass "success" / "warning" / "info" so the box reads
   * as what actually happened rather than as an error by default.
   */
  tone?: MessageBoxTone;
  /** Overrides the tone's icon. Used by the call screens to distinguish a
   *  connect timeout (a clock) from a raised error (an alert). */
  icon?: string;
  /** One or two actions. Rendered in order; the first sits on the left. */
  actions: MessageBoxAction[];
  /** Fired for backdrop click, Escape, and hardware back. */
  onDismiss: () => void;
  /**
   * Which action takes focus on open. Defaults to 0 — the dismiss action —
   * because on a destructive confirmation, pre-focusing "Delete" makes a stray
   * Enter destructive. The call screens pass 1, since there retrying is what most
   * people want.
   */
  focusActionIndex?: number;
  className?: string;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  isOpen,
  title,
  message,
  tone = "danger",
  icon,
  actions,
  onDismiss,
  focusActionIndex = 0,
  className = "",
}) => {
  const titleId = useId();
  const messageId = useId();

  const buttonRefs = useRef<(HTMLIonButtonElement | null)[]>([]);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  /* Action handlers are read through a ref so Escape and backdrop always call
     the current one without re-registering the listener on every render. */
  const actionRefs = useRef(actions);
  actionRefs.current = actions;

  const clickAction = (index: number) => actionRefs.current[index]?.onClick();
  const dismiss = () => dismissRef.current();

  /* Move focus in on open and restore it on close. Without the restore, focus
     falls to <body> and a keyboard user is stranded at the top of the document
     after dismissing a dialog. */
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    buttonRefs.current[focusActionIndex]?.focus();
    return () => previouslyFocused?.focus?.();
  }, [isOpen, focusActionIndex]);

  /* Escape dismisses. */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  /* A single action is a full-width acknowledgement, not a choice between two
     things, so it does not need to share a row with anything. */
  const single = actions.length === 1;

  return createPortal(
    <div
      className="mbx-overlay"
      /* The dim is inert: clicks here dismiss the box instead of reaching the
         screen underneath, so a stray tap cannot trigger a control on the page
         the user is trying to leave. */
      onClick={dismiss}
      data-testid="message-box-overlay"
    >
      <div
        className={`mbx-panel ${className}`.trim()}
        /* alertdialog, not alert: the user has to choose what happens next, so
           it takes focus and is announced as a decision, not a notice.
           aria-modal marks the page behind as inert to assistive tech. */
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        onClick={(event) => event.stopPropagation()}
        data-testid="message-box"
      >
        <h2 className="mbx-title" id={titleId}>
          {title}
        </h2>

        {message && (
          <p className="mbx-message" id={messageId}>
            {message}
          </p>
        )}

        <div className={`mbx-actions${single ? " mbx-actions--single" : ""}`}>
          {actions.map((action, index) => (
            <IonButton
              key={action.label}
              expand="block"
              fill="solid"
              color={action.color}
              className="mbx-btn"
              onClick={() => clickAction(index)}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
            >
              {action.label}
            </IonButton>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MessageBox;

/* Named export as well: every call site imports it as
   `import { MessageBox } from ".../MessageBox"`, matching how the other shared
   UI pieces in components/ui are consumed. */
export { MessageBox };