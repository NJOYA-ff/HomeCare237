/**
 * PasswordResetModal
 *
 * Bottom-sheet modal used from all Settings pages ("Change Password" row).
 * Mirrors the "Set Available Slots" sheet modal from the Doctor dashboard
 * (breakpoint sheet, rounded top corners, light toolbar).
 *
 * Flow:
 *   1. Shows the account email a reset link will be sent to.
 *   2. User taps "Send Reset Link" -> Firebase sends a password reset email.
 *   3. Success state is shown briefly, then the modal dismisses itself.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
} from "@ionic/react";
import { closeOutline, checkmarkCircleOutline, mailOutline } from "ionicons/icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseconfig";
import LoadingHelix from "./LoadingHelix";
import "./PasswordResetModal.css";

interface PasswordResetModalProps {
  isOpen: boolean;
  /** Account email the reset link will be sent to. */
  email: string | null;
  /** Called when the modal finishes dismissing. */
  onDidDismiss: () => void;
}

/** How long the success state stays visible before auto-dismissing (ms). */
const SUCCESS_DURATION = 1800;

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  email,
  onDidDismiss,
}) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset internal state each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setSending(false);
      setSent(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!email || sending || sent) return;
    setSending(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      // Show the success state briefly, then dismiss.
      setTimeout(() => {
        setSent(false);
        onDidDismiss();
      }, SUCCESS_DURATION);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send reset email. Please try again.";
      setError(message);
    } finally {
      setSending(false);
    }
  }, [email, sending, sent, onDidDismiss]);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      id="password-reset-modal"
      initialBreakpoint={0.6}
      breakpoints={[0, 0.6, 1]}
      style={{
        "--background": "var(--ion-background-color)",
        "--border-radius": "16px 16px 0 0",
      }}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Reset Password</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={onDidDismiss} aria-label="Close" disabled={sending}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {sent ? (
          <div className="password-reset-success">
            <IonIcon icon={checkmarkCircleOutline} className="password-reset-success-icon" />
            <IonText>
              <h2>Password reset email sent!</h2>
            </IonText>
            <IonText color="medium">
              <p>
                We sent a secure reset link to <strong>{email}</strong>. It may
                take a few minutes to arrive.
              </p>
            </IonText>
          </div>
        ) : (
          <>
            <IonText color="medium">
              <p>
                We&apos;ll email you a secure link to reset your password. The
                link expires after a short time, so use it promptly.
              </p>
            </IonText>

            <IonItem className="password-reset-email-item" lines="none">
              <IonIcon icon={mailOutline} className="password-reset-email-icon" />
              <IonLabel>
                <p className="password-reset-email-label">Account email</p>
                <h3 className="password-reset-email-value">{email || "No account email found"}</h3>
              </IonLabel>
            </IonItem>

            {error && <p className="password-reset-error">{error}</p>}

            <IonButton
              expand="block"
              className="ion-margin-top"
              onClick={handleSend}
              disabled={!email || sending}
              aria-label="Send password reset link"
            >
              {sending ? <LoadingHelix size={20} color="var(--ion-color-primary-contrast)" /> : "Send Reset Link"}
            </IonButton>

            <IonText color="medium">
              <p className="password-reset-note">
                <small>
                  Can&apos;t find the email? Check your spam folder, or contact
                  support if the problem persists.
                </small>
              </p>
            </IonText>
          </>
        )}
      </IonContent>
    </IonModal>
  );
};

export default PasswordResetModal;
