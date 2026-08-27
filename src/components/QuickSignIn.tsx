/**
 * QuickSignIn
 *
 * Shown on each signin page when the user has previously logged in AND has
 * PIN or biometric security enabled.
 *
 * Flow:
 *  1. On mount, check: hasCredentials() && (biometricEnabled || pinEnabled)
 *  2. If true, render the quick-signin button / auto-trigger biometrics.
 *  3. On successful verify, call onCredentials({ email, password }) so the
 *     parent can call authService.login() / login1() as normal.
 *
 * When the PIN keypad is active it renders as a full-screen modal overlay
 * (backdrop + bottom sheet), hiding the email/password form behind it.
 * The parent is notified via onViewChange(isPinOpen) so it can hide its own
 * form content while the modal is open.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IonIcon, IonSpinner, IonText } from "@ionic/react";
import {
  fingerPrintOutline,
  keypadOutline,
  alertCircleOutline,
  chevronDownOutline,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  hasCredentials,
  loadCredentials,
  isBiometricEnabled,
  isPinEnabled,
  authenticateWithBiometrics,
  checkBiometryAvailability,
  verifyPin,
} from "../utils/BiometricAuthService";
import "./QuickSignIn.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickSignInProps {
  /** Called when credentials are retrieved and verified. Parent should call authService.login(). */
  onCredentials: (creds: { email: string; password: string }) => void;
  /** Called when the user dismisses or an unrecoverable error occurs. */
  onDismiss?: () => void;
  /**
   * Called whenever the PIN modal opens or closes.
   * Parent should hide the email/password form while `isOpen` is true.
   */
  onViewChange?: (isOpen: boolean) => void;
}

type QuickView = "button" | "pin" | "loading";

// ─── PIN keypad constants ─────────────────────────────────────────────────────

const PIN_LENGTH = 4;

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

// ─── Component ────────────────────────────────────────────────────────────────

const QuickSignIn: React.FC<QuickSignInProps> = ({
  onCredentials,
  onDismiss,
  onViewChange,
}) => {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<QuickView>("button");
  const [displayName, setDisplayName] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState("Fingerprint");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const shakeRef = useRef<HTMLDivElement | null>(null);

  // ── Notify parent whenever view changes to/from PIN/loading ───────────────

  useEffect(() => {
    const isModalOpen = view === "pin" || view === "loading";
    onViewChange?.(isModalOpen);
  }, [view, onViewChange]);

  // ── Init: check whether quick sign-in is available ────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const [hasCreds, bioEn, pinEn, availability] = await Promise.all([
        hasCredentials(),
        isBiometricEnabled(),
        isPinEnabled(),
        checkBiometryAvailability(),
      ]);

      if (cancelled) return;

      // Quick sign-in is only available if we have stored credentials AND at
      // least one security method is set up.
      if (!hasCreds || (!bioEn && !pinEn)) {
        setReady(false);
        return;
      }

      // Pre-fetch display name for the UI
      const creds = await loadCredentials();
      if (cancelled) return;

      setBiometricEnabled(bioEn);
      setPinEnabled(pinEn);
      setBiometricAvailable(availability.available);
      setBiometryLabel(availability.biometryLabel);
      setDisplayName(creds?.displayName || creds?.email || "");
      setReady(true);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const shake = () => {
    shakeRef.current?.classList.remove("qs-shake");
    void shakeRef.current?.offsetWidth; // force reflow
    shakeRef.current?.classList.add("qs-shake");
  };

  /** Close the modal and return to the button view. */
  const closeModal = useCallback(() => {
    setView("button");
    setPin("");
    setError("");
  }, []);

  /**
   * After successful biometric/PIN verification, load the credentials and
   * hand them to the parent.
   */
  const resolveLogin = useCallback(async () => {
    setView("loading");
    const creds = await loadCredentials();
    if (!creds) {
      setError("Saved credentials not found. Please sign in with email.");
      setView("button");
      return;
    }
    onCredentials({ email: creds.email, password: creds.password });
  }, [onCredentials]);

  // ── Biometric flow ────────────────────────────────────────────────────────

  const triggerBiometric = useCallback(async () => {
    setError("");
    const result = await authenticateWithBiometrics(
      "Verify your identity to sign in to HomeCare237"
    );

    if (result.success) {
      await resolveLogin();
      return;
    }

    // User cancelled → offer PIN if available
    if (result.cancelled && pinEnabled) {
      setView("pin");
      return;
    }

    if (pinEnabled) {
      setView("pin");
    } else {
      setError(result.error || "Biometric failed. Please sign in manually.");
    }
  }, [resolveLogin, pinEnabled]);

  // ── PIN flow ──────────────────────────────────────────────────────────────

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
        setPin("");
        await resolveLogin();
      } else {
        shake();
        setError("Incorrect PIN.");
        setPin("");
      }
    },
    [pin, verifying, resolveLogin]
  );

  // ── Main button click ─────────────────────────────────────────────────────

  const handleQuickSignIn = useCallback(async () => {
    setError("");

    if (biometricEnabled && biometricAvailable) {
      await triggerBiometric();
    } else if (pinEnabled) {
      setView("pin");
    }
  }, [biometricEnabled, biometricAvailable, pinEnabled, triggerBiometric]);

  // ── Don't render anything if quick sign-in is not set up ─────────────────

  if (!ready) return null;

  // ── Modal overlay (PIN keypad + loading spinner) ──────────────────────────
  // Rendered via a portal so it sits above everything, regardless of stacking
  // context created by IonContent / scroll containers.

  const isModalOpen = view === "pin" || view === "loading";

  const modal = isModalOpen
    ? createPortal(
        <AnimatePresence>
          <motion.div
            className="qs-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => {
              // Tapping the dark backdrop closes the modal
              if (e.target === e.currentTarget) {
                closeModal();
                onDismiss?.();
              }
            }}
          >
            <motion.div
              className="qs-modal-sheet"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* Drag handle */}
              <div className="qs-sheet-handle" />

              {/* ── Loading ──────────────────────────────────────────── */}
              {view === "loading" && (
                <div className="qs-loading">
                  <IonSpinner name="crescent" />
                  <span>Signing in…</span>
                </div>
              )}

              {/* ── PIN keypad ───────────────────────────────────────── */}
              {view === "pin" && (
                <div className="qs-pin-view">
                  <p className="qs-pin-label">Enter your PIN to sign in</p>

                  {/* User name hint */}
                  {displayName ? (
                    <p className="qs-pin-user">{displayName}</p>
                  ) : null}

                  {/* Dots */}
                  <div ref={shakeRef} className="qs-dots-wrapper">
                    <div className="qs-pin-dots">
                      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={`qs-pin-dot${i < pin.length ? " filled" : ""}`}
                          animate={
                            i < pin.length
                              ? { scale: [1, 1.25, 1] }
                              : { scale: 1 }
                          }
                          transition={{ duration: 0.15 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Error inline */}
                  <AnimatePresence>
                    {error ? (
                      <motion.div
                        key="qs-pin-error"
                        className="qs-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <IonIcon icon={alertCircleOutline} />
                        <IonText>{error}</IonText>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Keypad */}
                  <div className="qs-keypad">
                    {KEYS.map((row, ri) => (
                      <div className="qs-keypad-row" key={ri}>
                        {row.map((key, ki) => (
                          <button
                            key={ki}
                            className={`qs-key${key === "" ? " qs-key-empty" : ""}`}
                            onClick={() => key && handleKey(key)}
                            disabled={verifying || key === ""}
                            aria-label={
                              key === "⌫" ? "Delete" : key || undefined
                            }
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Switch to biometric if available */}
                  {biometricEnabled && biometricAvailable && (
                    <button
                      className="qs-switch-btn"
                      onClick={() => {
                        setPin("");
                        setError("");
                        setView("button");
                        triggerBiometric();
                      }}
                    >
                      Use {biometryLabel} instead
                    </button>
                  )}

                  {/* Cancel → back to email form */}
                  <button
                    className="qs-cancel-btn"
                    onClick={() => {
                      closeModal();
                      onDismiss?.();
                    }}
                  >
                    <IonIcon icon={chevronDownOutline} />
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Modal portal */}
      {modal}

      {/* Inline section — only the button / divider; PIN lives in the modal */}
      <div className="quick-signin-wrapper">
        {/* Divider */}
        <div className="qs-divider">
          <span>or sign in quickly</span>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Main button ───────────────────────────────────────────── */}
          {view === "button" && (
            <motion.div
              key="btn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                className="qs-button"
                onClick={handleQuickSignIn}
                whileTap={{ scale: 0.96 }}
                aria-label="Quick sign in"
              >
                <IonIcon
                  icon={
                    biometricEnabled && biometricAvailable
                      ? fingerPrintOutline
                      : keypadOutline
                  }
                  className="qs-icon"
                />
                <div className="qs-button-text">
                  <span className="qs-button-title">
                    {biometricEnabled && biometricAvailable
                      ? `Sign in with ${biometryLabel}`
                      : "Sign in with PIN"}
                  </span>
                  {displayName ? (
                    <span className="qs-button-sub">{displayName}</span>
                  ) : null}
                </div>
              </motion.button>

              {/* Option to switch to PIN if biometrics is the default */}
              {biometricEnabled && biometricAvailable && pinEnabled && (
                <button
                  className="qs-switch-btn"
                  onClick={() => setView("pin")}
                >
                  Use PIN instead
                </button>
              )}
            </motion.div>
          )}

          {/* ── While modal is open, show a subtle placeholder ──────── */}
          {isModalOpen && (
            <motion.div
              key="modal-open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="qs-modal-placeholder"
            />
          )}
        </AnimatePresence>

        {/* Error (biometric errors only; PIN errors are shown inside the modal) */}
        <AnimatePresence>
          {error && view === "button" ? (
            <motion.div
              key="qs-error"
              className="qs-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <IonIcon icon={alertCircleOutline} />
              <IonText>{error}</IonText>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
};

export default QuickSignIn;
