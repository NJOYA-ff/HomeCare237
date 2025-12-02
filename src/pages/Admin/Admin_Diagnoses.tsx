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
import { DiagnosesDocument } from "./DiagnosesDocument";
import "./Admin3.scss";

interface LabResult {
  id: string;
  testName: string;
  date: string;
  results: { [key: string]: string };
  notes: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  instructions: string;
}

interface Diagnosis {
  id: string;
  patientName: string;
  date: string;
  condition: string;
  description: string;
  labResults: LabResult[];
  prescriptions: Prescription[];
}

const Admin_diagnoses: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Simulate data fetching - replace with Firebase in the future
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock data - replace with Firebase data
        const mockData: Diagnosis[] = [
          {
            id: "1",
            patientName: "John Doe",
            date: "2023-05-15",
            condition: "Type 2 Diabetes",
            description:
              "Patient diagnosed with type 2 diabetes, requires monitoring and medication.",
            labResults: [
              {
                id: "lab1",
                testName: "Blood Glucose",
                date: "2023-05-10",
                results: {
                  Fasting: "145 mg/dL",
                  Postprandial: "210 mg/dL",
                },
                notes:
                  "Elevated glucose levels consistent with diabetes diagnosis.",
              },
              {
                id: "lab2",
                testName: "HbA1c",
                date: "2023-05-10",
                results: {
                  Value: "7.8%",
                  Range: "Normal: <5.7%",
                },
                notes: "Indicates poor glucose control over past 3 months.",
              },
            ],
            prescriptions: [
              {
                id: "rx1",
                medication: "Metformin",
                dosage: "500 mg",
                frequency: "Twice daily",
                startDate: "2023-05-15",
                endDate: "2023-11-15",
                instructions: "Take with meals to reduce stomach upset.",
              },
              {
                id: "rx2",
                medication: "Empagliflozin",
                dosage: "10 mg",
                frequency: "Once daily",
                startDate: "2023-05-15",
                endDate: "2023-11-15",
                instructions: "Take in the morning with or without food.",
              },
            ],
          },
          {
            id: "2",
            patientName: "Jane Smith",
            date: "2023-06-20",
            condition: "Hypertension",
            description:
              "Stage 1 hypertension diagnosed, lifestyle changes and medication recommended.",
            labResults: [
              {
                id: "lab3",
                testName: "Blood Pressure",
                date: "2023-06-18",
                results: {
                  Systolic: "148 mmHg",
                  Diastolic: "92 mmHg",
                },
                notes: "Consistently elevated readings over three visits.",
              },
              {
                id: "lab4",
                testName: "Cholesterol Panel",
                date: "2023-06-18",
                results: {
                  Total: "220 mg/dL",
                  HDL: "45 mg/dL",
                  LDL: "140 mg/dL",
                  Triglycerides: "180 mg/dL",
                },
                notes: "Elevated LDL and triglycerides noted.",
              },
            ],
            prescriptions: [
              {
                id: "rx3",
                medication: "Lisinopril",
                dosage: "10 mg",
                frequency: "Once daily",
                startDate: "2023-06-20",
                endDate: "2023-12-20",
                instructions: "Take in the morning, monitor for dizziness.",
              },
              {
                id: "rx4",
                medication: "Atorvastatin",
                dosage: "20 mg",
                frequency: "Once at bedtime",
                startDate: "2023-06-20",
                endDate: "2024-06-20",
                instructions: "Take with water, avoid grapefruit.",
              },
            ],
          },
          {
            id: "3",
            patientName: "Robert Johnson",
            date: "2023-07-10",
            condition: "Hyperthyroidism",
            description:
              "Patient presents with symptoms consistent with hyperthyroidism, lab tests confirm diagnosis.",
            labResults: [
              {
                id: "lab5",
                testName: "Thyroid Panel",
                date: "2023-07-08",
                results: {
                  TSH: "0.1 mIU/L",
                  "Free T4": "2.8 ng/dL",
                  "Free T3": "5.2 pg/mL",
                },
                notes: "Suppressed TSH with elevated Free T4 and T3.",
              },
            ],
            prescriptions: [
              {
                id: "rx5",
                medication: "Methimazole",
                dosage: "10 mg",
                frequency: "Twice daily",
                startDate: "2023-07-10",
                endDate: "2023-10-10",
                instructions: "Take with food, monitor for rash or fever.",
              },
            ],
          },
        ];

        setDiagnoses(mockData);
        setLoading(false);
      } catch (err) {
        setError("Failed to load diagnoses data");
        setLoading(false);
      }
    };

    fetchData();
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
                  <IonIcon icon={calendarOutline} />{" "}
                  {new Date(diagnosis.date).toLocaleDateString()}
                </IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <p className="diagnosis-description">{diagnosis.description}</p>
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
                                  selectedDiagnosis.date
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
                        <IonCardTitle color={"light"}>
                          {lab.testName}
                        </IonCardTitle>
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
                            }_${lab.testName.replace(/\s+/g, "_")}_${
                              lab.date
                            }.pdf`}
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
                        <IonCardTitle color={"light"}>
                          {prescription.medication}
                        </IonCardTitle>
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
                              <p>
                                {new Date(
                                  prescription.startDate
                                ).toLocaleDateString()}{" "}
                                to{" "}
                                {new Date(
                                  prescription.endDate
                                ).toLocaleDateString()}
                              </p>
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
                              "_"
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
