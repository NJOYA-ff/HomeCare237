/**
 * BiometricLockScreen
 *
 * Full-screen overlay shown when the app resumes and a security lock is
 * configured. It attempts fingerprint/biometric first, then falls back to PIN
 * entry. Works for all three user roles (Patient, Doctor, Admin).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { IonIcon, IonText } from "@ionic/react";
import {
  fingerPrintOutline,
  lockClosedOutline,
  alertCircleOutline,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  authenticateWithBiometrics,
  isBiometricEnabled,
  isPinEnabled,
  verifyPin,
  checkBiometryAvailability,
} from "../utils/BiometricAuthService";
import "./BiometricLockScreen.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BiometricLockScreenProps {
  /** Whether the lock screen is visible. */
  visible: boolean;
  /** Called when the user successfully authenticates. */
  onUnlocked: () => void;
}

type LockView = "biometric" | "pin";

// ─── PIN keypad (same as PinSetupModal but standalone) ────────────────────────

const PIN_LENGTH = 4;

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

// ─── Component ────────────────────────────────────────────────────────────────

const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  visible,
  onUnlocked,
}) => {
  const [view, setView] = useState<LockView>("biometric");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isBioAvailable, setIsBioAvailable] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState("Fingerprint");
  const [bioEnabled, setBioEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const shakeRef = useRef<HTMLDivElement | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const init = async () => {
      const [bioEn, pinEn, availability] = await Promise.all([
        isBiometricEnabled(),
        isPinEnabled(),
        checkBiometryAvailability(),
      ]);
      if (cancelled) return;

      setBioEnabled(bioEn);
      setPinEnabled(pinEn);
      setIsBioAvailable(availability.available);
      setBiometryLabel(availability.biometryLabel);

      // Decide starting view
      if (bioEn && availability.available) {
        setView("biometric");
        triggerBiometric();
      } else if (pinEn) {
        setView("pin");
      }
    };

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Biometric flow ────────────────────────────────────────────────────────

  const triggerBiometric = useCallback(async () => {
    setError("");
    const result = await authenticateWithBiometrics(
      "Verify your identity to unlock HomeCare237"
    );

    if (result.success) {
      onUnlocked();
      return;
    }

    // Cancelled → drop to PIN if available
    if (result.cancelled) {
      const pinEn = await isPinEnabled();
      if (pinEn) {
        setView("pin");
      } else {
        setError("Authentication cancelled. Try again.");
      }
      return;
    }

    setError(result.error || "Biometric failed. Try your PIN.");
    const pinEn = await isPinEnabled();
    if (pinEn) setView("pin");
  }, [onUnlocked]);

  // ── PIN flow ──────────────────────────────────────────────────────────────

  const shake = () => {
    shakeRef.current?.classList.remove("shake");
    void shakeRef.current?.offsetWidth;
    shakeRef.current?.classList.add("shake");
  };

  const handleKey = useCallback(
    async (key: string) => {
      if (verifying) return;
      setError("");

      if (key === "⌫") {
        setPin((prev) => prev.slice(0, -1));
        return;
      }

      const next = pin + key;
      setPin(next);

      if (next.length < PIN_LENGTH) return;

      // Verify PIN
      setVerifying(true);
      const correct = await verifyPin(next);
      setVerifying(false);

      if (correct) {
        onUnlocked();
      } else {
        shake();
        setError("Incorrect PIN. Try again.");
        setPin("");
      }
    },
    [pin, verifying, onUnlocked]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="lock-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="lock-header">
            <IonIcon icon={lockClosedOutline} className="lock-app-icon" />
            <h1 className="lock-app-name">HomeCare237</h1>
          </div>

          {/* Biometric view */}
          {view === "biometric" && (
            <div className="lock-bio-view">
              <motion.button
                className="lock-fingerprint-btn"
                onClick={triggerBiometric}
                whileTap={{ scale: 0.92 }}
                aria-label={`Unlock with ${biometryLabel}`}
              >
                <IonIcon icon={fingerPrintOutline} />
              </motion.button>
              <p className="lock-hint">
                Tap to authenticate with {biometryLabel}
              </p>

              {pinEnabled && (
                <button
                  className="lock-switch-btn"
                  onClick={() => setView("pin")}
                >
                  Use PIN instead
                </button>
              )}
            </div>
          )}

          {/* PIN view */}
          {view === "pin" && (
            <div className="lock-pin-view">
              <p className="lock-hint">Enter your PIN</p>

              <div ref={shakeRef} className="lock-dots-wrapper">
                <div className="pin-dots">
                  {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`pin-dot ${i < pin.length ? "filled" : ""}`}
                      animate={
                        i < pin.length ? { scale: [1, 1.2, 1] } : { scale: 1 }
                      }
                      transition={{ duration: 0.15 }}
                    />
                  ))}
                </div>
              </div>

              {bioEnabled && isBioAvailable && (
                <button
                  className="lock-switch-btn"
                  onClick={() => {
                    setPin("");
                    setError("");
                    setView("biometric");
                    triggerBiometric();
                  }}
                >
                  Use {biometryLabel} instead
                </button>
              )}

              {/* Keypad */}
              <div className="pin-keypad">
                {KEYS.map((row, ri) => (
                  <div className="pin-keypad-row" key={ri}>
                    {row.map((key, ki) => (
                      <button
                        key={ki}
                        className={`pin-key ${key === "" ? "pin-key-empty" : ""}`}
                        onClick={() => key && handleKey(key)}
                        disabled={verifying || key === ""}
                        aria-label={key === "⌫" ? "Delete" : key || undefined}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error ? (
              <motion.div
                key="lock-error"
                className="lock-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <IonIcon icon={alertCircleOutline} />
                <IonText>{error}</IonText>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BiometricLockScreen;
