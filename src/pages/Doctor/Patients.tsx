import { EmptyState, ErrorState, SkeletonCard, SkeletonGroup, SkeletonList } from "../../components/ui";
import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonChip,
  IonButtons,
  IonButton,
  IonModal,
  IonLabel,
  IonAvatar,
  IonSkeletonText,
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonList,
  IonBackButton,
  IonBadge,
  IonIcon,
} from "@ionic/react";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  documentId,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  medicalOutline,
  peopleOutline,
  timeOutline,
  flaskOutline,
  calendarOutline,
  checkmarkCircleOutline,
  timeOutline as clockOutline,
  documentTextOutline,
  chevronDownOutline,
} from "ionicons/icons";
import "./Patients.scss";
import { DEFAULT_AVATAR, getDocumentImageUrl, handleImageError } from "../../utils/profileImageStorage";
import { motion } from "framer-motion";


// Define patient interface
interface Patient {
  id: string;
  name: string;
  age: number;
  sex: string;
  contact: string;
  photo: string;
  subdivision: string;
  street: string;
  lastVisit: string;
  status: "stable" | "critical" | "recovering";
  bloodType: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  /** Free-text note set by admin in Admin_patient. */
  medicalHistoryNote: string;
  createdAt?: any;
  updatedAt?: any;
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

interface DiagnosisRecord {
  id: string;
  date: string;
  condition: string;
  description: string;
  status: "active" | "resolved" | "followup";
  doctor: { name: string; specialty: string; hospital: string };
  labResults: LabResult[];
  prescriptions: Prescription[];
  createdAt?: string;
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  /** Set when a Firestore read fails, so the page can offer a recovery path. */
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bumped by the error state's "Try again" action to re-run the loaders. */
  const [reloadKey, setReloadKey] = useState(0);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [relatedPatientIds, setRelatedPatientIds] = useState<string[]>([]);

  // Track current doctor
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setDoctorId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  // Track patient ids with appointments or chats for current doctor
  useEffect(() => {
    if (!doctorId) {
      setRelatedPatientIds([]);
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let appointmentIds = new Set<string>();

    const updateCombined = () => {
      setRelatedPatientIds(Array.from(appointmentIds));
    };

    const appointmentsRef = collection(db, "appointments");
    const appointmentsQuery = query(
      appointmentsRef,
      where("doctorId", "==", doctorId),
    );

    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        appointmentIds = new Set();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data.patientId) {
            appointmentIds.add(String(data.patientId));
          }
        });
        updateCombined();
      },
      (error) => {
        console.error("Error listening to appointments:", error);
        setLoadError(error.message || "Lost connection to the appointments service.");
        setLoading(false);
      },
    );

    return () => {
      unsubscribeAppointments();
    };
  }, [doctorId]);

  // Load patient records by ids
  useEffect(() => {
    const loadPatientsByIds = async () => {
      if (!doctorId) return;
      if (relatedPatientIds.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);
        const patientsData: Patient[] = [];
        const batchSize = 10;
        for (let i = 0; i < relatedPatientIds.length; i += batchSize) {
          const batch = relatedPatientIds.slice(i, i + batchSize);
          const q = query(
            collection(db, "patients"),
            where(documentId(), "in", batch),
          );
          const snapshot = await getDocs(q);
          // `for…of` rather than `forEach` so the avatar can be resolved
          // asynchronously (legacy documents store a Storage *path*, which has
          // to be turned into a download URL).
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as any;
            patientsData.push({
              id: docSnap.id,
              name: data.name,
              age: data.age,
              sex: data.sex,
              contact: data.contact,
              photo: await getDocumentImageUrl(data),
              subdivision: data.subdivision || data.town || "",
              street: data.street,
              lastVisit: data.lastVisit,
              status: data.status,
              bloodType: data.bloodType,
              conditions: data.conditions || [],
              allergies: Array.isArray(data.allergies) ? data.allergies : (data.allergies ? [data.allergies] : []),
              medications: Array.isArray(data.medications) ? data.medications : (data.medications ? [data.medications] : []),
              medicalHistoryNote: data.medicalHistory || "",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          }
        }

        patientsData.sort((a, b) => a.name.localeCompare(b.name));
        setPatients(patientsData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading related patients:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unexpected error while loading patient records.",
        );
        setLoading(false);
      }
    };

    loadPatientsByIds();
  }, [doctorId, relatedPatientIds, reloadKey]);

  // The `medicalHistory` Firestore collection is never written to by this app.
  // Real clinical data lives on the patient document (allergies, medications,
  // conditions, bloodType, medicalHistory note) and in the `diagnoses`
  // collection. This function re-fetches the patient document so the modal
  // always shows the freshest values even if the list was cached.
  const fetchPatientMedicalProfile = async (patientId: string) => {
    try {
      const snap = await getDoc(doc(db, "patients", patientId));
      if (!snap.exists()) return;
      const data = snap.data() as any;
      // Patch the selected patient in state with fresh document fields
      setSelectedPatient((prev) =>
        prev
          ? {
              ...prev,
              bloodType: data.bloodType || prev.bloodType || "",
              conditions: data.conditions || prev.conditions || [],
              allergies: Array.isArray(data.allergies)
                ? data.allergies
                : data.allergies
                ? [data.allergies]
                : prev.allergies || [],
              medications: Array.isArray(data.medications)
                ? data.medications
                : data.medications
                ? [data.medications]
                : prev.medications || [],
              medicalHistoryNote: data.medicalHistory || prev.medicalHistoryNote || "",
            }
          : prev,
      );
    } catch (error) {
      console.error("Error fetching patient medical profile:", error);
    }
  };

  // Fetch diagnoses (with embedded lab results) for the selected patient
  const fetchDiagnoses = async (patientId: string) => {
    if (!doctorId) return;
    setLoadingDiagnoses(true);
    try {
      const q = query(
        collection(db, "diagnoses"),
        where("patientId", "==", patientId),
        where("doctorId", "==", doctorId),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const data: DiagnosisRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DiagnosisRecord, "id">),
      }));
      setDiagnoses(data);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
      setDiagnoses([]);
    } finally {
      setLoadingDiagnoses(false);
    }
  };

  // Filter patients based on search
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchText.toLowerCase()) ||
      patient.conditions.some((condition) =>
        condition.toLowerCase().includes(searchText.toLowerCase()),
      );

    return matchesSearch;
  });

  // Open patient detail modal
  const openPatientDetail = async (patient: Patient) => {
    setSelectedPatient(patient);
    setDiagnoses([]);
    fetchPatientMedicalProfile(patient.id);
    fetchDiagnoses(patient.id);
    setShowModal(true);
  };

  // Add a new patient (example function)
  const addNewPatient = async (patientData: Omit<Patient, "id">) => {
    try {
      const patientsCollection = collection(db, "patients");
      const docRef = await addDoc(patientsCollection, {
        ...patientData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("Patient added with ID: ", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error adding patient: ", error);
      throw error;
    }
  };

  // Update patient (example function)
  const updatePatient = async (
    patientId: string,
    updates: Partial<Patient>,
  ) => {
    try {
      const patientDoc = doc(db, "patients", patientId);
      await updateDoc(patientDoc, {
        ...updates,
        updatedAt: new Date(),
      });
      console.log("Patient updated successfully");
    } catch (error) {
      console.error("Error updating patient: ", error);
      throw error;
    }
  };

  // Delete patient (example function)
  const deletePatient = async (patientId: string) => {
    try {
      const patientDoc = doc(db, "patients", patientId);
      await deleteDoc(patientDoc);
      console.log("Patient deleted successfully");
    } catch (error) {
      console.error("Error deleting patient: ", error);
      throw error;
    }
  };

  const formatLastVisit = (dateString: string): string => {
    if (!dateString || dateString === "Never") {
      return "Never";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle>Patients</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search patients or conditions"
            animated
            className="doctor-search"
          />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {loading ? (
          <SkeletonGroup label="Loading patients" className="ion-padding">
            <SkeletonCard metric />
            <SkeletonList rows={5} />
          </SkeletonGroup>
        ) : loadError ? (
          <ErrorState
            className="ion-padding"
            title="We couldn't load your patients"
            description="This is usually a connection problem — your records are safe. Try again, or clear the search if you were filtering."
            detail={loadError}
            onRetry={() => setReloadKey((key) => key + 1)}
            onSecondary={searchText.trim() ? () => setSearchText("") : undefined}
            secondaryLabel="Clear search"
          />
        ) : (
          // Show patient list
          <>
            {filteredPatients.length > 0 ? (
              <IonCard className="activity-card">
                <IonCardHeader>
            
                  <IonCardSubtitle>
                    {filteredPatients.length} patients
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList lines="none" className="patient-list">
                    {filteredPatients.map((patient) => (
                      <IonItem
                        key={patient.id}
                        className="patient-item"
                        button
                        detail
                        onClick={() => openPatientDetail(patient)}
                      >
                        <IonAvatar slot="start">
                          <img
                            src={patient.photo || DEFAULT_AVATAR}
                            alt={patient.name}
                            onError={handleImageError}
                          />
                        </IonAvatar>
                        <IonLabel>
                          <h2>{patient.name}</h2>
                          <p>
                            {patient.conditions[0] || "No condition listed"}
                          </p>
                        </IonLabel>
                        <div className="patient-status">
                        
                          <p className="last-checkup">
                            <span className="last-visit-label">Last visit:</span>
                            <span className="last-visit-date">{formatLastVisit(patient.lastVisit)}</span>
                          </p>
                        </div>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            ) : (
              <EmptyState
                className="ion-padding"
                icon={peopleOutline}
                title="No patients found"
                description={
                  searchText.trim()
                    ? `No matches for "${searchText.trim()}". Try a different name or condition.`
                    : "Patients linked to your account will appear here."
                }
              />
            )}
          </>
        )}

        {/* Patient Detail Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Patient Details</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)} className="close-btn">
                  <span className="close-btn-text">Close</span>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {selectedPatient && (
              <div className="patient-detail">
                <div className="patient-profile">
                  <IonAvatar className="profile-avatar">
                    <img
                      src={selectedPatient.photo || DEFAULT_AVATAR}
                      onError={handleImageError}
                      alt={selectedPatient.name}
                    />
                  </IonAvatar>
                  <h1>{selectedPatient.name}</h1>
                  <div className="profile-meta">
                    <span>
                      <span className="meta-dot"></span>
                      <span className="meta-label">{selectedPatient.age} years</span>
                    </span>
                    <span>
                      <span className="meta-dot"></span>
                      <span className="meta-label">{selectedPatient.sex === "male" ? "Male" : "Female"}</span>
                    </span>
                    {selectedPatient.bloodType && (
                      <span>
                        <span className="meta-dot"></span>
                        <span className="meta-label">Blood type: {selectedPatient.bloodType}</span>
                      </span>
                    )}
                  </div>
                  
                </div>

                <IonCard className="info-card">
                  <IonCardHeader>
                    <IonCardTitle>Contact Information</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      <IonItem className="contact-item">
                        <div className="contact-type">Phone:</div>
                        <IonLabel className="contact-value">{selectedPatient.contact}</IonLabel>
                      </IonItem>
                      <IonItem className="contact-item">
                        <div className="contact-type">Address:</div>
                        <IonLabel className="contact-value">
                          {selectedPatient.subdivision}, {selectedPatient.street}
                        </IonLabel>
                      </IonItem>
                    </IonList>
                  </IonCardContent>
                </IonCard>

                <IonCard className="info-card">
                  <IonCardHeader>
                    <IonCardTitle>Medical Conditions</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {selectedPatient.conditions.length === 0 ? (
                      <EmptyState
                        icon={medicalOutline}
                        title="No conditions recorded"
                        description="No medical conditions have been logged for this patient."
                      />
                    ) : (
                      <div className="conditions">
                        {selectedPatient.conditions.map((condition, index) => (
                          <IonChip key={index} color="primary" className="condition-chip">
                            {condition}
                          </IonChip>
                        ))}
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>

                <IonCard className="info-card">
                  <IonCardHeader>
                    <IonCardTitle>Medical Profile</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>

                    {/* Blood Type */}
                    {selectedPatient.bloodType && (
                      <div className="med-profile-row">
                        <span className="med-profile-label">Blood Type</span>
                        <IonChip color="danger" className="med-profile-chip med-profile-chip--blood">
                          {selectedPatient.bloodType}
                        </IonChip>
                      </div>
                    )}

                    {/* Conditions */}
                    <div className="med-profile-row med-profile-row--wrap">
                      <span className="med-profile-label">Conditions</span>
                      {selectedPatient.conditions?.length > 0 ? (
                        <div className="med-profile-tags">
                          {selectedPatient.conditions.map((c, i) => (
                            <IonChip key={i} color="primary" className="med-profile-chip">
                              {c}
                            </IonChip>
                          ))}
                        </div>
                      ) : (
                        <span className="med-profile-empty">None recorded</span>
                      )}
                    </div>

                    {/* Allergies */}
                    <div className="med-profile-row med-profile-row--wrap">
                      <span className="med-profile-label">Allergies</span>
                      {selectedPatient.allergies?.length > 0 ? (
                        <div className="med-profile-tags">
                          {selectedPatient.allergies.map((a, i) => (
                            <IonChip key={i} color="warning" className="med-profile-chip">
                              {a}
                            </IonChip>
                          ))}
                        </div>
                      ) : (
                        <span className="med-profile-empty">None recorded</span>
                      )}
                    </div>

                    {/* Current medications */}
                    <div className="med-profile-row med-profile-row--wrap">
                      <span className="med-profile-label">Medications</span>
                      {selectedPatient.medications?.length > 0 ? (
                        <div className="med-profile-tags">
                          {selectedPatient.medications.map((m, i) => (
                            <IonChip key={i} color="secondary" className="med-profile-chip">
                              {m}
                            </IonChip>
                          ))}
                        </div>
                      ) : (
                        <span className="med-profile-empty">None recorded</span>
                      )}
                    </div>

                    {/* Admin-entered medical history note */}
                    {selectedPatient.medicalHistoryNote && (
                      <div className="med-profile-note">
                        <span className="med-profile-label">Notes</span>
                        <p className="med-profile-note-text">
                          {selectedPatient.medicalHistoryNote}
                        </p>
                      </div>
                    )}

                    {/* If truly nothing is on record */}
                    {!selectedPatient.bloodType &&
                      !selectedPatient.conditions?.length &&
                      !selectedPatient.allergies?.length &&
                      !selectedPatient.medications?.length &&
                      !selectedPatient.medicalHistoryNote && (
                        <EmptyState
                          icon={medicalOutline}
                          title="No medical profile yet"
                          description="Blood type, conditions, allergies and medications will appear here once the patient completes their profile."
                        />
                    )}
                  </IonCardContent>
                </IonCard>

                {/* ── Diagnoses & Lab Results ─────────────────────── */}
                <IonCard className="info-card">
                  <IonCardHeader>
                    <IonCardTitle>
                      Diagnoses &amp; Lab Results
                      {diagnoses.length > 0 && (
                        <IonBadge color="primary" className="diag-history-badge">
                          {diagnoses.length}
                        </IonBadge>
                      )}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {loadingDiagnoses ? (
                      <div className="diag-history-loading">
                        <p>Loading diagnoses…</p>
                      </div>
                    ) : diagnoses.length === 0 ? (
                      <EmptyState
                        icon={medicalOutline}
                        title="No diagnoses recorded"
                        description="Diagnoses you create for this patient will appear here."
                      />
                    ) : (
                      <IonAccordionGroup className="diag-history-group">
                        {diagnoses.map((diagnosis) => (
                          <IonAccordion
                            key={diagnosis.id}
                            value={`diag-${diagnosis.id}`}
                            className="diag-history-accordion"
                          >
                            {/* ── Accordion header ── */}
                            <IonItem slot="header" className="diag-history-header">
                              <IonLabel>
                                <h3 className="diag-history-condition">
                                  {diagnosis.condition}
                                </h3>
                                <p className="diag-history-meta">
                                  <IonIcon icon={calendarOutline} />
                                  {new Date(diagnosis.date).toLocaleDateString("en-CM")}
                                  {diagnosis.doctor?.name && (
                                    <> &middot; {diagnosis.doctor.name}</>
                                  )}
                                </p>
                              </IonLabel>
                              <IonBadge
                                slot="end"
                                color={
                                  diagnosis.status === "active" ? "success" :
                                  diagnosis.status === "resolved" ? "primary" :
                                  "tertiary"
                                }
                                className="diag-history-status"
                              >
                                {diagnosis.status}
                              </IonBadge>
                            </IonItem>

                            {/* ── Accordion content ── */}
                            <div slot="content" className="diag-history-content">

                              {/* Description */}
                              {diagnosis.description && (
                                <p className="diag-history-desc">
                                  {diagnosis.description}
                                </p>
                              )}

                              {/* Doctor */}
                              {diagnosis.doctor && (
                                <div className="diag-history-doctor">
                                  <span className="diag-history-field-label">Attending Doctor</span>
                                  <span className="diag-history-field-value">
                                    {diagnosis.doctor.name}
                                    {diagnosis.doctor.specialty && ` · ${diagnosis.doctor.specialty}`}
                                    {diagnosis.doctor.hospital && ` · ${diagnosis.doctor.hospital}`}
                                  </span>
                                </div>
                              )}

                              {/* Lab Results */}
                              {diagnosis.labResults?.length > 0 && (
                                <div className="diag-history-section">
                                  <h4 className="diag-history-section-title">
                                    <IonIcon icon={flaskOutline} />
                                    Lab Results ({diagnosis.labResults.length})
                                  </h4>
                                  {diagnosis.labResults.map((lab) => (
                                    <div key={lab.id} className="diag-history-lab">
                                      <div className="diag-history-lab-header">
                                        <span className="diag-history-lab-name">{lab.name}</span>
                                        <IonBadge
                                          color={
                                            lab.status === "completed" ? "success" :
                                            lab.status === "pending" ? "warning" :
                                            "danger"
                                          }
                                        >
                                          {lab.status}
                                        </IonBadge>
                                      </div>
                                      {Object.entries(lab.results || {}).length > 0 && (
                                        <div className="diag-history-lab-results">
                                          {Object.entries(lab.results).map(([key, value]) => (
                                            <div key={key} className="diag-history-lab-row">
                                              <span className="diag-history-lab-key">{key}</span>
                                              <span className="diag-history-lab-val">{value}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {lab.notes && (
                                        <p className="diag-history-lab-notes">{lab.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Prescriptions */}
                              {diagnosis.prescriptions?.length > 0 && (
                                <div className="diag-history-section">
                                  <h4 className="diag-history-section-title">
                                    <IonIcon icon={documentTextOutline} />
                                    Prescriptions ({diagnosis.prescriptions.length})
                                  </h4>
                                  {diagnosis.prescriptions.map((rx) => (
                                    <div key={rx.id} className="diag-history-rx">
                                      <div className="diag-history-rx-header">
                                        <span className="diag-history-rx-name">{rx.medication}</span>
                                        <IonBadge
                                          color={
                                            rx.status === "active" ? "success" :
                                            rx.status === "completed" ? "primary" :
                                            "danger"
                                          }
                                        >
                                          {rx.status}
                                        </IonBadge>
                                      </div>
                                      <div className="diag-history-rx-detail">
                                        {rx.dosage && <span>{rx.dosage}</span>}
                                        {rx.frequency && <span>{rx.frequency}</span>}
                                        {rx.duration && <span>{rx.duration}</span>}
                                      </div>
                                      {rx.instructions && (
                                        <p className="diag-history-rx-instructions">{rx.instructions}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </IonAccordion>
                        ))}
                      </IonAccordionGroup>
                    )}
                  </IonCardContent>
                </IonCard>

              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Patients;
