import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonIcon,
  IonButton,
  IonSpinner,
  IonBadge,
  IonText,
  IonChip,
  IonAlert,
  IonModal,
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  documentTextOutline,
  calendarOutline,
  personOutline,
  medicalOutline,
  flaskOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeOutline,
} from "ionicons/icons";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import download from "@material-design-icons/svg/outlined/download.svg";
import "./Diagnoses.scss";
import { motion } from "framer-motion";

// TypeScript interfaces
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
  results: Record<string, string>;
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
  date: string;
  doctor: Doctor;
  condition: string;
  description: string;
  status: "active" | "resolved" | "followup";
  labResults: LabResult[];
  prescriptions: Prescription[];
  createdAt?: string;
  updatedAt?: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  medicalRecordNumber: string;
}

// PDF Styles (keep the same styles)
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  header: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#2c7da0",
    color: "white",
    textAlign: "center",
  },
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    color: "#2c7da0",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 5,
    color: "#01497c",
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    padding: 5,
  },
  cell: {
    flex: 1,
    fontSize: 10,
  },
  headerRow: {
    backgroundColor: "#f8f9fa",
    fontWeight: "bold",
  },
  watermark: {
    position: "absolute",
    bottom: 150,
    left: 0,
    right: 0,
    textAlign: "center",
    opacity: 0.1,
    transform: "rotate(-45deg)",
    fontSize: 60,
    color: "#2c5aa0",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    color: "#666666",
  },
});

// PDF Document Components with patient data
const DiagnosisPDF: React.FC<{ diagnosis: Diagnosis; patient: Patient }> = ({
  diagnosis,
  patient,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.watermark}>Diagnosis</Text>
      <View style={styles.header}>
        <Text>HomeCare Cameroon - Medical Report</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Patient Information</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Name:</Text> {patient.name}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Age:</Text> {patient.age}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Gender:</Text> {patient.gender}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Medical Record #:</Text>{" "}
          {patient.medicalRecordNumber}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Diagnosis Report</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Condition:</Text>{" "}
          {diagnosis.condition}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
          {new Date(diagnosis.date).toLocaleDateString("en-CM")}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Doctor:</Text>{" "}
          {diagnosis.doctor.name}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Specialty:</Text>{" "}
          {diagnosis.doctor.specialty}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Hospital:</Text>{" "}
          {diagnosis.doctor.hospital}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Description:</Text>{" "}
          {diagnosis.description}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Status:</Text> {diagnosis.status}
        </Text>
      </View>

      {diagnosis.labResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Lab Results</Text>
          {diagnosis.labResults.map((labResult) => (
            <View key={labResult.id} style={{ marginBottom: 10 }}>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Test:</Text>{" "}
                {labResult.name}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
                {new Date(labResult.date).toLocaleDateString("en-CM")}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Status:</Text>{" "}
                {labResult.status}
              </Text>

              <View style={[styles.row, styles.headerRow]}>
                <Text style={styles.cell}>Parameter</Text>
                <Text style={styles.cell}>Value</Text>
              </View>

              {Object.entries(labResult.results).map(([key, value]) => (
                <View key={key} style={styles.row}>
                  <Text style={styles.cell}>{key}</Text>
                  <Text style={styles.cell}>{value}</Text>
                </View>
              ))}

              {labResult.notes && (
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Notes:</Text>{" "}
                  {labResult.notes}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {diagnosis.prescriptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Prescriptions</Text>
          {diagnosis.prescriptions.map((prescription) => (
            <View key={prescription.id} style={{ marginBottom: 10 }}>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Medication:</Text>{" "}
                {prescription.medication}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Dosage:</Text>{" "}
                {prescription.dosage}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Frequency:</Text>{" "}
                {prescription.frequency}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Duration:</Text>{" "}
                {prescription.duration}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Status:</Text>{" "}
                {prescription.status}
              </Text>
              {prescription.instructions && (
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Instructions:</Text>{" "}
                  {prescription.instructions}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.footer}>
        Generated by HomeCare Cameroon -{" "}
        {new Date().toLocaleDateString("en-CM")}
      </Text>
    </Page>
  </Document>
);

const LabResultPDF: React.FC<{ labResult: LabResult; patient: Patient }> = ({
  labResult,
  patient,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.watermark}>Lab Result</Text>
      <View style={styles.header}>
        <Text>HomeCare Cameroon - Lab Results</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Patient Information</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Name:</Text> {patient.name}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Age:</Text> {patient.age}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Gender:</Text> {patient.gender}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Medical Record #:</Text>{" "}
          {patient.medicalRecordNumber}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Lab Test Report</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Test Name:</Text>{" "}
          {labResult.name}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
          {new Date(labResult.date).toLocaleDateString("en-CM")}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Status:</Text> {labResult.status}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Results</Text>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={styles.cell}>Parameter</Text>
          <Text style={styles.cell}>Value</Text>
        </View>

        {Object.entries(labResult.results).map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.cell}>{key}</Text>
            <Text style={styles.cell}>{value}</Text>
          </View>
        ))}
      </View>

      {labResult.notes && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Notes</Text>
          <Text style={styles.text}>{labResult.notes}</Text>
        </View>
      )}

      <Text style={styles.footer}>
        Generated by HomeCare Cameroon -{" "}
        {new Date().toLocaleDateString("en-CM")}
      </Text>
    </Page>
  </Document>
);

const PrescriptionPDF: React.FC<{
  prescription: Prescription;
  patient: Patient;
}> = ({ prescription, patient }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.watermark}>Prescriptions</Text>
      <View style={styles.header}>
        <Text>HomeCare Cameroon - Prescription</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Patient Information</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Name:</Text> {patient.name}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Age:</Text> {patient.age}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Gender:</Text> {patient.gender}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Medical Record #:</Text>{" "}
          {patient.medicalRecordNumber}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Medication Prescription</Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Medication:</Text>{" "}
          {prescription.medication}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Dosage:</Text>{" "}
          {prescription.dosage}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Frequency:</Text>{" "}
          {prescription.frequency}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Duration:</Text>{" "}
          {prescription.duration}
        </Text>
        <Text style={styles.text}>
          <Text style={{ fontWeight: "bold" }}>Status:</Text>{" "}
          {prescription.status}
        </Text>
      </View>

      {prescription.instructions && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Instructions</Text>
          <Text style={styles.text}>{prescription.instructions}</Text>
        </View>
      )}

      <Text style={styles.footer}>
        Generated by HomeCare Cameroon -{" "}
        {new Date().toLocaleDateString("en-CM")}
      </Text>
    </Page>
  </Document>
);

// Main Diagnoses Page Component
const Diagnoses: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const fetchDiagnoses = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setAlertMessage("Please log in to view your diagnoses.");
          setShowAlert(true);
          setLoading(false);
          return;
        }

        // Get patient data
        const patientDoc = await getDoc(doc(db, "patients", user.uid));
        if (!patientDoc.exists()) {
          setAlertMessage("Patient record not found.");
          setShowAlert(true);
          setLoading(false);
          return;
        }

        const patientData = patientDoc.data() as Patient;
        setPatient(patientData);

        // Query diagnoses for this patient
        const diagnosesQuery = query(
          collection(db, "diagnoses"),
          where("patientId", "==", user.uid),
          orderBy("date", "desc")
        );

        // Real-time listener for diagnoses
        const unsubscribe = onSnapshot(
          diagnosesQuery,
          (querySnapshot) => {
            const diagnosesData: Diagnosis[] = [];
            querySnapshot.forEach((doc) => {
              diagnosesData.push({
                id: doc.id,
                ...doc.data(),
              } as Diagnosis);
            });
            setDiagnoses(diagnosesData);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching diagnoses:", error);
            setAlertMessage(
              "Failed to load diagnoses. Please try again later."
            );
            setShowAlert(true);
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error fetching data:", error);
        setAlertMessage("Failed to load data. Please try again later.");
        setShowAlert(true);
        setLoading(false);
      }
    };

    fetchDiagnoses();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonHeader class="ion-no-border">
          <IonToolbar>
            <IonTitle>My Diagnoses</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div className="loading-container">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
            <IonText className="ion-text-center ion-padding">
              <p>Loading your dashboard...</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>My Diagnoses</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="diagnoses-container">
          {diagnoses.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={documentTextOutline} size="large" />
              <h3>No diagnoses found</h3>
              <p>You don't have any diagnoses records yet.</p>
            </div>
          ) : (
            diagnoses.map((diagnosis) => (
              <DiagnosisCard
                key={diagnosis.id}
                diagnosis={diagnosis}
                patient={patient!}
              />
            ))
          )}
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertMessage.includes("Failed") ? "Error" : "Success"}
          message={alertMessage}
          buttons={["OK"]}
        />
      </IonContent>
    </IonPage>
  );
};

const DiagnosisCard: React.FC<{
  diagnosis: Diagnosis;
  patient: Patient;
}> = ({ diagnosis, patient }) => {
  const [showLabResultsModal, setShowLabResultsModal] = useState(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-CM", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <IonCard className="diagnosis-card-p">
        <IonCardHeader className="card-header-p">
          <div className="card-header-content">
            <div>
              <IonCardTitle class="card-title-p">
                {diagnosis.condition}
              </IonCardTitle>
              <p className="diagnosis-date">
                <IonIcon icon={calendarOutline} />
                {formatDate(diagnosis.date)}
              </p>
            </div>
            <IonBadge
              color={diagnosis.status === "active" ? "warning" : "success"}
            >
              {diagnosis.status}
            </IonBadge>
          </div>
        </IonCardHeader>

        <IonCardContent>
          <div className="doctor-info">
            <IonIcon icon={personOutline} />
            <div>
              <p className="doctor-name">{diagnosis.doctor.name}</p>
              <p className="doctor-specialty">{diagnosis.doctor.specialty}</p>
              <p className="hospital">{diagnosis.doctor.hospital}</p>
            </div>
          </div>

          <p className="diagnosis-description">{diagnosis.description}</p>

          <div className="action-buttons">
            {diagnosis.labResults.length > 0 && (
              <IonButton
                expand="block"
                onClick={() => setShowLabResultsModal(true)}
              >
                <IonIcon icon={flaskOutline} slot="start" />
                View Lab Results ({diagnosis.labResults.length})
              </IonButton>
            )}

            {diagnosis.prescriptions.length > 0 && (
              <IonButton
                expand="block"
                onClick={() => setShowPrescriptionsModal(true)}
              >
                <IonIcon icon={medicalOutline} slot="start" />
                View Prescriptions ({diagnosis.prescriptions.length})
              </IonButton>
            )}

            <PDFDownloadLink
              document={
                <DiagnosisPDF diagnosis={diagnosis} patient={patient} />
              }
              fileName={`Diagnosis_${diagnosis.condition.replace(
                /\s+/g,
                "_"
              )}.pdf`}
              className="pdf-download-link"
            >
              {({ loading }) => (
                <IonButton expand="block" fill="outline" disabled={loading}>
                  <IonIcon icon={download} slot="start" />
                  {loading ? "Preparing..." : "Export Full Report"}
                </IonButton>
              )}
            </PDFDownloadLink>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Lab Results Modal */}
      <IonModal
        isOpen={showLabResultsModal}
        onDidDismiss={() => setShowLabResultsModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Lab Results</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowLabResultsModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="modal-content">
            {diagnosis.labResults.map((labResult) => (
              <LabResultItem
                key={labResult.id}
                labResult={labResult}
                patient={patient}
              />
            ))}
          </div>
        </IonContent>
      </IonModal>

      {/* Prescriptions Modal */}
      <IonModal
        isOpen={showPrescriptionsModal}
        onDidDismiss={() => setShowPrescriptionsModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Prescriptions</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowPrescriptionsModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="modal-content">
            {diagnosis.prescriptions.map((prescription) => (
              <PrescriptionItem
                key={prescription.id}
                prescription={prescription}
                patient={patient}
              />
            ))}
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

const LabResultItem: React.FC<{
  labResult: LabResult;
  patient: Patient;
}> = ({ labResult, patient }) => {
  return (
    <IonCard className="lab-result-card">
      <IonCardHeader>
        <div className="card-header-content">
          <IonCardTitle>{labResult.name}</IonCardTitle>
          <IonChip
            color={labResult.status === "completed" ? "success" : "warning"}
          >
            <IonIcon
              icon={
                labResult.status === "completed"
                  ? checkmarkCircleOutline
                  : timeOutline
              }
            />
            <IonLabel>{labResult.status}</IonLabel>
          </IonChip>
        </div>
        <p className="result-date">
          <IonIcon icon={calendarOutline} />
          {new Date(labResult.date).toLocaleDateString("en-CM")}
        </p>
      </IonCardHeader>

      <IonCardContent>
        <div className="results-container">
          {Object.entries(labResult.results).map(([key, value]) => (
            <div key={key} className="result-item">
              <span className="result-key">{key}:</span>
              <span className="result-value">{value}</span>
            </div>
          ))}
        </div>

        {labResult.notes && (
          <div className="result-notes">
            <IonText>
              <h4>Notes:</h4>
              <p>{labResult.notes}</p>
            </IonText>
          </div>
        )}

        <PDFDownloadLink
          document={<LabResultPDF labResult={labResult} patient={patient} />}
          fileName={`Lab_Result_${labResult.name.replace(/\s+/g, "_")}.pdf`}
          className="pdf-download-link"
        >
          {({ loading }) => (
            <IonButton expand="block" fill="outline" disabled={loading}>
              {loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={download} slot="start" />
                  Save as PDF
                </>
              )}
            </IonButton>
          )}
        </PDFDownloadLink>
      </IonCardContent>
    </IonCard>
  );
};

const PrescriptionItem: React.FC<{
  prescription: Prescription;
  patient: Patient;
}> = ({ prescription, patient }) => {
  return (
    <IonCard className="prescription-card">
      <IonCardHeader>
        <div className="card-header-content">
          <IonCardTitle>{prescription.medication}</IonCardTitle>
          <IonChip
            color={prescription.status === "active" ? "success" : "warning"}
          >
            <IonIcon
              icon={
                prescription.status === "active"
                  ? checkmarkCircleOutline
                  : timeOutline
              }
            />
            <IonLabel>{prescription.status}</IonLabel>
          </IonChip>
        </div>
      </IonCardHeader>

      <IonCardContent>
        <div className="prescription-details">
          <div className="detail-item">
            <span className="detail-label">Dosage:</span>
            <span className="detail-value">{prescription.dosage}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Frequency:</span>
            <span className="detail-value">{prescription.frequency}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Duration:</span>
            <span className="detail-value">{prescription.duration}</span>
          </div>
        </div>

        {prescription.instructions && (
          <div className="instructions">
            <IonText>
              <h4>Instructions:</h4>
              <p>{prescription.instructions}</p>
            </IonText>
          </div>
        )}

        <PDFDownloadLink
          document={
            <PrescriptionPDF prescription={prescription} patient={patient} />
          }
          fileName={`Prescription_${prescription.medication.replace(
            /\s+/g,
            "_"
          )}.pdf`}
          className="pdf-download-link"
        >
          {({ loading }) => (
            <IonButton expand="block" fill="outline" disabled={loading}>
              {loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={download} slot="start" />
                  Save as PDF
                </>
              )}
            </IonButton>
          )}
        </PDFDownloadLink>
      </IonCardContent>
    </IonCard>
  );
};

export default Diagnoses;
