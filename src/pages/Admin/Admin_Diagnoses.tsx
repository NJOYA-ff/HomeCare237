import React, { useState, useEffect, useRef } from "react";
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
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert,
  IonBadge,
  IonChip,
  IonButtons,
  IonBackButton,
  IonModal,
  IonList,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import {
  downloadOutline,
  documentTextOutline,
  flaskOutline,
  closeOutline,
  personOutline,
  calendarOutline,
  medicalOutline,
} from "ionicons/icons";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  collection,
  getDocs,
  onSnapshot,
  Timestamp,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import { DiagnosesDocument } from "./DiagnosesDocument";
import "./Admin3.scss";

interface Doctor {
  name: string;
  specialty: string;
  hospital: string;
  id?: string;
}

interface LabResult {
  id: string;
  name: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
  results: { [key: string]: string };
  notes?: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: "active" | "completed" | "cancelled";
  instructions?: string;
}

interface Diagnosis {
  id: string;
  patientId: string;
  patientName?: string;
  date: string;
  doctor: Doctor;
  condition: string;
  description: string;
  status: "active" | "resolved" | "followup";
  labResults: LabResult[];
  prescriptions: Prescription[];
}

const Admin_diagnoses: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Load data from Firebase with real-time updates
  useEffect(() => {
    const fetchDiagnoses = async () => {
      try {
        setLoading(true);

        // Fetch all diagnoses from Firestore with real-time listener
        const diagnosesRef = collection(db, "diagnoses");
        const diagnosesQuery = query(diagnosesRef);

        const unsubscribe = onSnapshot(
          diagnosesQuery,
          (querySnapshot) => {
            const diagnosesData: Diagnosis[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();

              // Convert Timestamp fields in labResults
              const labResults: LabResult[] = (data.labResults || []).map(
                (lab: any) => ({
                  ...lab,
                  date:
                    lab.date instanceof Timestamp
                      ? lab.date.toDate().toLocaleDateString()
                      : lab.date || "",
                }),
              );

              // Convert Timestamp fields in prescriptions
              const prescriptions: Prescription[] = (
                data.prescriptions || []
              ).map((rx: any) => {
                const startDate =
                  rx.startDate instanceof Timestamp
                    ? rx.startDate.toDate()
                    : new Date(rx.startDate || "");
                const endDate =
                  rx.endDate instanceof Timestamp
                    ? rx.endDate.toDate()
                    : new Date(rx.endDate || "");

                // Calculate duration string
                const durationDays = Math.floor(
                  (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                const duration =
                  durationDays > 0 ? `${durationDays} days` : "As prescribed";

                return {
                  ...rx,
                  duration: duration,
                };
              });

              diagnosesData.push({
                id: doc.id,
                ...data,
                date:
                  data.date instanceof Timestamp
                    ? data.date.toDate().toLocaleDateString()
                    : data.date || "",
                labResults: labResults,
                prescriptions: prescriptions,
              } as Diagnosis);
            });

            setDiagnoses(diagnosesData);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching diagnoses:", error);
            setError("Failed to load diagnoses data from database");
            setLoading(false);
          },
        );

        return unsubscribe;
      } catch (err) {
        console.error("Error setting up diagnoses listener:", err);
        setError("Failed to load diagnoses data");
        setLoading(false);
      }
    };

    const unsubscribePromise = fetchDiagnoses();

    return () => {
      unsubscribePromise.then((unsub) => {
        if (unsub) unsub();
      });
    };
  }, []);

  const handleDiagnosisSelect = (diagnosis: Diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowModal(true);
    // Scroll to top when opening details
    contentRef.current?.scrollToTop(300);
  };

  const handleCloseDetails = () => {
    setShowModal(false);
    setSelectedDiagnosis(null);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle className="diagnoses-tilte">Diagnoses</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading diagnoses...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Diagnoses</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonAlert
            isOpen={!!error}
            header="Error"
            message={error}
            buttons={["OK"]}
          />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle>Diagnoses</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef}>
        <div className="diagnoses-container">
          {diagnoses.map((diagnosis) => (
            <IonCard key={diagnosis.id} className="diagnosis-card" onClick={() => handleDiagnosisSelect(diagnosis)} button>
              <IonCardHeader>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <IonCardTitle style={{ fontSize: "1rem", fontWeight: 700 }}>
                    <IonIcon icon={personOutline} style={{ marginRight: 6 }} />{diagnosis.patientName}
                  </IonCardTitle>
                  <IonChip color={diagnosis.status === "active" ? "warning" : diagnosis.status === "followup" ? "primary" : "success"}
                    style={{ margin: 0, height: 24, fontSize: "0.7rem" }}>
                    {diagnosis.status}
                  </IonChip>
                </div>
                <IonBadge color="primary" style={{ fontSize: "0.8rem", padding: "5px 10px", borderRadius: 8 }}>
                  {diagnosis.condition}
                </IonBadge>
                <IonCardSubtitle style={{ marginTop: 8, fontSize: "0.8rem" }}>
                  <IonIcon icon={personOutline} style={{ marginRight: 4 }} />
                  {diagnosis.doctor.name} · {diagnosis.doctor.specialty}
                </IonCardSubtitle>
                <IonCardSubtitle style={{ fontSize: "0.78rem" }}>
                  <IonIcon icon={calendarOutline} style={{ marginRight: 4 }} />
                  {new Date(diagnosis.date).toLocaleDateString()}
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p className="diagnosis-description">{diagnosis.description}</p>
                <div className="stats-container">
                  <span className="stat-badge lab-count">
                    <IonIcon icon={flaskOutline} /> {diagnosis.labResults.length} Labs
                  </span>
                  <span className="stat-badge prescription-count">
                    <IonIcon icon={medicalOutline} /> {diagnosis.prescriptions.length} Rx
                  </span>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </div>

        <IonModal isOpen={showModal} onDidDismiss={handleCloseDetails}>
          <IonHeader>
            <IonToolbar>
              <IonTitle style={{ fontSize: "1rem" }}>
                {selectedDiagnosis?.patientName} — {selectedDiagnosis?.condition}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleCloseDetails}><IonIcon icon={closeOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedDiagnosis && (
              <>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--ion-color-medium)", marginBottom: 8 }}>Diagnosis Info</p>
                <IonCard className="info-card">
                  <IonCardContent>
                    <div className="info-grid">
                      <div className="info-item"><IonLabel>Condition</IonLabel><p>{selectedDiagnosis.condition}</p></div>
                      <div className="info-item"><IonLabel>Date</IonLabel><p>{new Date(selectedDiagnosis.date).toLocaleDateString()}</p></div>
                      <div className="info-item full-width"><IonLabel>Description</IonLabel><p>{selectedDiagnosis.description}</p></div>
                    </div>
                  </IonCardContent>
                </IonCard>

                {selectedDiagnosis.labResults.length > 0 && (
                  <>
                    <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--ion-color-medium)", margin: "16px 0 8px" }}>
                      Lab Results
                    </p>
                    {selectedDiagnosis.labResults.map((lab) => (
                      <IonCard key={lab.id} className="lab-result-card">
                        <IonCardHeader>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <IonCardTitle style={{ fontSize: "0.95rem", fontWeight: 700 }}>{lab.name}</IonCardTitle>
                            <IonBadge color={lab.status === "completed" ? "success" : lab.status === "pending" ? "warning" : "danger"}>{lab.status}</IonBadge>
                          </div>
                          <IonCardSubtitle>{new Date(lab.date).toLocaleDateString()}</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <div className="lab-results-grid">
                            {Object.entries(lab.results).map(([key, value]) => (
                              <div key={key} className="lab-result-item">
                                <span className="lab-result-key">{key}</span>
                                <span className="lab-result-value">{value as string}</span>
                              </div>
                            ))}
                          </div>
                          {lab.notes && <div className="lab-notes"><p><strong>Notes:</strong> {lab.notes}</p></div>}
                          <div className="download-button-container">
                            <PDFDownloadLink
                              document={<DiagnosesDocument diagnosis={selectedDiagnosis} type="lab" labId={lab.id} />}
                              fileName={`${selectedDiagnosis.patientName}_${lab.name.replace(/\s+/g, "_")}.pdf`}>
                              {({ loading }) => (
                                <IonButton size="small" fill="outline" disabled={loading}>
                                  <IonIcon slot="start" icon={downloadOutline} />
                                  {loading ? "Preparing..." : "Download"}
                                </IonButton>
                              )}
                            </PDFDownloadLink>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </>
                )}

                {selectedDiagnosis.prescriptions.length > 0 && (
                  <>
                    <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--ion-color-medium)", margin: "16px 0 8px" }}>
                      Prescriptions
                    </p>
                    {selectedDiagnosis.prescriptions.map((rx) => (
                      <IonCard key={rx.id} className="prescription-card">
                        <IonCardHeader>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <IonCardTitle style={{ fontSize: "0.95rem", fontWeight: 700 }}>{rx.medication}</IonCardTitle>
                            <IonBadge color={rx.status === "active" ? "success" : "medium"}>{rx.status}</IonBadge>
                          </div>
                          <IonCardSubtitle>{rx.dosage}</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <div className="prescription-grid">
                            <div className="prescription-item"><IonLabel>Frequency</IonLabel><p>{rx.frequency}</p></div>
                            <div className="prescription-item"><IonLabel>Duration</IonLabel><p>{rx.duration}</p></div>
                            {rx.instructions && <div className="prescription-item full-width"><IonLabel>Instructions</IonLabel><p>{rx.instructions}</p></div>}
                          </div>
                          <div className="download-button-container">
                            <PDFDownloadLink
                              document={<DiagnosesDocument diagnosis={selectedDiagnosis} type="prescription" prescriptionId={rx.id} />}
                              fileName={`${selectedDiagnosis.patientName}_${rx.medication.replace(/\s+/g, "_")}_Rx.pdf`}>
                              {({ loading }) => (
                                <IonButton size="small" fill="outline" disabled={loading}>
                                  <IonIcon slot="start" icon={downloadOutline} />
                                  {loading ? "Preparing..." : "Download"}
                                </IonButton>
                              )}
                            </PDFDownloadLink>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </>
                )}
              </>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Admin_diagnoses;