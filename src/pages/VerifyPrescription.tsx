import React, { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonSpinner,
  IonItem,
  IonLabel,
  IonList,
  IonText,
} from "@ionic/react";
import {
  checkmarkCircle,
  alertCircle,
  medkitOutline,
  personOutline,
  calendarOutline,
  businessOutline,
  shieldCheckmark,
  arrowBack,
} from "ionicons/icons";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebaseconfig";
import "./VerifyPrescription.css";

interface RouteParams {
  id: string;
}

export const VerifyPrescription: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const history = useHistory();

  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [dispensed, setDispensed] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Prescription number missing.");
      setLoading(false);
      return;
    }

    const fetchPrescription = async () => {
      try {
        const docRef = doc(db, "diagnoses", id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setDiagnosis(data);
          setDispensed(data.dispensed === true);
        } else {
          setError("Prescription not found or invalid registration number.");
        }
      } catch (err: any) {
        console.error("Verification fetch error:", err);
        setError("Connection error during verification.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [id]);

  const handleMarkDispensed = async () => {
    if (!id || dispensing) return;
    setDispensing(true);
    try {
      const docRef = doc(db, "diagnoses", id);
      await updateDoc(docRef, {
        dispensed: true,
        dispensedAt: Timestamp.now(),
      });
      setDispensed(true);
    } catch (err) {
      console.error("Error updating dispensed state:", err);
    } finally {
      setDispensing(false);
    }
  };

  return (
    <IonPage className="verify-rx-page">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Medical Prescription Verification</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div className="verify-loading">
            <IonSpinner name="crescent" />
            <p>Verifying authenticity with the Medical Council...</p>
          </div>
        ) : error ? (
          <div className="verify-error-card">
            <IonIcon icon={alertCircle} className="error-icon" />
            <h2>Prescription Not Recognized</h2>
            <p>{error}</p>
            <IonButton fill="outline" onClick={() => history.push("/")}>
              Return to Home
            </IonButton>
          </div>
        ) : (
          <div className="verify-container">
            <div className="verify-status-banner valid">
              <IonIcon icon={shieldCheckmark} className="status-shield-icon" />
              <div>
                <h2>Authenticated Prescription</h2>
                <p>Issued via the official HomeCare237 platform</p>
              </div>
            </div>

            <IonCard className="rx-details-card">
              <IonCardHeader>
                <div className="rx-header-row">
                  <div>
                    <IonCardTitle>Réf: {id.slice(0, 12).toUpperCase()}</IonCardTitle>
                    <IonCardSubtitle>
                      Date: {diagnosis?.date || new Date().toLocaleDateString("fr-FR")}
                    </IonCardSubtitle>
                  </div>
                  {dispensed ? (
                    <IonBadge color="medium" className="rx-dispense-badge">
                      ALREADY DISPENSED IN PHARMACY
                    </IonBadge>
                  ) : (
                    <IonBadge color="success" className="rx-dispense-badge">
                      VALID FOR DISPENSING
                    </IonBadge>
                  )}
                </div>
              </IonCardHeader>

              <IonCardContent>
                <div className="rx-info-section">
                  <h3>
                    <IonIcon icon={personOutline} /> Practicing Doctor
                  </h3>
                  <p className="highlight-text">Dr. {diagnosis?.doctor?.name || "Attending Physician"}</p>
                  <p className="sub-text">
                    Specialty: {diagnosis?.doctor?.specialty || "General Medicine"}
                  </p>
                  <p className="sub-text">
                    Establishment: {diagnosis?.doctor?.hospital || "HomeCare237 Partner Hospital"}
                  </p>
                  <div className="onmc-pill">
                    <IonIcon icon={shieldCheckmark} />
                    <span>Registered with the National Medical Council (ONMC N°: {diagnosis?.doctor?.onmcNumber || "237-MED-" + (id.slice(0, 5).toUpperCase())})</span>
                  </div>
                </div>

                <div className="rx-info-section">
                  <h3>
                    <IonIcon icon={personOutline} /> Patient
                  </h3>
                  <p className="highlight-text">{diagnosis?.patient?.name || "Patient"}</p>
                  <p className="sub-text">Age: {diagnosis?.patient?.age || "—"} years · Record N°: {diagnosis?.patient?.medicalRecordNumber || id.slice(0, 8)}</p>
                </div>

                <div className="rx-info-section">
                  <h3>
                    <IonIcon icon={medkitOutline} /> Prescribed Medications
                  </h3>
                  {diagnosis?.prescriptions && diagnosis.prescriptions.length > 0 ? (
                    <IonList lines="full" className="medication-list">
                      {diagnosis.prescriptions.map((p: any, idx: number) => (
                        <IonItem key={idx}>
                          <IonLabel>
                            <h4>{p.medication || p.name}</h4>
                            <p>Dosage: {p.dosage || "As prescribed"} | Frequency: {p.frequency || "Daily"}</p>
                            {p.duration && <p>Duration: {p.duration}</p>}
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>
                  ) : (
                    <p className="no-meds">Consult the complete prescription for therapeutic instructions.</p>
                  )}
                </div>

                {/* Pharmacy Dispense Button */}
                <div className="pharmacy-action-box">
                  <h4>Pharmacist Space</h4>
                  <p>
                    To prevent counterfeiting or double dispensing, mark this prescription once medications are given to the patient.
                  </p>
                  <IonButton
                    expand="block"
                    color={dispensed ? "medium" : "primary"}
                    disabled={dispensed || dispensing}
                    onClick={handleMarkDispensed}
                  >
                    {dispensed ? "Prescription Already Dispensed" : dispensing ? <IonSpinner name="dots" /> : "Mark as Dispensed in Pharmacy"}
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default VerifyPrescription;
