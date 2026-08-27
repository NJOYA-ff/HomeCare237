/**
 * PinSetupModal
 *
 * Displayed when the user wants to set up a PIN for the first time
 * (or change their existing one). Shown from SettingsPage.
 *
 * Flow:
 *   1. User enters a new 4-6 digit PIN.
 *   2. User confirms the same PIN.
 *   3. PIN is hashed and saved via BiometricAuthService.savePin().
 */

import React, { useCallback, useRef, useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonText,
  IonIcon,
} from "@ionic/react";
import { closeOutline, checkmarkCircleOutline } from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import { savePin } from "../utils/BiometricAuthService";
import "./PinSetupModal.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PinSetupModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onDismiss: () => void;
  /** When true the modal is used to verify the existing PIN before disabling it. */
  mode?: "setup" | "verify";
  onVerify?: (pin: string) => void;
}

type Step = "enter" | "confirm" | "done";

// ─── Dot display ─────────────────────────────────────────────────────────────

const PinDots: React.FC<{ length: number; filled: number }> = ({
  length,
  filled,
}) => (
  <div className="pin-dots">
    {Array.from({ length }).map((_, i) => (
      <motion.div
        key={i}
        className={`pin-dot ${i < filled ? "filled" : ""}`}
        animate={i < filled ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      />
    ))}
  </div>
);

// ─── Keypad ───────────────────────────────────────────────────────────────────

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

interface KeypadProps {
  onKey: (k: string) => void;
  disabled?: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ onKey, disabled }) => (
  <div className="pin-keypad">
    {KEYS.map((row, ri) => (
      <div className="pin-keypad-row" key={ri}>
        {row.map((key, ki) => (
          <button
            key={ki}
            className={`pin-key ${key === "" ? "pin-key-empty" : ""}`}
            onClick={() => key && onKey(key)}
            disabled={disabled || key === ""}
            aria-label={key === "⌫" ? "Delete" : key || undefined}
          >
            {key}
          </button>
        ))}
      </div>
    ))}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const PIN_LENGTH = 4;

const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onSuccess,
  onDismiss,
  mode = "setup",
  onVerify,
}) => {
  const [step, setStep] = useState<Step>("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const shakeRef = useRef<HTMLDivElement | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep("enter");
    setPin("");
    setConfirmPin("");
    setError("");
    setSaving(false);
  }, []);

  const handleDismiss = useCallback(() => {
    reset();
    onDismiss();
  }, [onDismiss, reset]);

  // Shake the dots on error
  const shake = () => {
    shakeRef.current?.classList.remove("shake");
    // force reflow
    void shakeRef.current?.offsetWidth;
    shakeRef.current?.classList.add("shake");
  };

  // ── Keypad handler ─────────────────────────────────────────────────────────

  const handleKey = useCallback(
    async (key: string) => {
      setError("");

      const current = step === "enter" ? pin : confirmPin;
      const setter = step === "enter" ? setPin : setConfirmPin;

      if (key === "⌫") {
        setter((prev) => prev.slice(0, -1));
        return;
      }

      const next = current + key;
      setter(next);

      if (next.length < PIN_LENGTH) return;

      // PIN is complete
      if (mode === "verify") {
        // Hand raw PIN back to parent for verification
        onVerify?.(next);
        reset();
        return;
      }

      if (step === "enter") {
        // Move to confirmation step
        setStep("confirm");
        return;
      }

      // Confirmation step – compare
      if (next !== pin) {
        shake();
        setError("PINs do not match. Please try again.");
        setConfirmPin("");
        setStep("enter");
        setPin("");
        return;
      }

      // Save
      setSaving(true);
      try {
        await savePin(pin);
        setStep("done");
        setTimeout(() => {
          reset();
          onSuccess();
        }, 1200);
      } catch (e) {
        setError("Failed to save PIN. Please try again.");
        setSaving(false);
      }
    },
    [step, pin, confirmPin, mode, onVerify, onSuccess, reset]
  );

  // ── Derived labels ─────────────────────────────────────────────────────────

  const title =
    mode === "verify"
      ? "Enter your PIN"
      : step === "enter"
      ? "Set up PIN"
      : step === "confirm"
      ? "Confirm PIN"
      : "PIN Saved!";

  const subtitle =
    mode === "verify"
      ? "Enter your current PIN to continue."
      : step === "enter"
      ? `Choose a ${PIN_LENGTH}-digit PIN`
      : step === "confirm"
      ? "Enter the PIN again to confirm"
      : "Your PIN has been saved securely.";

  const currentValue = step === "enter" ? pin : confirmPin;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleDismiss}
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      className="pin-setup-modal"
    >
      <IonHeader className="ion-no-border pin-modal-header">
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={handleDismiss} aria-label="Close">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pin-modal-content">
        <div className="pin-modal-body">
          {step === "done" ? (
            <motion.div
              className="pin-done"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <IonIcon icon={checkmarkCircleOutline} className="pin-done-icon" />
              <IonText className="pin-done-text">PIN Saved!</IonText>
            </motion.div>
          ) : (
            <>
              <p className="pin-subtitle">{subtitle}</p>

              <div ref={shakeRef} className="pin-dots-wrapper">
                <PinDots length={PIN_LENGTH} filled={currentValue.length} />
              </div>

              <AnimatePresence>
                {error ? (
                  <motion.p
                    key="error"
                    className="pin-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <Keypad onKey={handleKey} disabled={saving} />
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PinSetupModal;
