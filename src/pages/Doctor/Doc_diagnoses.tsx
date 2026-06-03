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
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonText,
  IonBadge,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonList,
  IonGrid,
  IonRow,
  IonCol,
  IonAlert,
  IonModal,
  IonButtons,
  IonSpinner,
  IonSearchbar,
  IonAvatar,
  IonBackButton,
  IonAccordion,
  IonAccordionGroup,
} from "@ionic/react";
import { db, auth, storage } from "../../firebaseconfig";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import {
  documentTextOutline,
  downloadOutline,
  calendarOutline,
  personOutline,
  medicalOutline,
  flaskOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeOutline,
  addOutline,
  removeOutline,
  peopleOutline,
  chevronDownOutline,
} from "ionicons/icons";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import logo from "../images/logo.jpg";
import "./Doc_diagnoses.scss";
import { motion } from "framer-motion";


// TypeScript interfaces
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  medicalRecordNumber: string;
  lastVisit?: string;
}

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

// PDF Document Components (keep the same PDF components as before)
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

// Main Doctor Diagnoses Page Component
const DoctorDiagnoses: React.FC = () => {
  const [currentDoctor, setCurrentDoctor] = useState<Doctor>({
    name: "Dr. Emmanuel Mbongo",
    specialty: "General Medicine",
    hospital: "Central Hospital Yaoundé",
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New states for existing diagnoses and lab results
  const [existingDiagnoses, setExistingDiagnoses] = useState<Diagnosis[]>([]);
  const [existingLabResults, setExistingLabResults] = useState<LabResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [diagnosisForm, setDiagnosisForm] = useState<
    Omit<Diagnosis, "id" | "patientId">
  >({
    date: new Date().toISOString(),
    doctor: currentDoctor,
    condition: "",
    description: "",
    status: "active",
    labResults: [],
    prescriptions: [],
  });

  const [labResultForm, setLabResultForm] = useState<Omit<LabResult, "id">>({
    name: "",
    date: new Date().toISOString(),
    status: "completed",
    results: {},
    notes: "",
  });

  const [prescriptionForm, setPrescriptionForm] = useState<
    Omit<Prescription, "id">
  >({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    status: "active",
    instructions: "",
  });

  const [currentResultKey, setCurrentResultKey] = useState("");
  const [currentResultValue, setCurrentResultValue] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [previewDiagnosis, setPreviewDiagnosis] = useState<Diagnosis | null>(
    null
  );

  // Fetch only patients who have booked an appointment with this doctor
  useEffect(() => {
    const fetchPatients = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setLoading(true);
      try {
        const appointmentsSnap = await getDocs(
          query(collection(db, "appointments"), where("doctorId", "==", user.uid))
        );
        const patientIds = [...new Set(appointmentsSnap.docs.map((d) => d.data().patientId as string))];
        if (patientIds.length === 0) { setPatients([]); return; }

        const patientsData: Patient[] = [];
        await Promise.all(
          patientIds.map(async (pid) => {
            const patientDoc = await getDoc(doc(db, "patients", pid));
            if (patientDoc.exists()) {
              patientsData.push({ id: patientDoc.id, ...patientDoc.data() } as Patient);
            }
          })
        );
        setPatients(patientsData);
      } catch (error) {
        console.error("Error fetching patients:", error);
        setAlertMessage("Error loading patients");
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Fetch current doctor data
  useEffect(() => {
    const fetchCurrentDoctor = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const doctorDoc = await getDoc(doc(db, "doctors", user.uid));
          if (doctorDoc.exists()) {
            const doctorData = doctorDoc.data() as Doctor;
            setCurrentDoctor(doctorData);
            setDiagnosisForm((prev) => ({
              ...prev,
              doctor: doctorData,
            }));
          }
        } catch (error) {
          console.error("Error fetching doctor data:", error);
        }
      }
    };

    fetchCurrentDoctor();
  }, []);

  // Fetch existing diagnoses and lab results when a patient is selected
  useEffect(() => {
    const fetchPatientHistory = async () => {
      if (!selectedPatient) {
        setExistingDiagnoses([]);
        setExistingLabResults([]);
        return;
      }

      setLoadingHistory(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch diagnoses for this patient by the current doctor
        const diagnosesQuery = query(
          collection(db, "diagnoses"),
          where("patientId", "==", selectedPatient.id),
          where("doctorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const diagnosesSnapshot = await getDocs(diagnosesQuery);
        const diagnosesData = diagnosesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Diagnosis[];

        setExistingDiagnoses(diagnosesData);

        // Extract all lab results from diagnoses
        const allLabResults: LabResult[] = [];
        diagnosesData.forEach((diagnosis) => {
          if (diagnosis.labResults && diagnosis.labResults.length > 0) {
            allLabResults.push(...diagnosis.labResults);
          }
        });
        setExistingLabResults(allLabResults);
      } catch (error) {
        console.error("Error fetching patient history:", error);
        setAlertMessage("Error loading patient history");
        setShowAlert(true);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchPatientHistory();
  }, [selectedPatient]);

  // Filter patients based on search text
  const filteredPatients = patients.filter(
    (patient) =>
      (patient.name || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (patient.medicalRecordNumber || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(false);
    setSearchText("");
  };

  const handleAddLabResult = () => {
    if (!selectedPatient) {
      setAlertMessage("Please select a patient first");
      setShowAlert(true);
      return;
    }

    if (!labResultForm.name) {
      setAlertMessage("Please enter a lab test name");
      setShowAlert(true);
      return;
    }

    const newLabResult: LabResult = {
      id: `lab-${Date.now()}`,
      name: labResultForm.name,
      date: labResultForm.date,
      status: labResultForm.status,
      results: labResultForm.results,
      notes: labResultForm.notes,
    };

    setDiagnosisForm({
      ...diagnosisForm,
      labResults: [...diagnosisForm.labResults, newLabResult],
    });

    // Reset lab result form
    setLabResultForm({
      name: "",
      date: new Date().toISOString(),
      status: "completed",
      results: {},
      notes: "",
    });
  };

  const handleAddResultValue = () => {
    if (!currentResultKey || !currentResultValue) {
      setAlertMessage("Please enter both parameter and value");
      setShowAlert(true);
      return;
    }

    setLabResultForm({
      ...labResultForm,
      results: {
        ...labResultForm.results,
        [currentResultKey]: currentResultValue,
      },
    });

    setCurrentResultKey("");
    setCurrentResultValue("");
  };

  const handleRemoveResultValue = (key: string) => {
    const newResults = { ...labResultForm.results };
    delete newResults[key];
    setLabResultForm({
      ...labResultForm,
      results: newResults,
    });
  };

  const handleAddPrescription = () => {
    if (!selectedPatient) {
      setAlertMessage("Please select a patient first");
      setShowAlert(true);
      return;
    }

    if (!prescriptionForm.medication || !prescriptionForm.dosage) {
      setAlertMessage("Please enter medication and dosage");
      setShowAlert(true);
      return;
    }

    const newPrescription: Prescription = {
      id: `rx-${Date.now()}`,
      medication: prescriptionForm.medication,
      dosage: prescriptionForm.dosage,
      frequency: prescriptionForm.frequency,
      duration: prescriptionForm.duration,
      status: prescriptionForm.status,
      instructions: prescriptionForm.instructions,
    };

    setDiagnosisForm({
      ...diagnosisForm,
      prescriptions: [...diagnosisForm.prescriptions, newPrescription],
    });

    // Reset prescription form
    setPrescriptionForm({
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      status: "active",
      instructions: "",
    });
  };

  const handlePreviewDiagnosis = () => {
    if (!selectedPatient) {
      setAlertMessage("Please select a patient first");
      setShowAlert(true);
      return;
    }

    if (!diagnosisForm.condition || !diagnosisForm.description) {
      setAlertMessage("Please enter condition and description");
      setShowAlert(true);
      return;
    }

    const newDiagnosis: Diagnosis = {
      id: `diag-${Date.now()}`,
      patientId: selectedPatient.id,
      date: diagnosisForm.date,
      doctor: diagnosisForm.doctor,
      condition: diagnosisForm.condition,
      description: diagnosisForm.description,
      status: diagnosisForm.status,
      labResults: diagnosisForm.labResults,
      prescriptions: diagnosisForm.prescriptions,
    };

    setPreviewDiagnosis(newDiagnosis);
  };

  // Save diagnosis to Firebase
  const handleSaveDiagnosis = async () => {
    if (!selectedPatient || !previewDiagnosis) {
      setAlertMessage("Please create a diagnosis preview first");
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      const diagnosisData = {
        ...previewDiagnosis,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        doctorId: auth.currentUser?.uid,
      };

      // Save to diagnoses collection
      const docRef = await addDoc(collection(db, "diagnoses"), diagnosisData);

      // Update patient's last visit
      await updateDoc(doc(db, "patients", selectedPatient.id), {
        lastVisit: new Date().toISOString(),
      });

      setAlertMessage("Diagnosis saved successfully!");
      setShowAlert(true);
      handleResetForm();

      // Refresh the patient history
      const user = auth.currentUser;
      if (user) {
        const diagnosesQuery = query(
          collection(db, "diagnoses"),
          where("patientId", "==", selectedPatient.id),
          where("doctorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const diagnosesSnapshot = await getDocs(diagnosesQuery);
        const diagnosesData = diagnosesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Diagnosis[];
        setExistingDiagnoses(diagnosesData);
      }
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      setAlertMessage("Error saving diagnosis");
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleResetForm = () => {
    setDiagnosisForm({
      date: new Date().toISOString(),
      doctor: currentDoctor,
      condition: "",
      description: "",
      status: "active",
      labResults: [],
      prescriptions: [],
    });
    setPreviewDiagnosis(null);
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "resolved":
        return "primary";
      case "cancelled":
        return "danger";
      case "followup":
        return "tertiary";
      default:
        return "medium";
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle>Diagnosis</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader className="diagnoses">
                  <IonCardTitle>Select Patient</IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="diagnoses">
                  {loading ? (
                    <div className="loading-container">
                      <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                      <IonText className="ion-text-center ion-padding"><p>Loading patients...</p></IonText>
                    </div>
                  ) : selectedPatient ? (
                    <div className="selected-patient">
                      <IonItem>
                        <IonAvatar slot="start">
                          <IonIcon icon={personOutline} size="large" />
                        </IonAvatar>
                        <IonLabel>
                          <h2>{selectedPatient.name}</h2>
                          <p>
                            {selectedPatient.gender}, {selectedPatient.age}{" "}
                            years
                          </p>
                          <p>MRN: {selectedPatient.medicalRecordNumber}</p>
                        </IonLabel>
                      </IonItem>
                      <IonButton
                        expand="block"
                        fill="outline"
                        onClick={() => setShowPatientModal(true)}
                        className="ion-margin-top"
                      >
                        Change Patient
                      </IonButton>
                    </div>
                  ) : (
                    <div className="no-patient-selected">
                      <IonIcon icon={peopleOutline} size="large" />
                      <p>No patient selected</p>
                      <IonButton onClick={() => setShowPatientModal(true)}>
                        Select Patient
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {selectedPatient && (
            <>
              {/* Existing Diagnoses and Lab Results Section */}
              <IonRow>
                <IonCol size="12">
                  <IonCard>
                    <IonCardHeader className="diagnoses">
                      <IonCardTitle>Patient History</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      {loadingHistory ? (
                        <div className="loading-container">
                      <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                      <IonText className="ion-text-center ion-padding"><p>Loading patient history...</p></IonText>
                    </div>
                      ) : (
                        <IonAccordionGroup>
                          {/* Existing Diagnoses Accordion */}
                          <IonAccordion value="diagnoses">
                            <IonItem slot="header" color="light">
                              <IonLabel>
                                <h2>Previous Diagnoses</h2>
                                <p>
                                  {existingDiagnoses.length} diagnosis records
                                </p>
                              </IonLabel>
                              <IonBadge color="primary" slot="end">
                                {existingDiagnoses.length}
                              </IonBadge>
                            </IonItem>
                            <div slot="content">
                              {existingDiagnoses.length > 0 ? (
                                <IonList>
                                  {existingDiagnoses.map((diagnosis) => (
                                    <IonItem
                                      key={diagnosis.id}
                                      className="history-item"
                                    >
                                      <IonLabel>
                                        <h3>{diagnosis.condition}</h3>
                                        <p>{diagnosis.description}</p>
                                        <p>
                                          <IonBadge
                                            color={getStatusColor(
                                              diagnosis.status
                                            )}
                                          >
                                            {diagnosis.status}
                                          </IonBadge>
                                          <span style={{ marginLeft: "10px" }}>
                                            {new Date(
                                              diagnosis.date
                                            ).toLocaleDateString("en-CM")}
                                          </span>
                                        </p>
                                        {diagnosis.labResults.length > 0 && (
                                          <p>
                                            <IonBadge color="secondary">
                                              {diagnosis.labResults.length} lab
                                              tests
                                            </IonBadge>
                                          </p>
                                        )}
                                        {diagnosis.prescriptions.length > 0 && (
                                          <p>
                                            <IonBadge color="tertiary">
                                              {diagnosis.prescriptions.length}{" "}
                                              prescriptions
                                            </IonBadge>
                                          </p>
                                        )}
                                      </IonLabel>
                                      <PDFDownloadLink
                                        document={
                                          <DiagnosisPDF
                                            diagnosis={diagnosis}
                                            patient={selectedPatient}
                                          />
                                        }
                                        fileName={`Diagnosis_${diagnosis.condition.replace(
                                          /\s+/g,
                                          "_"
                                        )}_${diagnosis.id}.pdf`}
                                      >
                                        {({ loading }) => (
                                          <IonButton
                                            size="small"
                                            disabled={loading}
                                          >
                                            {loading ? (
                                              <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                                            ) : (
                                              <IonIcon icon={downloadOutline} />
                                            )}
                                          </IonButton>
                                        )}
                                      </PDFDownloadLink>
                                    </IonItem>
                                  ))}
                                </IonList>
                              ) : (
                                <div className="empty-state">
                                  <IonIcon icon={medicalOutline} size="large" />
                                  <p>No previous diagnoses found</p>
                                </div>
                              )}
                            </div>
                          </IonAccordion>

                          {/* Existing Lab Results Accordion */}
                          <IonAccordion value="labResults">
                            <IonItem slot="header" color="light">
                              <IonLabel>
                                <h2>Lab Results History</h2>
                                <p>
                                  {existingLabResults.length} lab test records
                                </p>
                              </IonLabel>
                              <IonBadge color="secondary" slot="end">
                                {existingLabResults.length}
                              </IonBadge>
                            </IonItem>
                            <div slot="content">
                              {existingLabResults.length > 0 ? (
                                <IonList>
                                  {existingLabResults.map((labResult) => (
                                    <IonItem
                                      key={labResult.id}
                                      className="history-item"
                                    >
                                      <IonLabel>
                                        <h3>{labResult.name}</h3>
                                        <p>
                                          <IonBadge
                                            color={getStatusColor(
                                              labResult.status
                                            )}
                                          >
                                            {labResult.status}
                                          </IonBadge>
                                          <span style={{ marginLeft: "10px" }}>
                                            {new Date(
                                              labResult.date
                                            ).toLocaleDateString("en-CM")}
                                          </span>
                                        </p>
                                        <p>
                                          {
                                            Object.keys(labResult.results)
                                              .length
                                          }{" "}
                                          parameters tested
                                        </p>
                                        {labResult.notes && (
                                          <p className="notes-preview">
                                            {labResult.notes}
                                          </p>
                                        )}
                                      </IonLabel>
                                      <PDFDownloadLink
                                        document={
                                          <LabResultPDF
                                            labResult={labResult}
                                            patient={selectedPatient}
                                          />
                                        }
                                        fileName={`Lab_Result_${labResult.name.replace(
                                          /\s+/g,
                                          "_"
                                        )}_${labResult.id}.pdf`}
                                      >
                                        {({ loading }) => (
                                          <IonButton
                                            size="small"
                                            disabled={loading}
                                          >
                                            {loading ? (
                                              <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                                            ) : (
                                              <IonIcon icon={downloadOutline} />
                                            )}
                                          </IonButton>
                                        )}
                                      </PDFDownloadLink>
                                    </IonItem>
                                  ))}
                                </IonList>
                              ) : (
                                <div className="empty-state">
                                  <IonIcon icon={flaskOutline} size="large" />
                                  <p>No lab results history found</p>
                                </div>
                              )}
                            </div>
                          </IonAccordion>
                        </IonAccordionGroup>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {/* New Diagnosis Form Section */}
              <IonRow>
                <IonCol size="12" size-md="6">
                  <IonCard>
                    <IonCardHeader className="diagnoses">
                      <IonCardTitle>New Diagnosis Information</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      <IonItem>
                        <IonLabel position="stacked">Condition *</IonLabel>
                        <IonInput
                          value={diagnosisForm.condition}
                          onIonInput={(e) =>
                            setDiagnosisForm({
                              ...diagnosisForm,
                              condition: e.detail.value!,
                            })
                          }
                          placeholder="e.g., Hypertension Stage 1"
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Description *</IonLabel>
                        <IonTextarea
                          value={diagnosisForm.description}
                          onIonInput={(e) =>
                            setDiagnosisForm({
                              ...diagnosisForm,
                              description: e.detail.value!,
                            })
                          }
                          rows={4}
                          placeholder="Describe the diagnosis, symptoms, observations, etc."
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Status</IonLabel>
                        <IonSelect
                          interface="popover"
                          value={diagnosisForm.status}
                          onIonChange={(e) =>
                            setDiagnosisForm({
                              ...diagnosisForm,
                              status: e.detail.value,
                            })
                          }
                        >
                          <IonSelectOption value="active">
                            Active
                          </IonSelectOption>
                          <IonSelectOption value="resolved">
                            Resolved
                          </IonSelectOption>
                          <IonSelectOption value="followup">
                            Follow-up Needed
                          </IonSelectOption>
                        </IonSelect>
                      </IonItem>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader className="diagnoses">
                      <IonCardTitle>Lab Results</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      <IonItem>
                        <IonLabel position="stacked">Test Name</IonLabel>
                        <IonInput
                          value={labResultForm.name}
                          onIonInput={(e) =>
                            setLabResultForm({
                              ...labResultForm,
                              name: e.detail.value!,
                            })
                          }
                          placeholder="e.g., Complete Blood Count"
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Status</IonLabel>
                        <IonSelect
                          interface="popover"
                          value={labResultForm.status}
                          onIonChange={(e) =>
                            setLabResultForm({
                              ...labResultForm,
                              status: e.detail.value,
                            })
                          }
                        >
                          <IonSelectOption value="pending">
                            Pending
                          </IonSelectOption>
                          <IonSelectOption value="completed">
                            Completed
                          </IonSelectOption>
                          <IonSelectOption value="cancelled">
                            Cancelled
                          </IonSelectOption>
                        </IonSelect>
                      </IonItem>

                      <div className="form-section">
                        <h4>Test Results</h4>
                        <IonItem>
                          <IonLabel position="stacked">Parameter</IonLabel>
                          <IonInput
                            value={currentResultKey}
                            onIonInput={(e) =>
                              setCurrentResultKey(e.detail.value!)
                            }
                            placeholder="e.g., WBC"
                          />
                        </IonItem>
                        <IonItem>
                          <IonLabel position="stacked">Value</IonLabel>
                          <IonInput
                            value={currentResultValue}
                            onIonInput={(e) =>
                              setCurrentResultValue(e.detail.value!)
                            }
                            placeholder="e.g., 6.5 x 10^9/L"
                          />
                        </IonItem>
                        <IonButton
                          expand="block"
                          onClick={handleAddResultValue}
                          size="small"
                        >
                          <IonIcon icon={addOutline} slot="start" />
                          Add Result
                        </IonButton>

                        {Object.entries(labResultForm.results).length > 0 && (
                          <div className="results-list">
                            <h5>Current Results:</h5>
                            {Object.entries(labResultForm.results).map(
                              ([key, value]) => (
                                <IonItem key={key}>
                                  <IonLabel>
                                    {key}: {value}
                                  </IonLabel>
                                  <IonButton
                                    fill="clear"
                                    color="danger"
                                    onClick={() => handleRemoveResultValue(key)}
                                  >
                                    <IonIcon icon={removeOutline} />
                                  </IonButton>
                                </IonItem>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <IonItem>
                        <IonLabel position="stacked">Notes</IonLabel>
                        <IonTextarea
                          value={labResultForm.notes}
                          onIonInput={(e) =>
                            setLabResultForm({
                              ...labResultForm,
                              notes: e.detail.value!,
                            })
                          }
                          rows={2}
                          placeholder="Additional notes about the lab results"
                        />
                      </IonItem>

                      <IonButton expand="block" onClick={handleAddLabResult}>
                        <IonIcon icon={addOutline} slot="start" />
                        Add Lab Result
                      </IonButton>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader className="diagnoses">
                      <IonCardTitle>Prescriptions</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      <IonItem>
                        <IonLabel position="stacked">Medication *</IonLabel>
                        <IonInput
                          value={prescriptionForm.medication}
                          onIonInput={(e) =>
                            setPrescriptionForm({
                              ...prescriptionForm,
                              medication: e.detail.value!,
                            })
                          }
                          placeholder="e.g., Lisinopril"
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Dosage *</IonLabel>
                        <IonInput
                          value={prescriptionForm.dosage}
                          onIonInput={(e) =>
                            setPrescriptionForm({
                              ...prescriptionForm,
                              dosage: e.detail.value!,
                            })
                          }
                          placeholder="e.g., 10 mg"
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Frequency</IonLabel>
                        <IonInput
                          value={prescriptionForm.frequency}
                          onIonInput={(e) =>
                            setPrescriptionForm({
                              ...prescriptionForm,
                              frequency: e.detail.value!,
                            })
                          }
                          placeholder="e.g., Once daily"
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Duration</IonLabel>
                        <IonInput
                          value={prescriptionForm.duration}
                          onIonInput={(e) =>
                            setPrescriptionForm({
                              ...prescriptionForm,
                              duration: e.detail.value!,
                            })
                          }
                          placeholder="e.g., 30 days"
                        />
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Status</IonLabel>
                        <IonSelect
                          interface="popover"
                          value={prescriptionForm.status}
                          onIonChange={(e) =>
                            setPrescriptionForm({
                              ...prescriptionForm,
                              status: e.detail.value,
                            })
                          }
                        >
                          <IonSelectOption value="active">
                            Active
                          </IonSelectOption>
                          <IonSelectOption value="completed">
                            Completed
                          </IonSelectOption>
                          <IonSelectOption value="cancelled">
                            Cancelled
                          </IonSelectOption>
                        </IonSelect>
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Instructions</IonLabel>
                        <IonTextarea
                          value={prescriptionForm.instructions}
                          onIonInput={(e) =>
                            setPrescriptionForm({
                              ...prescriptionForm,
                              instructions: e.detail.value!,
                            })
                          }
                          rows={2}
                          placeholder="Special instructions for the patient"
                        />
                      </IonItem>

                      <IonButton expand="block" onClick={handleAddPrescription}>
                        <IonIcon icon={addOutline} slot="start" />
                        Add Prescription
                      </IonButton>
                    </IonCardContent>
                  </IonCard>

                  <div className="action-buttons">
                    <IonButton expand="block" onClick={handlePreviewDiagnosis}>
                      Preview Diagnosis
                    </IonButton>
                    {previewDiagnosis && (
                      <IonButton
                        expand="block"
                        color="success"
                        onClick={handleSaveDiagnosis}
                        disabled={saving}
                      >
                        {saving ? (
                          <IonSpinner name="crescent" />
                        ) : (
                          "Save Diagnosis"
                        )}
                      </IonButton>
                    )}
                    <IonButton
                      expand="block"
                      color="medium"
                      onClick={handleResetForm}
                    >
                      Reset Form
                    </IonButton>
                  </div>
                </IonCol>

                <IonCol size="12" size-md="6">
                  <IonCard>
                    <IonCardHeader className="diagnoses">
                      <IonCardTitle>Preview</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      {previewDiagnosis ? (
                        <>
                          <div className="preview-section">
                            <h3>Patient Information</h3>
                            <p>
                              <strong>Name:</strong> {selectedPatient.name}
                            </p>
                            <p>
                              <strong>Age:</strong> {selectedPatient.age}
                            </p>
                            <p>
                              <strong>Gender:</strong> {selectedPatient.gender}
                            </p>
                            <p>
                              <strong>Medical Record #:</strong>{" "}
                              {selectedPatient.medicalRecordNumber}
                            </p>
                          </div>

                          <div className="preview-section">
                            <h3>Diagnosis</h3>
                            <p>
                              <strong>Condition:</strong>{" "}
                              {previewDiagnosis.condition}
                            </p>
                            <p>
                              <strong>Date:</strong>{" "}
                              {new Date(
                                previewDiagnosis.date
                              ).toLocaleDateString("en-CM")}
                            </p>
                            <p>
                              <strong>Status:</strong> {previewDiagnosis.status}
                            </p>
                            <p>
                              <strong>Description:</strong>{" "}
                              {previewDiagnosis.description}
                            </p>
                          </div>

                          {previewDiagnosis.labResults.length > 0 && (
                            <div className="preview-section">
                              <h3>
                                Lab Results (
                                {previewDiagnosis.labResults.length})
                              </h3>
                              {previewDiagnosis.labResults.map((labResult) => (
                                <div
                                  key={labResult.id}
                                  className="preview-item"
                                >
                                  <p>
                                    <strong>Test:</strong> {labResult.name}
                                  </p>
                                  <p>
                                    <strong>Status:</strong> {labResult.status}
                                  </p>
                                  <PDFDownloadLink
                                    document={
                                      <LabResultPDF
                                        labResult={labResult}
                                        patient={selectedPatient}
                                      />
                                    }
                                    fileName={`Lab_Result_${labResult.name.replace(
                                      /\s+/g,
                                      "_"
                                    )}.pdf`}
                                    className="pdf-download-link"
                                  >
                                    {({ loading }) => (
                                      <IonButton
                                        size="small"
                                        disabled={loading}
                                      >
                                        {loading ? (
                                          <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                                        ) : (
                                          <>
                                            <IonIcon
                                              icon={downloadOutline}
                                              slot="start"
                                            />
                                            Download Lab Result
                                          </>
                                        )}
                                      </IonButton>
                                    )}
                                  </PDFDownloadLink>
                                </div>
                              ))}
                            </div>
                          )}

                          {previewDiagnosis.prescriptions.length > 0 && (
                            <div className="preview-section">
                              <h3>
                                Prescriptions (
                                {previewDiagnosis.prescriptions.length})
                              </h3>
                              {previewDiagnosis.prescriptions.map(
                                (prescription) => (
                                  <div
                                    key={prescription.id}
                                    className="preview-item"
                                  >
                                    <p>
                                      <strong>Medication:</strong>{" "}
                                      {prescription.medication}
                                    </p>
                                    <p>
                                      <strong>Dosage:</strong>{" "}
                                      {prescription.dosage}
                                    </p>
                                    <PDFDownloadLink
                                      document={
                                        <PrescriptionPDF
                                          prescription={prescription}
                                          patient={selectedPatient}
                                        />
                                      }
                                      fileName={`Prescription_${prescription.medication.replace(
                                        /\s+/g,
                                        "_"
                                      )}.pdf`}
                                      className="pdf-download-link"
                                    >
                                      {({ loading }) => (
                                        <IonButton
                                          size="small"
                                          disabled={loading}
                                        >
                                          {loading ? (
                                            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                                          ) : (
                                            <>
                                              <IonIcon
                                                icon={downloadOutline}
                                                slot="start"
                                              />
                                              Download Prescription
                                            </>
                                          )}
                                        </IonButton>
                                      )}
                                    </PDFDownloadLink>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          <div className="preview-section">
                            <PDFDownloadLink
                              document={
                                <DiagnosisPDF
                                  diagnosis={previewDiagnosis}
                                  patient={selectedPatient}
                                />
                              }
                              fileName={`Diagnosis_${previewDiagnosis.condition.replace(
                                /\s+/g,
                                "_"
                              )}.pdf`}
                              className="pdf-download-link"
                            >
                              {({ loading }) => (
                                <IonButton expand="block" disabled={loading}>
                                  {loading ? (
                                    <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
                                  ) : (
                                    <>
                                      <IonIcon
                                        icon={downloadOutline}
                                        slot="start"
                                      />
                                      Download Full Diagnosis Report
                                    </>
                                  )}
                                </IonButton>
                              )}
                            </PDFDownloadLink>
                          </div>
                        </>
                      ) : (
                        <div className="empty-preview">
                          <IonIcon icon={documentTextOutline} size="large" />
                          <p>
                            Fill out the form and click "Preview Diagnosis" to
                            see a preview of your diagnosis report.
                          </p>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>

                  {(diagnosisForm.labResults.length > 0 ||
                    diagnosisForm.prescriptions.length > 0) && (
                    <IonCard>
                      <IonCardHeader className="diagnoses">
                        <IonCardTitle>Current Items</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent className="diagnoses">
                        {diagnosisForm.labResults.length > 0 && (
                          <div className="current-items">
                            <h4>
                              Lab Results: {diagnosisForm.labResults.length}
                            </h4>
                            <IonList>
                              {diagnosisForm.labResults.map((labResult) => (
                                <IonItem key={labResult.id}>
                                  <IonLabel>
                                    <h3>{labResult.name}</h3>
                                    <p>{labResult.status}</p>
                                  </IonLabel>
                                </IonItem>
                              ))}
                            </IonList>
                          </div>
                        )}

                        {diagnosisForm.prescriptions.length > 0 && (
                          <div className="current-items">
                            <h4>
                              Prescriptions:{" "}
                              {diagnosisForm.prescriptions.length}
                            </h4>
                            <IonList>
                              {diagnosisForm.prescriptions.map(
                                (prescription) => (
                                  <IonItem key={prescription.id}>
                                    <IonLabel>
                                      <h3>{prescription.medication}</h3>
                                      <p>{prescription.dosage}</p>
                                    </IonLabel>
                                  </IonItem>
                                )
                              )}
                            </IonList>
                          </div>
                        )}
                      </IonCardContent>
                    </IonCard>
                  )}
                </IonCol>
              </IonRow>
            </>
          )}
        </IonGrid>

        {/* Patient Selection Modal */}
        <IonModal
          isOpen={showPatientModal}
          onDidDismiss={() => setShowPatientModal(false)}
          className="diagnoses-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Patient</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowPatientModal(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value!)}
              placeholder="Search by name or MRN"
            />

            <IonList className="diagnoses-list">
              {filteredPatients.map((patient) => (
                <IonItem
                  key={patient.id}
                  button
                  onClick={() => handleSelectPatient(patient)}
                >
                  <IonAvatar slot="start">
                    <IonIcon icon={personOutline} size="large" />
                  </IonAvatar>
                  <IonLabel>
                    <h2>{patient.name}</h2>
                    <p>
                      {patient.gender}, {patient.age} years
                    </p>
                    <p>MRN: {patient.medicalRecordNumber}</p>
                    {patient.lastVisit && (
                      <p>
                        Last visit:{" "}
                        {new Date(patient.lastVisit).toLocaleDateString(
                          "en-CM"
                        )}
                      </p>
                    )}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>

            {filteredPatients.length === 0 && (
              <div className="no-results">
                <p>No patients found</p>
              </div>
            )}
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Notification"
          message={alertMessage}
          buttons={["OK"]}
        />
      </IonContent>
    </IonPage>
  );
};

export default DoctorDiagnoses;
