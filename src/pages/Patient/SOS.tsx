import LoadingHelix from "../../components/LoadingHelix";
import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonText,
  IonToast,
  IonChip,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { motion } from "framer-motion";
import {
  alertCircleOutline,
  callOutline,
  locationOutline,
  shieldCheckmarkOutline,
  shareOutline,
  personOutline,
  medkitOutline,
} from "ionicons/icons";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { sendPushNotification } from "../../utils/pushNotification";
import "./SOS.scss";

interface PatientInfo {
  name: string;
  phone: string;
  bloodType: string;
  height: string;
  weight: string;
  primaryDoctor: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  insurance?: { provider: string; policyNumber: string };
}

interface HealthUnit {
  id: string;
  name: string;
  type: string;
  phone: string;
  address: string;
  town: string;
}

const SOS: React.FC = () => {
  const uid = auth.currentUser?.uid;

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [emergencyUnits, setEmergencyUnits] = useState<HealthUnit[]>([]);
  const [doctorUserId, setDoctorUserId] = useState<string>("");
  const [doctorName, setDoctorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        // 1. Patient profile
        const pDoc = await getDoc(doc(db, "patients", uid));
        if (pDoc.exists()) {
          const data = pDoc.data() as PatientInfo;
          setPatient({ ...data, name: data.name || "Patient" });
        }

        // 2. Emergency-capable health units
        const unitSnap = await getDocs(
          query(
            collection(db, "healthUnits"),
            where("emergency", "==", true),
            limit(3),
          ),
        );
        const units: HealthUnit[] = [];
        unitSnap.forEach((d) => {
          const data = d.data() as any;
          units.push({
            id: d.id,
            name: data.name,
            type: data.type,
            phone: data.phone,
            address: data.address,
            town: data.town,
          });
        });
        setEmergencyUnits(units);

        // 3. Recent doctor from accepted/completed appointments
        const apptSnap = await getDocs(
          query(
            collection(db, "appointments"),
            where("patientId", "==", uid),
            where("status", "in", ["accepted", "completed"]),
            orderBy("date", "desc"),
            limit(1),
          ),
        );
        let doctorDocId = "";
        if (!apptSnap.empty) {
          const appt = apptSnap.docs[0].data() as any;
          doctorDocId = appt.doctorId || "";
          if (appt.doctorName) setDoctorName(appt.doctorName);
        }
        if (doctorDocId) {
          const dDoc = await getDoc(doc(db, "doctors", doctorDocId));
          if (dDoc.exists()) {
            const dData = dDoc.data() as any;
            setDoctorUserId(dData.userId || "");
            setDoctorName((prev) => prev || dData.name || "");
          }
        }
      } catch (err) {
        console.error("Error loading SOS context:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const getCoordinates = async (): Promise<{ lat?: number; lng?: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  const triggerSOS = async () => {
    if (!uid || sending) return;
    setSending(true);

    const coords = await getCoordinates();
    const mapLink = coords?.lat ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";

    try {
      // 1. Persist the alert for admins / care team
      await addDoc(collection(db, "sosAlerts"), {
        patientId: uid,
        patientName: patient?.name || "",
        patientPhone: patient?.phone || "",
        bloodType: patient?.bloodType || "",
        allergies: patient?.allergies || [],
        conditions: patient?.conditions || [],
        doctorNotified: doctorName || "",
        coordinates: coords || null,
        locationUrl: mapLink,
        timestamp: Timestamp.now(),
        resolved: false,
      });

      // 2. Notify their doctor when we know them
      if (doctorUserId) {
        await sendPushNotification({
          recipientId: doctorUserId,
          title: "🚨 Urgence SOS Patient",
          body: `${patient?.name || "A patient"} has triggered an SOS. Location: ${mapLink || "Unknown"}.`,
          data: {
            type: "sos",
            patientId: uid,
            timestamp: Date.now(),
          },
        });
      }

      // 3. Immediate on-device confirmation
      await sendPushNotification({
        recipientId: uid,
        title: "SOS Alert Transmitted",
        body: "The emergency medical team has been alerted. Stay calm, help is on the way.",
        data: { type: "sos-confirm", timestamp: Date.now() },
      });

      setToastMsg("SOS alert transmitted to medical team.");
      setShowToast(true);
      setConfirmOpen(false);
    } catch (err) {
      console.error("Error triggering SOS online, falling back to SMS:", err);
      // OFFLINE SMS FALLBACK
      sendOfflineSms(mapLink);
    } finally {
      setSending(false);
    }
  };

  const sendOfflineSms = (mapLink?: string) => {
    const contact = patient?.emergencyContact?.phone || "119";
    const body = encodeURIComponent(
      `URGENCE SANTE (HomeCare237) - Patient: ${patient?.name || "Patient"}, Groupe: ${
        patient?.bloodType || "N/A"
      }, Allergies: ${patient?.allergies?.join(",") || "Aucune"}. ${
        mapLink ? `Localisation: ${mapLink}` : ""
      }`
    );
    window.open(`sms:${contact}?body=${body}`, "_system");
    setToastMsg("Connexion indisponible : Ouverture du SMS d'urgence...");
    setShowToast(true);
  };

  const shareMedicalID = async () => {
    const text = [
      `MEDICAL ID — ${patient?.name || "Patient"}`,
      `Blood type: ${patient?.bloodType || "—"}`,
      `Allergies: ${patient?.allergies?.join(", ") || "None"}`,
      `Conditions: ${patient?.conditions?.join(", ") || "None"}`,
      `Medications: ${patient?.medications?.join(", ") || "None"}`,
      `Emergency contact: ${patient?.emergencyContact?.name || ""} ${
        patient?.emergencyContact?.phone || ""
      }`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Medical ID", text });
      } else {
        await navigator.clipboard.writeText(text);
        setToastMsg("Medical ID copied to clipboard.");
        setShowToast(true);
      }
    } catch (err) {
      console.warn("Share cancelled:", err);
    }
  };

  return (
    <IonPage className="sos-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Emergency & Medical ID</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <div className="loading-container">
            <LoadingHelix />
            <IonText className="ion-text-center ion-padding">
              <p>Preparing emergency info…</p>
            </IonText>
          </div>
        ) : (
          <>
        {/* SOS hero */}
        <div className="sos-hero">
          <IonIcon icon={alertCircleOutline} className="sos-hero-icon" />
          <h2>Need urgent help?</h2>
          <p>
            Send an emergency alert to your doctor and care team. It includes
            your Medical ID so they know your blood type and allergies.
          </p>
          <button
            className="sos-pulse-btn"
            onClick={() => setConfirmOpen(true)}
            disabled={sending}
            aria-label="Trigger SOS alert"
          >
            <span>{sending ? "SENDING…" : "SOS"}</span>
          </button>
        </div>

        {/* Direct actions */}
        <div className="sos-quick-actions">
          {patient?.emergencyContact?.phone && (
            <IonButton
              fill="outline"
              className="sos-action-btn"
              href={`tel:${patient.emergencyContact.phone}`}
            >
              <IonIcon slot="start" icon={callOutline} />
              Call {patient.emergencyContact.name || "Contact"}
            </IonButton>
          )}
          {emergencyUnits.length > 0 && (
            <IonButton
              fill="outline"
              className="sos-action-btn"
              href={`tel:${emergencyUnits[0].phone}`}
            >
              <IonIcon slot="start" icon={locationOutline} />
              Call nearest clinic
            </IonButton>
          )}
          <IonButton
            fill="outline"
            className="sos-action-btn"
            href="tel:119"
            color="danger"
          >
            <IonIcon slot="start" icon={callOutline} />
            SAMU Cameroun (119)
          </IonButton>
          <IonButton
            fill="outline"
            className="sos-action-btn"
            onClick={() => sendOfflineSms()}
            color="warning"
          >
            <IonIcon slot="start" icon={shareOutline} />
            SOS SMS (Hors-ligne)
          </IonButton>
          <IonButton
            fill="outline"
            className="sos-action-btn"
            routerLink="/patient/health_units_p"
          >
            <IonIcon slot="start" icon={medkitOutline} />
            Find a health unit
          </IonButton>
        </div>

        {/* Notified care team */}
        {doctorName && (
          <IonCard className="sos-info-card">
            <IonCardContent>
              <IonItem lines="none" className="sos-info-item">
                <IonIcon slot="start" icon={personOutline} color="primary" />
                <IonLabel>
                  <h3>Your notified doctor</h3>
                  <p>Dr. {doctorName}</p>
                </IonLabel>
              </IonItem>
            </IonCardContent>
          </IonCard>
        )}

        {/* Medical ID */}
        <IonCard className="sos-medical-id">
          <IonCardContent>
            <div className="medid-head">
              <div className="medid-icon">
                <IonIcon icon={shieldCheckmarkOutline} />
              </div>
              <div>
                <h3>Medical ID</h3>
                <p>Shared in emergencies &amp; available from your lock screen</p>
              </div>
              <IonButton
                fill="clear"
                size="small"
                onClick={shareMedicalID}
                aria-label="Share medical ID"
              >
                <IonIcon icon={shareOutline} />
              </IonButton>
            </div>

            <div className="medid-grid">
              <div className="medid-cell">
                <span>Blood type</span>
                <strong>{patient?.bloodType || "—"}</strong>
              </div>
              <div className="medid-cell">
                <span>Height</span>
                <strong>{patient?.height || "—"}</strong>
              </div>
              <div className="medid-cell">
                <span>Weight</span>
                <strong>{patient?.weight || "—"}</strong>
              </div>
              <div className="medid-cell">
                <span>Primary doctor</span>
                <strong>{patient?.primaryDoctor || "—"}</strong>
              </div>
            </div>

            <div className="medid-section">
              <p className="medid-label">Allergies</p>
              <div className="medid-chips">
                {patient?.allergies?.length ? (
                  patient.allergies.map((a, i) => (
                    <IonChip key={`a-${i}`} color="warning" outline>
                      <IonLabel>{a}</IonLabel>
                    </IonChip>
                  ))
                ) : (
                  <span className="medid-none">None reported</span>
                )}
              </div>
            </div>

            <div className="medid-section">
              <p className="medid-label">Conditions</p>
              <div className="medid-chips">
                {patient?.conditions?.length ? (
                  patient.conditions.map((c, i) => (
                    <IonChip key={`c-${i}`} color="danger" outline>
                      <IonLabel>{c}</IonLabel>
                    </IonChip>
                  ))
                ) : (
                  <span className="medid-none">None reported</span>
                )}
              </div>
            </div>

            <div className="medid-section">
              <p className="medid-label">Emergency contact</p>
              <p className="medid-contact">
                {patient?.emergencyContact?.name || "—"} ·{" "}
                {patient?.emergencyContact?.phone || "—"}
                {patient?.emergencyContact?.relationship
                  ? ` (${patient.emergencyContact.relationship})`
                  : ""}
              </p>
            </div>

            <IonText className="medid-foot">
              <p>
                Keep this information up to date in your profile so caregivers
                can help you faster.
              </p>
            </IonText>
          </IonCardContent>
        </IonCard>

                <MessageBox
          isOpen={confirmOpen}
          title="Trigger SOS alert?"
          message="This immediately alerts your doctor and care team with your Medical ID."
          tone="danger"
          actions={[
            {
              label: "Cancel",
              color: "medium",
              onClick: () => setConfirmOpen(false),
            },
            {
              /* Sending an SOS summons real help — irreversible once the team is
                 dispatched, so the action carries the danger colour. */
              label: "SEND SOS",
              color: "danger",
              onClick: () => triggerSOS(),
            },
          ]}
          onDismiss={() => setConfirmOpen(false)}
        />

        <MessageBox
          isOpen={alertOpen}
          title="SOS"
          message={alertMsg}
          tone="danger"
          actions={[
            {
              label: "OK",
              color: "primary",
              onClick: () => setAlertOpen(false),
            },
          ]}
          onDismiss={() => setAlertOpen(false)}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          color="danger"
          position="top"
          duration={3500}
        />
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SOS;