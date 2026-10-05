import React, { useState, useEffect } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonItem,
  IonLabel,
  IonInput,
} from "@ionic/react";
import {
  closeOutline,
  checkmarkCircle,
  alertCircle,
  phonePortraitOutline,
  shieldCheckmarkOutline,
} from "ionicons/icons";
import {
  MomoProvider,
  MomoTransaction,
  detectCarrier,
  formatXAF,
  initiateMomoPayment,
  completeMomoPayment,
} from "../Services/momoPaymentService";

/* The operators' real marks, on transparent backgrounds. See the trademark note
 * on OPERATOR_MARKS below before replacing or recolouring them. */
import mtnMomoLogo from "../../assets/operators/mtn-momo.png";
import orangeMoneyLogo from "../../assets/operators/orange-money.png";

import "./MobileMoneyModal.css";

/**
 * The operators' real marks, on transparent backgrounds. These are the same
 * assets the first-run showcase uses, vendored rather than redrawn: a
 * hand-built approximation of a mobile-money logo reads as a counterfeit, and
 * the operators do not permit their marks to be altered. So — used as-is, in
 * their own colours, never recoloured to the palette and never stretched. If a
 * mark is ever replaced, replace it with another official asset.
 *
 * `chip` is the pad behind each mark, taken from the backdrop in the
 * operator's own exported artwork, and is applied inline rather than in the
 * stylesheet: these are third-party brand colours, and a project stylesheet is
 * exactly where they would eventually be "tidied up" to match the palette. It
 * is not decoration — Orange Money's wordmark is white, which would vanish on
 * this modal's white card.
 */
const OPERATOR_MARKS: Record<"MTN" | "ORANGE", { src: string; chip: string }> = {
  MTN: { src: mtnMomoLogo, chip: "#004F71" },
  ORANGE: { src: orangeMoneyLogo, chip: "#000000" },
};

/**
 * An operator's mark for the provider selector.
 *
 * Decorative: the provider card this sits in already names the operator in
 * text, so `alt=""` here keeps it from being announced twice.
 */
const MomoOperatorMark: React.FC<{ operator: "MTN" | "ORANGE" }> = ({ operator }) => {
  const mark = OPERATOR_MARKS[operator];

  return (
    <span className="momo-operator-mark" style={{ background: mark.chip }}>
      <img className="momo-operator-logo" src={mark.src} alt="" aria-hidden="true" />
    </span>
  );
};

import "./MobileMoneyModal.css";

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: MomoTransaction) => void;
  amount: number;
  purpose: "appointment" | "prescription" | "emergency" | "consultation";
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorId?: string;
  doctorName?: string;
  serviceTitle?: string;
}

export const MobileMoneyModal: React.FC<MobileMoneyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  amount,
  purpose,
  patientId,
  patientName,
  patientPhone = "",
  doctorId,
  doctorName,
  serviceTitle = "Medical Consultation",
}) => {
  const [phone, setPhone] = useState(patientPhone);
  const [provider, setProvider] = useState<MomoProvider>("MTN");
  const [step, setStep] = useState<"input" | "waiting_pin" | "success" | "error">("input");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTx, setActiveTx] = useState<MomoTransaction | null>(null);

  useEffect(() => {
    if (patientPhone) {
      setPhone(patientPhone);
      const detected = detectCarrier(patientPhone);
      if (detected !== "OTHER") {
        setProvider(detected);
      }
    }
  }, [patientPhone, isOpen]);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const detected = detectCarrier(val);
    if (detected !== "OTHER") {
      setProvider(detected);
    }
  };

  const handlePay = async () => {
    if (!phone || phone.length < 9) {
      setErrorMessage("Please enter a valid phone number (9 digits).");
      return;
    }
    setErrorMessage("");
    setLoading(true);

    try {
      const tx = await initiateMomoPayment({
        patientId,
        patientName,
        patientPhone: phone,
        provider,
        amount,
        purpose,
        doctorId,
        doctorName,
      });

      setActiveTx(tx);
      setStep("waiting_pin");

      // Simulate USSD prompt confirmation after 4.5 seconds
      setTimeout(async () => {
        if (tx.id) {
          await completeMomoPayment(tx.id, true);
        }
        setLoading(false);
        setStep("success");
      }, 4500);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || "Failed to initialize Mobile Money payment.");
      setStep("error");
    }
  };

  const handleFinish = () => {
    if (activeTx) {
      onSuccess(activeTx);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("input");
    setLoading(false);
    setErrorMessage("");
    setActiveTx(null);
    onClose();
  };

  return (
    <IonModal 
      isOpen={isOpen} 
      onDidDismiss={handleClose} 
      className="momo-modal"
      backdropDismiss={!(loading && step === "waiting_pin")}
    >
      <IonHeader>
        <IonToolbar color="light">
          <IonTitle>Secure Payment (237)</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose} disabled={loading && step === "waiting_pin"}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <div className="momo-modal-body">
        {step === "input" && (
          <div className="momo-container">
            <div className="momo-summary-card">
              <span className="momo-label">Medical Service</span>
              <h3 className="momo-service-title">{serviceTitle}</h3>
              {doctorName && <p className="momo-doctor">Practitioner: Dr. {doctorName}</p>}
              <div className="momo-price-badge">
                <span className="momo-amount">{formatXAF(amount)}</span>
                <span className="momo-currency-sub">Inclusive · No hidden fees</span>
              </div>
            </div>

            <div className="momo-provider-selector">
              <button
                type="button"
                className={`provider-card mtn-card ${provider === "MTN" ? "selected" : ""}`}
                onClick={() => setProvider("MTN")}
                /* The card already announces the operator as text in
                   .provider-details, so the mark beside it is decorative. */
                aria-pressed={provider === "MTN"}
              >
                <MomoOperatorMark operator="MTN" />
                <div className="provider-details">
                  <strong>MTN MoMo</strong>
                  <small>*126#</small>
                </div>
              </button>

              <button
                type="button"
                className={`provider-card om-card ${provider === "ORANGE" ? "selected" : ""}`}
                onClick={() => setProvider("ORANGE")}
                aria-pressed={provider === "ORANGE"}
              >
                <MomoOperatorMark operator="ORANGE" />
                <div className="provider-details">
                  <strong>Orange Money</strong>
                  <small>#150*50#</small>
                </div>
              </button>
            </div>

            <div className="momo-input-box">
              <IonItem lines="none" className="momo-ion-item">
                <IonLabel position="stacked">
                  Mobile Money Number (Cameroon)
                </IonLabel>
                <div className="phone-input-wrapper">
                  <span className="country-code">+237</span>
                  <IonInput
                    type="tel"
                    className="momo-field-input"
                    placeholder="6XXXXXXXX"
                    value={phone}
                    maxlength={12}
                    onIonInput={(e) => handlePhoneChange(e.detail.value ?? "")}
                  />
                </div>
              </IonItem>
              <small className="momo-hint">
                Detected operator: <strong>{provider === "MTN" ? "MTN Cameroon" : provider === "ORANGE" ? "Orange Cameroon" : "Other"}</strong>
              </small>
            </div>

            {errorMessage && (
              <div className="momo-alert error">
                <IonIcon icon={alertCircle} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="momo-security-notice">
              <IonIcon icon={shieldCheckmarkOutline} />
              <span>Encrypted and secure payment via local banking gateway.</span>
            </div>

            <IonButton
              expand="block"
              className="momo-submit-btn"
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : `Pay ${formatXAF(amount)}`}
            </IonButton>
          </div>
        )}

        {step === "waiting_pin" && (
          <div className="momo-waiting-state">
            <div className="ussd-animation-box">
              <IonSpinner name="lines" className="ussd-spinner" />
              <IonIcon icon={phonePortraitOutline} className="phone-ussd-icon" />
            </div>

            <h3>USSD Request Sent!</h3>
            <p className="ussd-phone-highlight">+237 {phone}</p>
            <p className="ussd-instructions">
              A confirmation message will appear on your phone. Please enter your secret code for{" "}
              <strong>{provider === "MTN" ? "MTN MoMo" : "Orange Money"}</strong> to authorize the debit of{" "}
              <strong>{formatXAF(amount)}</strong>.
            </p>

            <div className="ussd-tip">
              If the pop-up doesn't appear, dial{" "}
              <code>{provider === "MTN" ? "*126#" : "#150*50#"}</code> to validate.
            </div>

            <IonButton fill="clear" color="medium" onClick={handleClose}>
              Cancel
            </IonButton>
          </div>
        )}

        {step === "success" && (
          <div className="momo-success-state">
            <div className="success-icon-circle">
              <IonIcon icon={checkmarkCircle} />
            </div>

            <h3>Payment Successful!</h3>
            <p className="success-sub">Your consultation has been successfully paid.</p>

            {activeTx && (
              <div className="receipt-snippet">
                <div className="receipt-row">
                  <span>Transaction Ref:</span>
                  <code>{activeTx.reference}</code>
                </div>
                <div className="receipt-row">
                  <span>Amount:</span>
                  <strong>{formatXAF(activeTx.amount)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Operator:</span>
                  <span>{activeTx.provider === "MTN" ? "MTN MoMo" : "Orange Money"}</span>
                </div>
              </div>
            )}

            <IonButton expand="block" color="success" onClick={handleFinish} className="finish-btn">
              Continue to Appointment
            </IonButton>
          </div>
        )}

        {step === "error" && (
          <div className="momo-error-state">
            <IonIcon icon={alertCircle} className="error-icon-circle" />
            <h3>Payment Failed</h3>
            <p>{errorMessage || "USSD timeout expired or insufficient balance."}</p>
            <IonButton expand="block" fill="outline" onClick={() => setStep("input")}>
              Retry
            </IonButton>
          </div>
        )}
      </div>
    </IonModal>
  );
};

export default MobileMoneyModal;
