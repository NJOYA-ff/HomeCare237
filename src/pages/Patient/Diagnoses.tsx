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
  IonToast,
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
  downloadOutline,
} from "ionicons/icons";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import logo from "../images/logo.jpg";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
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

// PDF Styles
const styles = StyleSheet.create({
  page: { flexDirection: "column", backgroundColor: "#FFFFFF", padding: 30 },
  header: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 20, paddingBottom: 14,
    borderBottomWidth: 2, borderBottomColor: "#3b7dd8",
  },
  logo: { width: 48, height: 48 },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#3b7dd8" },
  headerSub: { fontSize: 9, color: "#666", marginTop: 2 },
  section: {
    marginBottom: 14, padding: 12, backgroundColor: "#f7f9fc",
    borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#3b7dd8",
  },
  title: { fontSize: 11, fontWeight: "bold", color: "#3b7dd8", marginBottom: 8, textTransform: "uppercase" },
  subtitle: { fontSize: 10, fontWeight: "bold", color: "#3b7dd8", marginBottom: 6 },
  text: { fontSize: 10, marginBottom: 4, color: "#333" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e8e8e8", padding: 5 },
  cell: { flex: 1, fontSize: 10, color: "#333" },
  headerRow: { backgroundColor: "#e8f0fb" },
  watermark: {
    position: "absolute", bottom: 150, left: 0, right: 0,
    textAlign: "center", opacity: 0.05, transform: "rotate(-45deg)",
    fontSize: 60, color: "#3b7dd8",
  },
  footer: {
    position: "absolute", bottom: 20, left: 30, right: 30,
    textAlign: "center", fontSize: 9, color: "#999",
    borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8,
  },
});

// PDF Document Components with explicit return type
const DiagnosisPDF: React.FC<{ diagnosis: Diagnosis; patient: Patient }> = ({
  diagnosis,
  patient,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.watermark}>Diagnosis</Text>
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>HomeCare Cameroon</Text>
          <Text style={styles.headerSub}>Medical Report</Text>
        </View>
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
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>HomeCare Cameroon</Text>
          <Text style={styles.headerSub}>Laboratory Results</Text>
        </View>
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
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>HomeCare Cameroon</Text>
          <Text style={styles.headerSub}>Medical Prescription</Text>
        </View>
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

// Define a type for PDF documents
type PDFDocumentType = React.ReactElement | undefined;

// Main Diagnoses Page Component
const Diagnoses: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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

        const patientDoc = await getDoc(doc(db, "patients", user.uid));
        if (!patientDoc.exists()) {
          setAlertMessage("Patient record not found.");
          setShowAlert(true);
          setLoading(false);
          return;
        }

        const patientData = patientDoc.data() as Patient;
        setPatient(patientData);

        const diagnosesQuery = query(
          collection(db, "diagnoses"),
          where("patientId", "==", user.uid),
          orderBy("date", "desc"),
        );

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
              "Failed to load diagnoses. Please try again later.",
            );
            setShowAlert(true);
            setLoading(false);
          },
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

  // Function to save PDF to device
  const savePDFToDevice = async (
    pdfDocument: PDFDocumentType,
    fileName: string,
  ) => {
    try {
      // Generate PDF blob
      const blob = await pdf(pdfDocument as any).toBlob();

      // For mobile devices using Capacitor (non-web platforms)
      if (Capacitor.getPlatform && Capacitor.getPlatform() !== "web") {
        const reader = new FileReader();
        reader.readAsDataURL(blob);

        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          const base64Content = base64Data.split(",")[1]; // Remove data URL prefix

          try {
            // Create directory if it doesn't exist
            try {
              await Filesystem.mkdir({
                path: "HomeCare/Documents",
                directory: Directory.Documents,
                recursive: true,
              });
            } catch (e) {
              // Directory might already exist
              console.log("Directory creation:", e);
            }

            // Save the file
            await Filesystem.writeFile({
              path: `HomeCare/Documents/${fileName}.pdf`,
              data: base64Content,
              directory: Directory.Documents,
              recursive: true,
            });

            setToastMessage(
              `PDF saved to Documents/HomeCare/Documents/${fileName}.pdf`,
            );
            setShowToast(true);
          } catch (error) {
            console.error("Error saving PDF:", error);
            setToastMessage("Failed to save PDF. Please try again.");
            setShowToast(true);
          }
        };
      } else {
        // For web browsers
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setToastMessage("PDF downloaded to your device.");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      setToastMessage("Failed to generate PDF.");
      setShowToast(true);
    }
  };

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
              <p>Loading your diagnoses...</p>
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
      <IonContent fullscreen className="diagnoses-content">
        <div className="diagnoses-shell">
          <div className="diagnoses-hero">
            <p className="tiny-greeting">
              Hello {patient?.name ? patient.name.split(" ")[0] : "there"}
            </p>
            <h2 className="hero-title">My Diagnoses</h2>
            <p className="hero-subtitle">
              {diagnoses.length} record{diagnoses.length === 1 ? "" : "s"}
            </p>
          </div>

          {diagnoses.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={documentTextOutline} size="large" />
              <h3>No diagnoses found</h3>
              <p>You don't have any diagnoses records yet.</p>
            </div>
          ) : (
            <div className="diagnoses-list">
              {diagnoses.map((diagnosis) => (
                <DiagnosisCard
                  key={diagnosis.id}
                  diagnosis={diagnosis}
                  patient={patient!}
                  onSavePDF={savePDFToDevice}
                />
              ))}
            </div>
          )}
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertMessage.includes("Failed") ? "Error" : "Success"}
          message={alertMessage}
          buttons={["OK"]}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

const DiagnosisCard: React.FC<{
  diagnosis: Diagnosis;
  patient: Patient;
  onSavePDF: (pdfDocument: PDFDocumentType, fileName: string) => void;
}> = ({ diagnosis, patient, onSavePDF }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-CM", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSaveFullReport = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const fileName = `Diagnosis_${diagnosis.condition.replace(
        /\s+/g,
        "_",
      )}_${Date.now()}`;
      await onSavePDF(
        <DiagnosisPDF diagnosis={diagnosis} patient={patient} />,
        fileName,
      );
    } catch (error) {
      console.error("Error saving report:", error);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <>
      <IonCard className="diagnosis-card-p">
        <IonCardHeader className="card-header-p">
          <div className="card-header-content">
            <div className="card-header-left">
              <IonCardTitle className="card-title-p">
                {diagnosis.condition}
              </IonCardTitle>
              <p className="diagnosis-date">
                <IonIcon icon={calendarOutline} /> {formatDate(diagnosis.date)}
              </p>
            </div>
            <IonChip
              color={diagnosis.status === "active" ? "warning" : "success"}
              className="status-chip"
            >
              {diagnosis.status}
            </IonChip>
          </div>
        </IonCardHeader>

        <IonCardContent className="diag-card-body">
          <div className="doctor-info">
            <IonIcon icon={personOutline} />
            <div className="doctor-info-text">
              <p className="doctor-name">{diagnosis.doctor.name}</p>
              <p className="doctor-specialty">{diagnosis.doctor.specialty}</p>
              <p className="hospital">{diagnosis.doctor.hospital}</p>
            </div>
          </div>

          <p className="diagnosis-description">{diagnosis.description}</p>

          <div className="action-buttons">
            {(diagnosis.labResults.length > 0 ||
              diagnosis.prescriptions.length > 0) && (
              <IonButton size="small" onClick={() => setShowDetailsModal(true)}>
                <IonIcon icon={documentTextOutline} slot="start" /> Details
              </IonButton>
            )}
            <IonButton
              size="small"
              fill="outline"
              onClick={handleSaveFullReport}
              disabled={isSaving}
            >
              <IonIcon icon={downloadOutline} slot="start" />
              {isSaving ? "Saving..." : "Save"}
            </IonButton>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Details Modal (Lab Results + Prescriptions) */}
      <IonModal
        isOpen={showDetailsModal}
        onDidDismiss={() => setShowDetailsModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Details</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowDetailsModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="modal-content">
            {diagnosis.labResults && diagnosis.labResults.length > 0 && (
              <section className="details-section">
                <h3>Lab Results</h3>
                {diagnosis.labResults.map((labResult) => (
                  <LabResultItem
                    key={labResult.id}
                    labResult={labResult}
                    patient={patient}
                    onSavePDF={onSavePDF}
                  />
                ))}
              </section>
            )}

            {diagnosis.prescriptions && diagnosis.prescriptions.length > 0 && (
              <section className="details-section">
                <h3>Prescriptions</h3>
                {diagnosis.prescriptions.map((prescription) => (
                  <PrescriptionItem
                    key={prescription.id}
                    prescription={prescription}
                    patient={patient}
                    onSavePDF={onSavePDF}
                  />
                ))}
              </section>
            )}
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

const LabResultItem: React.FC<{
  labResult: LabResult;
  patient: Patient;
  onSavePDF: (pdfDocument: PDFDocumentType, fileName: string) => void;
}> = ({ labResult, patient, onSavePDF }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveLabResult = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const fileName = `Lab_Result_${labResult.name.replace(
        /\s+/g,
        "_",
      )}_${Date.now()}`;
      await onSavePDF(
        <LabResultPDF labResult={labResult} patient={patient} />,
        fileName,
      );
    } catch (error) {
      console.error("Error saving lab result:", error);
    } finally {
      setIsSaving(false);
    }
  };

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

        <IonButton
          expand="block"
          fill="outline"
          onClick={handleSaveLabResult}
          disabled={isSaving}
        >
          {isSaving ? (
            <IonSpinner name="crescent" />
          ) : (
            <>
              <IonIcon icon={downloadOutline} slot="start" />
              Save as PDF
            </>
          )}
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

const PrescriptionItem: React.FC<{
  prescription: Prescription;
  patient: Patient;
  onSavePDF: (pdfDocument: PDFDocumentType, fileName: string) => void;
}> = ({ prescription, patient, onSavePDF }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePrescription = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const fileName = `Prescription_${prescription.medication.replace(
        /\s+/g,
        "_",
      )}_${Date.now()}`;
      await onSavePDF(
        <PrescriptionPDF prescription={prescription} patient={patient} />,
        fileName,
      );
    } catch (error) {
      console.error("Error saving prescription:", error);
    } finally {
      setIsSaving(false);
    }
  };

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

        <IonButton
          expand="block"
          fill="outline"
          onClick={handleSavePrescription}
          disabled={isSaving}
        >
          {isSaving ? (
            <IonSpinner name="crescent" />
          ) : (
            <>
              <IonIcon icon={downloadOutline} slot="start" />
              Save as PDF
            </>
          )}
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

export default Diagnoses;
