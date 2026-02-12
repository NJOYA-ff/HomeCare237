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
        <IonToolbar className="diagnoses-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />{" "}
          </IonButtons>
          <IonTitle className="diagnoses-tilte">Patient Diagnoses</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef}>
        <div className="diagnoses-container">
          {diagnoses.map((diagnosis) => (
            <IonCard
              key={diagnosis.id}
              className="diagnosis-card"
              onClick={() => handleDiagnosisSelect(diagnosis)}
              button
            >
              <IonCardHeader>
                <IonCardTitle color={"light"}>
                  <IonIcon icon={personOutline} /> {diagnosis.patientName}
                </IonCardTitle>
                <IonCardSubtitle className="condition-badge">
                  <IonBadge color="primary">{diagnosis.condition}</IonBadge>
                </IonCardSubtitle>
                <IonCardSubtitle>
                  <IonIcon icon={personOutline} /> {diagnosis.doctor.name} -{" "}
                  {diagnosis.doctor.specialty}
                </IonCardSubtitle>
                <IonCardSubtitle>
                  <IonIcon icon={calendarOutline} />{" "}
                  {new Date(diagnosis.date).toLocaleDateString()}
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p className="diagnosis-description">{diagnosis.description}</p>
                <IonChip
                  color={
                    diagnosis.status === "active"
                      ? "warning"
                      : diagnosis.status === "followup"
                      ? "primary"
                      : "success"
                  }
                  style={{ marginBottom: "10px" }}
                >
                  {diagnosis.status}
                </IonChip>
                <div className="stats-container">
                  <span className="stat-badge lab-count">
                    <IonIcon icon={flaskOutline} />{" "}
                    {diagnosis.labResults.length} Lab Tests
                  </span>
                  <span className="stat-badge prescription-count">
                    <IonIcon icon={medicalOutline} />{" "}
                    {diagnosis.prescriptions.length} Prescriptions
                  </span>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </div>

        <IonModal isOpen={showModal} onDidDismiss={handleCloseDetails}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                <IonIcon icon={personOutline} />{" "}
                {selectedDiagnosis?.patientName}'s Diagnosis
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleCloseDetails}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {selectedDiagnosis && (
              <div className="diagnosis-details-content">
                <div className="diagnosis-info-section">
                  <h3>
                    <IonIcon icon={documentTextOutline} /> Diagnosis Information
                  </h3>
                  <IonCard className="info-card">
                    <IonCardContent>
                      <IonGrid>
                        <IonRow>
                          <IonCol size="12" size-md="6">
                            <IonItem>
                              <IonLabel>Condition</IonLabel>
                              <p>{selectedDiagnosis.condition}</p>
                            </IonItem>
                          </IonCol>
                          <IonCol size="12" size-md="6">
                            <IonItem>
                              <IonLabel>Diagnosis Date</IonLabel>
                              <p>
                                {new Date(
                                  selectedDiagnosis.date,
                                ).toLocaleDateString()}
                              </p>
                            </IonItem>
                          </IonCol>
                          <IonCol size="12">
                            <IonItem>
                              <IonLabel>Description</IonLabel>
                              <p>{selectedDiagnosis.description}</p>
                            </IonItem>
                          </IonCol>
                        </IonRow>
                      </IonGrid>
                    </IonCardContent>
                  </IonCard>
                </div>

                <div className="lab-results-section">
                  <h3>
                    <IonIcon icon={flaskOutline} /> Lab Results
                  </h3>
                  {selectedDiagnosis.labResults.map((lab) => (
                    <IonCard key={lab.id} className="lab-result-card">
                      <IonCardHeader>
                        <div className="card-header-content">
                          <IonCardTitle color={"light"}>
                            {lab.name}
                          </IonCardTitle>
                          <IonBadge
                            color={
                              lab.status === "completed"
                                ? "success"
                                : lab.status === "pending"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {lab.status}
                          </IonBadge>
                        </div>
                        <IonCardSubtitle>
                          {new Date(lab.date).toLocaleDateString()}
                        </IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonList>
                          {Object.entries(lab.results).map(([key, value]) => (
                            <IonItem key={key}>
                              <IonLabel>
                                <h3>{key}</h3>
                                <p>{value}</p>
                              </IonLabel>
                            </IonItem>
                          ))}
                        </IonList>
                        {lab.notes && (
                          <div className="lab-notes">
                            <p>
                              <strong>Notes:</strong> {lab.notes}
                            </p>
                          </div>
                        )}
                        <div className="download-button-container">
                          <PDFDownloadLink
                            document={
                              <DiagnosesDocument
                                diagnosis={selectedDiagnosis}
                                type="lab"
                                labId={lab.id}
                              />
                            }
                            fileName={`${
                              selectedDiagnosis.patientName
                            }_${lab.name.replace(/\s+/g, "_")}_${lab.date}.pdf`}
                          >
                            {({ loading }) => (
                              <IonButton
                                size="small"
                                disabled={loading}
                                fill="outline"
                              >
                                <IonIcon slot="start" icon={downloadOutline} />
                                {loading
                                  ? "Preparing PDF..."
                                  : "Download Lab Result"}
                              </IonButton>
                            )}
                          </PDFDownloadLink>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  ))}
                </div>

                <div className="prescriptions-section">
                  <h3>
                    <IonIcon icon={medicalOutline} /> Prescriptions
                  </h3>
                  {selectedDiagnosis.prescriptions.map((prescription) => (
                    <IonCard
                      key={prescription.id}
                      className="prescription-card"
                    >
                      <IonCardHeader>
                        <div className="card-header-content">
                          <IonCardTitle color={"light"}>
                            {prescription.medication}
                          </IonCardTitle>
                          <IonBadge
                            color={
                              prescription.status === "active"
                                ? "success"
                                : "medium"
                            }
                          >
                            {prescription.status}
                          </IonBadge>
                        </div>
                        <IonCardSubtitle>{prescription.dosage}</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonList>
                          <IonItem>
                            <IonLabel>
                              <h3>Frequency</h3>
                              <p>{prescription.frequency}</p>
                            </IonLabel>
                          </IonItem>
                          <IonItem>
                            <IonLabel>
                              <h3>Duration</h3>
                              <p>{prescription.duration}</p>
                            </IonLabel>
                          </IonItem>
                          <IonItem>
                            <IonLabel>
                              <h3>Instructions</h3>
                              <p>{prescription.instructions}</p>
                            </IonLabel>
                          </IonItem>
                        </IonList>
                        <div className="download-button-container">
                          <PDFDownloadLink
                            document={
                              <DiagnosesDocument
                                diagnosis={selectedDiagnosis}
                                type="prescription"
                                prescriptionId={prescription.id}
                              />
                            }
                            fileName={`${
                              selectedDiagnosis.patientName
                            }_${prescription.medication.replace(
                              /\s+/g,
                              "_",
                            )}_Prescription.pdf`}
                          >
                            {({ loading }) => (
                              <IonButton
                                size="small"
                                disabled={loading}
                                fill="outline"
                              >
                                <IonIcon slot="start" icon={downloadOutline} />
                                {loading
                                  ? "Preparing PDF..."
                                  : "Download Prescription"}
                              </IonButton>
                            )}
                          </PDFDownloadLink>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  ))}
                </div>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Admin_diagnoses;
