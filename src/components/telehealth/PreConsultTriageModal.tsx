import React, { useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonRange,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonText,
  IonItem,
  IonLabel,
  IonInput,
} from "@ionic/react";
import {
  closeOutline,
  pulseOutline,
  alertCircle,
  checkmarkCircle,
  sparklesOutline,
  shieldCheckmarkOutline,
  medkitOutline,
  informationCircle,
  chevronBackOutline,
  chevronForwardOutline,
} from "ionicons/icons";
import { fetchHealthTips } from "../Services/healthAiService";
import "./PreConsultTriageModal.css";

export interface TriageResult {
  chiefComplaint: string;
  duration: string;
  severity: number;
  associatedSymptoms: string[];
  hasRedFlags: boolean;
  summary: string;
}

interface PreConsultTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (triage: TriageResult) => void;
  patientName?: string;
}

const COMMON_SYMPTOMS = [
  "Fever / Chills",
  "Headache",
  "Cough / Cold",
  "Body aches / Fatigue",
  "Abdominal pain",
  "Diarrhea / Nausea",
  "Skin rash",
  "Palpitations",
];

const RED_FLAGS = [
  "Difficulty breathing",
  "Loss of consciousness or severe dizziness",
  "Acute chest pain",
  "Intractable vomiting or blood",
];

/** How many steps the wizard has. Drives both the counter and the type of `step`. */
const TOTAL_STEPS = 5;

interface NavIconButtonProps {
  /** Accessible name — the chevron itself is decorative and hidden from AT. */
  label: string;
  /** Chevron direction. `back` pages toward step 1, `forward` toward step 5. */
  dir: "back" | "forward";
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Icon-only step pager.
 *
 * The wording ("Back" / "Next Step") used to sit beside the chevron, which made
 * the pair read as two wide labelled buttons competing with the step content for
 * attention. The label is gone and the button is transparent, so the control
 * recedes until hovered or focused.
 *
 * Two things make that safe:
 *   - `aria-label` carries the name. Icon-only means the visible label *cannot*
 *     also be the accessible name, so without this the control announces as an
 *     unlabelled button.
 *   - the hit area stays 44px (WCAG 2.5.5) even though the glyph is 22px.
 *
 * `slot="icon-only"` is what stops Ionic from reserving horizontal padding for
 * text that is no longer there, which would leave the glyph off-centre.
 */
const NavIconButton: React.FC<NavIconButtonProps> = ({
  label,
  dir,
  onClick,
  disabled = false,
}) => (
  <IonButton
    className="triage-nav-btn"
    fill="clear"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    <IonIcon
      slot="icon-only"
      icon={dir === "back" ? chevronBackOutline : chevronForwardOutline}
    />
  </IonButton>
);

/**
 * Pager row shared by every step: back, position, forward.
 *
 * Centring the counter between the two chevrons keeps the pair symmetric, so the
 * row does not appear to drift as the step number changes width.
 *
 * `backDisabled` defaults to "there is nothing before step 1". Step 1 opts out of
 * that: its back chevron leaves the wizard entirely (see `onBack` there), because
 * a permanently dead control is worse than one that means "back to the booking
 * form" — which is exactly where the user came from.
 */
const StepNav: React.FC<{
  step: number;
  onBack: () => void;
  onForward: () => void;
  backLabel?: string;
  forwardLabel?: string;
  forwardDisabled?: boolean;
  backDisabled?: boolean;
  /** Replaces the plain chevron, e.g. the spinner or "Finish and Send" CTA. */
  children?: React.ReactNode;
}> = ({
  step,
  onBack,
  onForward,
  backLabel = "Back",
  forwardLabel = "Next",
  forwardDisabled = false,
  backDisabled,
  children,
}) => (
  <div className="triage-nav-buttons">
    <NavIconButton
      label={backLabel}
      dir="back"
      onClick={onBack}
      disabled={backDisabled ?? step === 1}
    />
    <span className="triage-step-counter" aria-live="polite">
      {`${step} / ${TOTAL_STEPS}`}
    </span>
    {children ?? (
      <NavIconButton
        label={forwardLabel}
        dir="forward"
        onClick={onForward}
        disabled={forwardDisabled}
      />
    )}
  </div>
);

export const PreConsultTriageModal: React.FC<PreConsultTriageModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  patientName = "Patient",
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [customComplaint, setCustomComplaint] = useState("");
  const [duration, setDuration] = useState("1 to 3 days");
  const [severity, setSeverity] = useState<number>(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const toggleRedFlag = (rf: string) => {
    setSelectedRedFlags((prev) =>
      prev.includes(rf) ? prev.filter((r) => r !== rf) : [...prev, rf]
    );
  };

  const runAIAnalysis = async () => {
    setAiAnalyzing(true);
    const finalComplaint = customComplaint.trim() || chiefComplaint || "General consultation";
    
    try {
      const result = await fetchHealthTips({
        topic: "general",
        language: "fr",
        count: 3,
      });

      if (result.ok) {
        setAiRecommendations(result.tips.map((tip) => tip.detail));
      } else {
        // AI not configured or failed - show helpful message
        setAiRecommendations([
          "Consult a doctor if symptoms persist",
          "Stay hydrated and rest",
          "Monitor your condition",
          "Note: AI service is not configured. Contact administrator."
        ]);
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
      setAiRecommendations([
        "Consult a doctor if symptoms persist",
        "Stay hydrated and rest",
        "Monitor your condition",
        "Note: AI service is not configured. Contact administrator."
      ]);
    } finally {
      setAiAnalyzing(false);
      setStep(5);
    }
  };

  const handleFinish = () => {
    const finalComplaint = customComplaint.trim() || chiefComplaint || "General consultation";
    const hasRedFlags = selectedRedFlags.length > 0;

    const summary = [
      `Reason: ${finalComplaint}`,
      `Duration: ${duration}`,
      `Perceived intensity: ${severity}/10`,
      selectedSymptoms.length ? `Associated signs: ${selectedSymptoms.join(", ")}` : "",
      hasRedFlags ? `⚠️ WARNING SEVERITY SIGNS: ${selectedRedFlags.join(", ")}` : "No immediate severity signs reported",
    ]
      .filter(Boolean)
      .join(" · ");

    onComplete({
      chiefComplaint: finalComplaint,
      duration,
      severity,
      associatedSymptoms: selectedSymptoms,
      hasRedFlags,
      summary,
    });

    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setChiefComplaint("");
    setCustomComplaint("");
    setDuration("1 to 3 days");
    setSeverity(5);
    setSelectedSymptoms([]);
    setSelectedRedFlags([]);
    setAiAnalyzing(false);
    setAiRecommendations([]);
    onClose();
  };

  return (
    <IonModal 
      isOpen={isOpen} 
      onDidDismiss={handleClose} 
      className="triage-modal"
    >
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>AI Pre-Consultation</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <div className="triage-modal-body">
        <div className="triage-header-chip">
          <IonIcon icon={sparklesOutline} />
          <span>Intelligent Clinical Triage (Gemini Medical)</span>
        </div>

        {step === 1 && (
          <div className="triage-step-container">
            <h3>What is the main reason for your consultation?</h3>
            <p className="triage-sub">
              Symptoms reported for <strong>{patientName}</strong> help the
              doctor prepare the consultation.
            </p>

            <div className="symptom-chips-grid">
              {COMMON_SYMPTOMS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`symptom-btn ${chiefComplaint === s ? "selected" : ""}`}
                  onClick={() => {
                    setChiefComplaint(s);
                    setCustomComplaint("");
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="custom-input-box">
              <IonItem lines="none" className="triage-ion-item">
                <IonLabel position="stacked">
                  Or describe your symptoms in your own words:
                </IonLabel>
                <IonInput
                  type="text"
                  placeholder="Ex: Pain in left knee since yesterday..."
                  value={customComplaint}
                  onIonInput={(e) => {
                    setCustomComplaint(e.detail.value ?? "");
                    if (e.detail.value) setChiefComplaint("");
                  }}
                />
              </IonItem>
            </div>

            {/* Step 1's back chevron leaves the wizard instead of being disabled:
                the triage was opened from the booking form, so that is where
                "back" has to go. `handleClose` also clears the draft answers,
                which is the behaviour the X button in the toolbar already has. */}
            <StepNav
              step={step}
              backLabel="Back to appointment booking"
              backDisabled={false}
              onBack={handleClose}
              onForward={() => setStep(2)}
              forwardLabel="Continue to step 2"
              forwardDisabled={!chiefComplaint && !customComplaint.trim()}
            />
          </div>
        )}

        {step === 2 && (
          <div className="triage-step-container">
            <h3>Any other signs?</h3>
            <p className="triage-sub">
              Select everything you are also experiencing. This goes to the
              doctor as part of your consultation summary.
            </p>

            <div className="symptom-chips-grid">
              {COMMON_SYMPTOMS.map((s) => {
                const picked = selectedSymptoms.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    aria-pressed={picked}
                    className={`symptom-btn ${picked ? "selected" : ""}`}
                    onClick={() => toggleSymptom(s)}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <StepNav
              step={step}
              onBack={() => setStep(1)}
              onForward={() => setStep(3)}
              forwardLabel="Next step"
            />
          </div>
        )}

        {step === 3 && (
          <div className="triage-step-container">
            <h3>Duration and Intensity</h3>
            <p className="triage-sub">How long have you had this symptom?</p>

            <div className="duration-selector">
              {["Less than 24h", "1 to 3 days", "4 to 7 days", "More than a week"].map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`duration-btn ${duration === d ? "selected" : ""}`}
                  onClick={() => setDuration(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="severity-box">
              <div className="severity-header">
                <span>Pain/Discomfort Scale:</span>
                <strong>{severity} / 10</strong>
              </div>
              <IonRange
                min={1}
                max={10}
                step={1}
                snaps={true}
                value={severity}
                color={severity >= 8 ? "danger" : severity >= 5 ? "warning" : "success"}
                onIonChange={(e) => setSeverity(Number(e.detail.value))}
              />
              <div className="severity-labels">
                <small>Mild (1)</small>
                <small>Moderate (5)</small>
                <small>Severe (10)</small>
              </div>
            </div>

            <StepNav
              step={step}
              onBack={() => setStep(2)}
              onForward={() => setStep(4)}
              forwardLabel="Next step"
            />
          </div>
        )}

        {step === 4 && (
          <div className="triage-step-container">
            <h3>Warning Signs Check</h3>
            <p className="triage-sub">Do you feel any of these urgent signs?</p>

            <div className="redflags-list">
              {RED_FLAGS.map((rf) => {
                const checked = selectedRedFlags.includes(rf);
                return (
                  <button
                    type="button"
                    key={rf}
                    className={`redflag-item ${checked ? "active" : ""}`}
                    onClick={() => toggleRedFlag(rf)}
                  >
                    <IonIcon icon={alertCircle} className="rf-icon" />
                    <span>{rf}</span>
                  </button>
                );
              })}
            </div>

            {selectedRedFlags.length > 0 && (
              <div className="urgent-warning-banner">
                <IonIcon icon={alertCircle} />
                <div>
                  <strong>Attention: Warning sign detected</strong>
                  <p>If your condition worsens rapidly, immediately contact emergency services (119) or go to the nearest health center.</p>
                </div>
              </div>
            )}

            {/* "Analyze with AI" is the step's real action, not a pager step, so it
                keeps its wording and its fill — dropping the label would leave a
                bare chevron for the one button that triggers the analysis. Only
                the back control became an icon. */}
            <StepNav step={step} onBack={() => setStep(3)} onForward={runAIAnalysis}>
              <IonButton
                color="success"
                onClick={runAIAnalysis}
                disabled={aiAnalyzing}
              >
                {aiAnalyzing ? <IonSpinner name="crescent" /> : "Analyze with AI"}
              </IonButton>
            </StepNav>
          </div>
        )}

        {step === 5 && (
          <div className="triage-step-container">
            <h3>AI Recommendations</h3>
            <p className="triage-sub">Based on your symptoms and medical analysis</p>

            {aiAnalyzing ? (
              <div className="ai-loading">
                <IonSpinner name="crescent" />
                <p>Analysis in progress...</p>
              </div>
            ) : (
              <>
                <IonCard className="ai-recommendation-card">
                  <IonCardContent>
                    <div className="ai-recommendation-header">
                      <IonIcon icon={medkitOutline} />
                      <strong>Medical Advice</strong>
                    </div>
                    <ul className="ai-recommendations-list">
                      {aiRecommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </IonCardContent>
                </IonCard>

                <IonText color="medium">
                  <p className="ai-disclaimer">
                    <IonIcon icon={informationCircle} />
                    These recommendations are AI-generated and do not replace professional medical advice.
                  </p>
                </IonText>

                {/* "Finish and Send" is the submit action: the doctor receives this
                    summary, so it keeps its label. The step-5 back chevron pages to
                    step 4 so the answers can be corrected before sending. */}
                <StepNav
                  step={step}
                  onBack={() => setStep(4)}
                  onForward={handleFinish}
                >
                  <IonButton color="success" onClick={handleFinish}>
                    Finish and Send
                  </IonButton>
                </StepNav>
              </>
            )}
          </div>
        )}
      </div>
    </IonModal>
  );
};

export default PreConsultTriageModal;
