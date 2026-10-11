import React, { useState, useEffect } from "react";
import { useLocation } from "react-router";
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
  IonModal,
  IonButtons,
  IonSearchbar,
  IonAvatar,
  IonBackButton,
  IonAccordion,
  IonAccordionGroup,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import LoadingHelix from "../../components/LoadingHelix";
import { EmptyState } from "../../components/ui";
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
  eyeOutline,
  saveOutline,
  refreshOutline,
  alertCircleOutline,
  listOutline,
  clipboardOutline,
  pulseOutline,
  searchOutline,
  linkOutline,
  informationCircleOutline,
  pencilOutline,
  createOutline,
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

/** A lab result enriched with the id of its parent diagnosis document,
 *  used to write edits back to the correct Firestore record. */
interface LabResultWithParent extends LabResult {
  diagnosisId: string;
}

/** Snapshot of the appointment this diagnosis is being created for.
 *  Fetched from Firestore when ?appointmentId= is present in the URL. */
interface AppointmentContext {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  service: string;
  reason: string;
  symptoms: string;
  type: string;
  status: string;
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

// ── Step header ───────────────────────────────────────────────────────────────
/** A numbered step header with an icon and label, used to guide the doctor
 *  through the form in a clear visual sequence. */
const StepHeader: React.FC<{
  step: number;
  icon: string;
  label: string;
  badge?: number;
}> = ({ step, icon, label, badge }) => (
  <div className="diag-step-header">
    <span className="diag-step-number">{step}</span>
    <IonIcon icon={icon} className="diag-step-icon" />
    <span className="diag-step-label">{label}</span>
    {badge !== undefined && badge > 0 && (
      <IonBadge color="primary" className="diag-step-badge">{badge}</IonBadge>
    )}
  </div>
);

// Main Doctor Diagnoses Page Component
const DoctorDiagnoses: React.FC = () => {
  const location = useLocation();

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

  /** The appointment this diagnosis is linked to (set when ?appointmentId= is in the URL). */
  const [linkedAppointment, setLinkedAppointment] = useState<AppointmentContext | null>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  /** When set, the form is in edit mode for this saved diagnosis id. */
  const [editingDiagnosisId, setEditingDiagnosisId] = useState<string | null>(null);

  /** When set, the lab result form is editing this saved lab result. */
  const [editingLabResult, setEditingLabResult] = useState<LabResultWithParent | null>(null);

  // New states for existing diagnoses and lab results
  const [existingDiagnoses, setExistingDiagnoses] = useState<Diagnosis[]>([]);
  const [existingLabResults, setExistingLabResults] = useState<LabResultWithParent[]>([]);
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

  // ── Appointment-linked auto-fill ─────────────────────────────────────────
  // When the page is opened with ?appointmentId=xxx (e.g. from the Create
  // Diagnosis button on an appointment card), fetch that appointment from
  // Firestore, pre-select the patient, and seed the form with context clues
  // so the doctor doesn't have to retype information they already reviewed.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appointmentId = params.get("appointmentId");
    if (!appointmentId) return;

    const fetchLinkedAppointment = async () => {
      setAppointmentLoading(true);
      try {
        const apptSnap = await getDoc(doc(db, "appointments", appointmentId));
        if (!apptSnap.exists()) return;

        const data = apptSnap.data();

        // Build the context banner object
        const ctx: AppointmentContext = {
          id: apptSnap.id,
          patientId: data.patientId || "",
          patientName: data.patientName || "Unknown Patient",
          date: typeof data.date === "string" ? data.date : data.date?.toDate?.()?.toLocaleDateString("en-CM") ?? "N/A",
          time: typeof data.time === "string" ? data.time : data.time?.toDate?.()?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) ?? "N/A",
          service: data.service || "General Checkup",
          reason: data.reason || "",
          symptoms: data.symptoms || "",
          type: data.type || "",
          status: data.status || "accepted",
        };
        setLinkedAppointment(ctx);

        // Auto-fill the diagnosis date from the appointment date
        setDiagnosisForm((prev) => ({
          ...prev,
          date: data.date && typeof data.date !== "string"
            ? data.date?.toDate?.()?.toISOString() ?? new Date().toISOString()
            : new Date().toISOString(),
        }));

        // Auto-select the patient if they exist in the patients list
        // (patients list may still be loading, so we also store patientId
        //  and let the patients-list effect pick it up)
        if (data.patientId) {
          const patientSnap = await getDoc(doc(db, "patients", data.patientId));
          if (patientSnap.exists()) {
            const pd = patientSnap.data();
            const autoPatient: Patient = {
              id: patientSnap.id,
              name: pd.name || `${pd.firstName ?? ""} ${pd.lastName ?? ""}`.trim() || ctx.patientName,
              age: pd.age ?? 0,
              gender: pd.gender ?? "",
              phone: pd.phone ?? "",
              email: pd.email,
              medicalRecordNumber: pd.medicalRecordNumber ?? patientSnap.id,
              lastVisit: pd.lastVisit,
            };
            setSelectedPatient(autoPatient);
          }
        }
      } catch (err) {
        console.error("Error fetching linked appointment:", err);
      } finally {
        setAppointmentLoading(false);
      }
    };

    fetchLinkedAppointment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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

        // Extract all lab results from diagnoses, enriched with their parent diagnosisId
        const allLabResults: LabResultWithParent[] = [];
        diagnosesData.forEach((diagnosis) => {
          if (diagnosis.labResults && diagnosis.labResults.length > 0) {
            diagnosis.labResults.forEach((lr) =>
              allLabResults.push({ ...lr, diagnosisId: diagnosis.id })
            );
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

  /**
   * Load a saved lab result into the lab form for editing.
   */
  const handleEditLabResult = (labResult: LabResultWithParent) => {
    setEditingLabResult(labResult);
    setLabResultForm({
      name: labResult.name,
      date: labResult.date,
      status: labResult.status,
      results: { ...labResult.results },
      notes: labResult.notes ?? "",
    });
    // Scroll to the lab result form section
    const content = document.querySelector("ion-content.diag-content") as HTMLIonContentElement | null;
    content?.scrollToTop(300);
  };

  /**
   * Save an edited lab result back into its parent diagnosis document.
   * Replaces the matching entry in the labResults array by id.
   */
  const handleSaveLabResultEdit = async () => {
    if (!editingLabResult) return;
    if (!labResultForm.name) {
      setAlertMessage("Please enter a lab test name");
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      // Fetch the parent diagnosis to get its current labResults array
      const parentSnap = await getDoc(doc(db, "diagnoses", editingLabResult.diagnosisId));
      if (!parentSnap.exists()) throw new Error("Parent diagnosis not found");

      const parentData = parentSnap.data() as Diagnosis;
      const updatedLabResults = parentData.labResults.map((lr) =>
        lr.id === editingLabResult.id
          ? {
              ...lr,
              name: labResultForm.name,
              date: labResultForm.date,
              status: labResultForm.status,
              results: labResultForm.results,
              notes: labResultForm.notes,
            }
          : lr
      );

      await updateDoc(doc(db, "diagnoses", editingLabResult.diagnosisId), {
        labResults: updatedLabResults,
        updatedAt: new Date().toISOString(),
      });

      setAlertMessage("Lab result updated successfully!");
      setShowAlert(true);
      setEditingLabResult(null);

      // Reset lab form
      setLabResultForm({
        name: "",
        date: new Date().toISOString(),
        status: "completed",
        results: {},
        notes: "",
      });
      setCurrentResultKey("");
      setCurrentResultValue("");

      // Refresh the patient history so the updated result shows immediately
      if (selectedPatient) {
        const user = auth.currentUser;
        if (user) {
          const diagnosesQuery = query(
            collection(db, "diagnoses"),
            where("patientId", "==", selectedPatient.id),
            where("doctorId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const diagnosesSnapshot = await getDocs(diagnosesQuery);
          const diagnosesData = diagnosesSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Diagnosis[];
          setExistingDiagnoses(diagnosesData);
          const allLabResults: LabResultWithParent[] = [];
          diagnosesData.forEach((diagnosis) => {
            if (diagnosis.labResults?.length) {
              diagnosis.labResults.forEach((lr) =>
                allLabResults.push({ ...lr, diagnosisId: diagnosis.id })
              );
            }
          });
          setExistingLabResults(allLabResults);
        }
      }
    } catch (error) {
      console.error("Error updating lab result:", error);
      setAlertMessage("Error updating lab result");
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Load a saved diagnosis into the form for editing.
   * Scrolls the user back up to the form area automatically.
   */
  const handleEditDiagnosis = (diagnosis: Diagnosis) => {
    setEditingDiagnosisId(diagnosis.id);
    setDiagnosisForm({
      date: diagnosis.date,
      doctor: diagnosis.doctor,
      condition: diagnosis.condition,
      description: diagnosis.description,
      status: diagnosis.status,
      labResults: diagnosis.labResults,
      prescriptions: diagnosis.prescriptions,
    });
    setPreviewDiagnosis(null);
    // Scroll to the top of the content so the form is visible
    const content = document.querySelector("ion-content.diag-content") as HTMLIonContentElement | null;
    content?.scrollToTop(300);
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
      if (editingDiagnosisId) {
        // ── Edit mode: update the existing document ──────────────────
        const updatedData = {
          ...previewDiagnosis,
          updatedAt: new Date().toISOString(),
          doctorId: auth.currentUser?.uid,
          ...(linkedAppointment ? { appointmentId: linkedAppointment.id } : {}),
        };
        await updateDoc(doc(db, "diagnoses", editingDiagnosisId), updatedData);
        setEditingDiagnosisId(null);
        setAlertMessage("Diagnosis updated successfully!");
      } else {
        // ── New diagnosis: add a new document ────────────────────────
        const diagnosisData = {
          ...previewDiagnosis,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          doctorId: auth.currentUser?.uid,
          // Persist the appointment link so both sides can cross-reference
          ...(linkedAppointment ? { appointmentId: linkedAppointment.id } : {}),
        };
        await addDoc(collection(db, "diagnoses"), diagnosisData);
        setAlertMessage("Diagnosis saved successfully!");
      }

      // Update patient's last visit
      await updateDoc(doc(db, "patients", selectedPatient.id), {
        lastVisit: new Date().toISOString(),
      });

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
    setLinkedAppointment(null);
    setEditingDiagnosisId(null);
    setEditingLabResult(null);
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
      <IonContent fullscreen className="diag-content">
        <IonGrid className="diag-grid">

          {/* ── Appointment context banner ──────────────────────────────
               Shown when the doctor arrives from an appointment card.
               Tells them which appointment this diagnosis is for and
               pre-fills the form — they can still edit everything. */}
          {appointmentLoading && (
            <IonRow>
              <IonCol size="12">
                <div className="diag-appt-banner diag-appt-banner--loading">
                  <LoadingHelix size={20} />
                  <span>Loading appointment details…</span>
                </div>
              </IonCol>
            </IonRow>
          )}

          {linkedAppointment && !appointmentLoading && (
            <IonRow>
              <IonCol size="12">
                <div className="diag-appt-banner">
                  <div className="diag-appt-banner__icon">
                    <IonIcon icon={linkOutline} />
                  </div>
                  <div className="diag-appt-banner__body">
                    <p className="diag-appt-banner__label">
                      Creating diagnosis for appointment
                    </p>
                    <p className="diag-appt-banner__title">
                      {linkedAppointment.patientName}
                      {linkedAppointment.service && (
                        <span className="diag-appt-banner__service">
                          {" · "}{linkedAppointment.service}
                        </span>
                      )}
                    </p>
                    <div className="diag-appt-banner__meta">
                      {linkedAppointment.date && linkedAppointment.date !== "N/A" && (
                        <span>
                          <IonIcon icon={calendarOutline} />
                          {linkedAppointment.date}
                          {linkedAppointment.time && linkedAppointment.time !== "N/A" && (
                            <> · {linkedAppointment.time}</>
                          )}
                        </span>
                      )}
                      {linkedAppointment.status && (
                        <IonBadge color={
                          linkedAppointment.status === "completed" ? "primary" :
                          linkedAppointment.status === "accepted" ? "success" : "medium"
                        }>
                          {linkedAppointment.status}
                        </IonBadge>
                      )}
                    </div>
                    {(linkedAppointment.reason || linkedAppointment.symptoms) && (
                      <div className="diag-appt-banner__hints">
                        <IonIcon icon={informationCircleOutline} />
                        <span>
                          {[
                            linkedAppointment.reason && `Reason: ${linkedAppointment.reason}`,
                            linkedAppointment.symptoms && `Symptoms: ${linkedAppointment.symptoms}`,
                          ].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </IonCol>
            </IonRow>
          )}

          {/* ── Step 1: Select Patient ──────────────────────────────────── */}
          <IonRow>
            <IonCol size="12">
              <IonCard className="diag-card diag-card--patient">
                <IonCardHeader className="diagnoses">
                  <StepHeader step={1} icon={peopleOutline} label="Select Patient" />
                </IonCardHeader>
                <IonCardContent className="diagnoses">
                  {loading ? (
                    <div className="loading-container">
                      <LoadingHelix size={40} />
                      <IonText className="ion-text-center ion-padding"><p>Loading patients...</p></IonText>
                    </div>
                  ) : selectedPatient ? (
                    <div className="selected-patient">
                      <div className="diag-patient-card">
                        <div className="diag-patient-avatar">
                          <IonIcon icon={personOutline} />
                        </div>
                        <div className="diag-patient-info">
                          <h2>{selectedPatient.name}</h2>
                          <p className="diag-patient-meta">
                            <span>{selectedPatient.gender}</span>
                            <span className="diag-meta-dot">·</span>
                            <span>{selectedPatient.age} yrs</span>
                            <span className="diag-meta-dot">·</span>
                            <span>MRN: {selectedPatient.medicalRecordNumber}</span>
                          </p>
                          {selectedPatient.lastVisit && (
                            <p className="diag-patient-last-visit">
                              <IonIcon icon={timeOutline} />
                              Last visit: {new Date(selectedPatient.lastVisit).toLocaleDateString("en-CM")}
                            </p>
                          )}
                        </div>
                        <IonButton
                          fill="outline"
                          size="small"
                          className="diag-change-btn"
                          onClick={() => setShowPatientModal(true)}
                        >
                          Change
                        </IonButton>
                      </div>
                    </div>
                  ) : (
                    <div className="no-patient-selected">
                      <div className="diag-empty-icon">
                        <IonIcon icon={peopleOutline} />
                      </div>
                      <p>No patient selected yet</p>
                      <IonButton onClick={() => setShowPatientModal(true)}>
                        <IonIcon icon={searchOutline} slot="start" />
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
              {/* ── Step 2: Patient History ──────────────────────────────── */}
              <IonRow>
                <IonCol size="12">
                  <IonCard className="diag-card">
                    <IonCardHeader className="diagnoses">
                      <StepHeader
                        step={2}
                        icon={clipboardOutline}
                        label="Patient History"
                        badge={existingDiagnoses.length + existingLabResults.length}
                      />
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      {loadingHistory ? (
                        <div className="loading-container">
                          <LoadingHelix size={40} />
                          <IonText className="ion-text-center ion-padding"><p>Loading patient history...</p></IonText>
                        </div>
                      ) : (
                        <IonAccordionGroup className="diag-accordion-group">
                          {/* Existing Diagnoses Accordion */}
                          <IonAccordion value="diagnoses" className="diag-accordion">
                            <IonItem slot="header" className="diag-accordion-header">
                              <IonIcon icon={medicalOutline} slot="start" className="diag-accordion-icon" />
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
                            <div slot="content" className="diag-accordion-content">
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
                                              <LoadingHelix size={18} />
                                            ) : (
                                              <IonIcon icon={downloadOutline} />
                                            )}
                                          </IonButton>
                                        )}
                                      </PDFDownloadLink>
                                      <IonButton
                                        size="small"
                                        fill="outline"
                                        color="primary"
                                        onClick={() => handleEditDiagnosis(diagnosis)}
                                        aria-label="Edit diagnosis"
                                      >
                                        <IonIcon icon={pencilOutline} />
                                      </IonButton>
                                    </IonItem>
                                  ))}
                                </IonList>
                              ) : (
                                <EmptyState
                                  icon={medicalOutline}
                                  title="No previous diagnoses found"
                                  description="Diagnoses you record for this patient will be listed here."
                                />
                              )}
                            </div>
                          </IonAccordion>

                          {/* Existing Lab Results Accordion */}
                          <IonAccordion value="labResults" className="diag-accordion">
                            <IonItem slot="header" className="diag-accordion-header">
                              <IonIcon icon={flaskOutline} slot="start" className="diag-accordion-icon" />
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
                            <div slot="content" className="diag-accordion-content">
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
                                              <LoadingHelix size={18} />
                                            ) : (
                                              <IonIcon icon={downloadOutline} />
                                            )}
                                          </IonButton>
                                        )}
                                      </PDFDownloadLink>
                                      <IonButton
                                        size="small"
                                        fill="outline"
                                        color="secondary"
                                        onClick={() => handleEditLabResult(labResult)}
                                        aria-label="Edit lab result"
                                      >
                                        <IonIcon icon={pencilOutline} />
                                      </IonButton>
                                    </IonItem>
                                  ))}
                                </IonList>
                              ) : (
                                <EmptyState
                                  icon={flaskOutline}
                                  title="No lab results history found"
                                  description="Lab results you attach to this patient will be listed here."
                                />
                              )}
                            </div>
                          </IonAccordion>
                        </IonAccordionGroup>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {/* ── Steps 3–5: Form + Preview ────────────────────────────── */}
              <IonRow>
                {/* Left column: form */}
                <IonCol size="12" size-md="6">

                  {/* ── Edit-mode banner ──────────────────────────────────
                       Shown whenever editingDiagnosisId is set so the doctor
                       always knows they are modifying a saved record, not
                       creating a new one. */}
                  {editingDiagnosisId && (
                    <div className="diag-edit-banner">
                      <IonIcon icon={createOutline} className="diag-edit-banner__icon" />
                      <div className="diag-edit-banner__body">
                        <span className="diag-edit-banner__label">Editing saved diagnosis</span>
                        <span className="diag-edit-banner__hint">
                          Changes will overwrite the existing record once you save.
                        </span>
                      </div>
                      <IonButton
                        fill="clear"
                        size="small"
                        color="medium"
                        onClick={handleResetForm}
                        className="diag-edit-banner__cancel"
                        aria-label="Cancel editing"
                      >
                        <IonIcon icon={closeOutline} slot="icon-only" />
                      </IonButton>
                    </div>
                  )}

                  {/* Step 3: Diagnosis */}
                  <IonCard className="diag-card">
                    <IonCardHeader className="diagnoses">
                      <StepHeader step={3} icon={pulseOutline} label="Diagnosis Information" />
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

                  {/* Step 4: Lab Results */}
                  <IonCard className="diag-card">
                    <IonCardHeader className="diagnoses">
                      <StepHeader
                        step={4}
                        icon={flaskOutline}
                        label="Lab Results"
                        badge={diagnosisForm.labResults.length || undefined}
                      />
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      {editingLabResult && (
                        <div className="diag-edit-banner diag-edit-banner--secondary">
                          <IonIcon icon={createOutline} className="diag-edit-banner__icon" />
                          <div className="diag-edit-banner__body">
                            <span className="diag-edit-banner__label">Editing saved lab result</span>
                            <span className="diag-edit-banner__hint">
                              "{editingLabResult.name}" — changes overwrite the existing record.
                            </span>
                          </div>
                          <IonButton
                            fill="clear"
                            size="small"
                            color="medium"
                            onClick={() => {
                              setEditingLabResult(null);
                              setLabResultForm({ name: "", date: new Date().toISOString(), status: "completed", results: {}, notes: "" });
                              setCurrentResultKey("");
                              setCurrentResultValue("");
                            }}
                            aria-label="Cancel lab result edit"
                          >
                            <IonIcon icon={closeOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
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
                        <h4>
                          <IonIcon icon={listOutline} />
                          Test Results
                        </h4>
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
                          fill="outline"
                          onClick={handleAddResultValue}
                          size="small"
                          className="diag-add-btn"
                        >
                          <IonIcon icon={addOutline} slot="start" />
                          Add Result
                        </IonButton>

                        {Object.entries(labResultForm.results).length > 0 && (
                          <div className="results-list">
                            <h5>Current Results:</h5>
                            {Object.entries(labResultForm.results).map(
                              ([key, value]) => (
                                <IonItem key={key} className="diag-result-row">
                                  <IonLabel>
                                    <span className="diag-result-key">{key}</span>
                                    <span className="diag-result-sep">:</span>
                                    <span className="diag-result-val">{value}</span>
                                  </IonLabel>
                                  <IonButton
                                    fill="clear"
                                    color="danger"
                                    slot="end"
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

                      <IonButton
                        expand="block"
                        onClick={editingLabResult ? handleSaveLabResultEdit : handleAddLabResult}
                        disabled={saving}
                        className="diag-section-cta"
                      >
                        {saving ? (
                          <LoadingHelix size={18} />
                        ) : (
                          <>
                            <IonIcon icon={editingLabResult ? saveOutline : addOutline} slot="start" />
                            {editingLabResult ? "Update Lab Result" : "Add Lab Result to Diagnosis"}
                          </>
                        )}
                      </IonButton>
                    </IonCardContent>
                  </IonCard>

                  {/* Step 5: Prescriptions */}
                  <IonCard className="diag-card">
                    <IonCardHeader className="diagnoses">
                      <StepHeader
                        step={5}
                        icon={documentTextOutline}
                        label="Prescriptions"
                        badge={diagnosisForm.prescriptions.length || undefined}
                      />
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

                      <IonButton expand="block" onClick={handleAddPrescription} className="diag-section-cta">
                        <IonIcon icon={addOutline} slot="start" />
                        Add Prescription to Diagnosis
                      </IonButton>
                    </IonCardContent>
                  </IonCard>

                  {/* Action buttons */}
                  <div className="action-buttons">
                    <IonButton expand="block" onClick={handlePreviewDiagnosis} className="diag-btn-preview">
                      <IonIcon icon={eyeOutline} slot="start" />
                      {editingDiagnosisId ? "Preview Changes" : "Preview Diagnosis"}
                    </IonButton>
                    {previewDiagnosis && (
                      <IonButton
                        expand="block"
                        color="success"
                        onClick={handleSaveDiagnosis}
                        disabled={saving}
                        className="diag-btn-save"
                      >
                        {saving ? (
                          <LoadingHelix size={18} />
                        ) : (
                          <>
                            <IonIcon icon={saveOutline} slot="start" />
                            {editingDiagnosisId ? "Update Diagnosis" : "Save Diagnosis"}
                          </>
                        )}
                      </IonButton>
                    )}
                    <IonButton
                      expand="block"
                      fill="outline"
                      color="medium"
                      onClick={handleResetForm}
                      className="diag-btn-reset"
                    >
                      <IonIcon icon={refreshOutline} slot="start" />
                      {editingDiagnosisId ? "Cancel Edit" : "Reset Form"}
                    </IonButton>
                  </div>
                </IonCol>

                {/* Right column: preview + current items */}
                <IonCol size="12" size-md="6">
                  <IonCard className="diag-card diag-card--preview">
                    <IonCardHeader className="diagnoses">
                      <StepHeader step={6} icon={eyeOutline} label="Preview" />
                    </IonCardHeader>
                    <IonCardContent className="diagnoses">
                      {previewDiagnosis ? (
                        <>
                          <div className="preview-section">
                            <h3>
                              <IonIcon icon={personOutline} />
                              Patient Information
                            </h3>
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
                            <h3>
                              <IonIcon icon={pulseOutline} />
                              Diagnosis
                            </h3>
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
                              <strong>Status:</strong>{" "}
                              <IonBadge color={getStatusColor(previewDiagnosis.status)}>
                                {previewDiagnosis.status}
                              </IonBadge>
                            </p>
                            <p>
                              <strong>Description:</strong>{" "}
                              {previewDiagnosis.description}
                            </p>
                          </div>

                          {previewDiagnosis.labResults.length > 0 && (
                            <div className="preview-section">
                              <h3>
                                <IonIcon icon={flaskOutline} />
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
                                    <strong>Status:</strong>{" "}
                                    <IonBadge color={getStatusColor(labResult.status)}>
                                      {labResult.status}
                                    </IonBadge>
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
                                        fill="outline"
                                        disabled={loading}
                                      >
                                        {loading ? (
                                          <LoadingHelix size={18} />
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
                                <IonIcon icon={documentTextOutline} />
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
                                          fill="outline"
                                          disabled={loading}
                                        >
                                          {loading ? (
                                            <LoadingHelix size={18} />
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

                          <div className="preview-section preview-section--download">
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
                                    <LoadingHelix size={18} />
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
                        <EmptyState
                          icon={documentTextOutline}
                          title="Nothing to preview yet"
                          description="Fill out the form and click &quot;Preview Diagnosis&quot; to see a preview of your diagnosis report."
                        />
                      )}
                    </IonCardContent>
                  </IonCard>

                  {/* Current items summary */}
                  {(diagnosisForm.labResults.length > 0 ||
                    diagnosisForm.prescriptions.length > 0) && (
                    <IonCard className="diag-card diag-card--summary">
                      <IonCardHeader className="diagnoses">
                        <div className="diag-step-header">
                          <IonIcon icon={checkmarkCircleOutline} className="diag-summary-check" />
                          <span className="diag-step-label">Added to This Diagnosis</span>
                        </div>
                      </IonCardHeader>
                      <IonCardContent className="diagnoses">
                        {diagnosisForm.labResults.length > 0 && (
                          <div className="current-items">
                            <h4>
                              <IonIcon icon={flaskOutline} />
                              Lab Results: {diagnosisForm.labResults.length}
                            </h4>
                            <IonList>
                              {diagnosisForm.labResults.map((labResult) => (
                                <IonItem key={labResult.id} className="diag-summary-item">
                                  <IonIcon icon={flaskOutline} slot="start" color="secondary" />
                                  <IonLabel>
                                    <h3>{labResult.name}</h3>
                                    <p>
                                      <IonBadge color={getStatusColor(labResult.status)}>
                                        {labResult.status}
                                      </IonBadge>
                                    </p>
                                  </IonLabel>
                                </IonItem>
                              ))}
                            </IonList>
                          </div>
                        )}

                        {diagnosisForm.prescriptions.length > 0 && (
                          <div className="current-items">
                            <h4>
                              <IonIcon icon={documentTextOutline} />
                              Prescriptions:{" "}
                              {diagnosisForm.prescriptions.length}
                            </h4>
                            <IonList>
                              {diagnosisForm.prescriptions.map(
                                (prescription) => (
                                  <IonItem key={prescription.id} className="diag-summary-item">
                                    <IonIcon icon={medicalOutline} slot="start" color="tertiary" />
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

        {/* ── Patient Selection Modal ────────────────────────────────────── */}
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
              <EmptyState
                className="ion-margin"
                icon={peopleOutline}
                title={searchText.trim() ? "No patients match your search" : "No patients found"}
                description={
                  searchText.trim()
                    ? `We couldn't find anyone matching "${searchText.trim()}". Try a different name or MRN.`
                    : "No patients are available to select right now."
                }
                actionLabel={searchText.trim() ? "Clear search" : undefined}
                onAction={searchText.trim() ? () => setSearchText("") : undefined}
              />
            )}
          </IonContent>
        </IonModal>

        <MessageBox
          isOpen={showAlert}
          title="Notification"
          message={alertMessage}
          tone="danger"
          actions={[
            {
              label: "OK",
              color: "primary",
              onClick: () => setShowAlert(false),
            },
          ]}
          onDismiss={() => setShowAlert(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default DoctorDiagnoses;
