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
} from "@ionic/react";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  getDocs,
  doc,
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
import "./Patients.scss";
import { DEFAULT_AVATAR, getDocumentImageUrl, handleImageError } from "../../utils/profileImageStorage";
import { motion } from "framer-motion";
import { medicalOutline, peopleOutline, timeOutline } from "ionicons/icons";


// Define patient interface
interface Patient {
  id: string;
  name: string;
  age: number;
  sex: string;
  contact: string;
  photo: string;
  town: string;
  street: string;
  lastVisit: string;
  status: "stable" | "critical" | "recovering";
  bloodType: string;
  conditions: string[];
  createdAt?: any;
  updatedAt?: any;
}

// Define medical history interface
interface MedicalHistory {
  id: string;
  date: string;
  diagnosis: string;
  doctor: string;
  treatment: string;
  notes: string;
  patientId: string;
  createdAt?: any;
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
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
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
              town: data.town,
              street: data.street,
              lastVisit: data.lastVisit,
              status: data.status,
              bloodType: data.bloodType,
              conditions: data.conditions || [],
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

  // Fetch medical history for selected patient
  const fetchMedicalHistory = async (patientId: string) => {
    try {
      const medicalHistoryCollection = collection(db, "medicalHistory");
      const medicalHistoryQuery = query(
        medicalHistoryCollection,
        where("patientId", "==", patientId),
        orderBy("date", "desc"),
      );
      const querySnapshot = await getDocs(medicalHistoryQuery);

      const medicalHistoryData: MedicalHistory[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        medicalHistoryData.push({
          id: doc.id,
          date: data.date,
          diagnosis: data.diagnosis,
          doctor: data.doctor,
          treatment: data.treatment,
          notes: data.notes,
          patientId: data.patientId,
          createdAt: data.createdAt,
        });
      });

      setMedicalHistory(medicalHistoryData);
    } catch (error) {
      console.error("Error fetching medical history:", error);
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
    await fetchMedicalHistory(patient.id);
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
                          {selectedPatient.town}, {selectedPatient.street}
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
                    <IonCardTitle>Medical History</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonAccordionGroup>
                      {medicalHistory.length > 0 ? (
                        medicalHistory.map((record) => (
                          <IonAccordion
                            key={record.id}
                            value={`record-${record.id}`}
                          >
                            <IonItem slot="header">
                              <IonLabel>
                                <h3>{record.diagnosis}</h3>
                                <p>
                                  {record.date} • {record.doctor}
                                </p>
                              </IonLabel>
                            </IonItem>
                            <div className="ion-padding" slot="content">
                              <p>
                                <strong>Treatment:</strong> {record.treatment}
                              </p>
                              <p>
                                <strong>Notes:</strong> {record.notes}
                              </p>
                            </div>
                          </IonAccordion>
                        ))
                      ) : (
                        <EmptyState
                          icon={timeOutline}
                          title="No medical history records"
                          description="Visit records and clinical notes for this patient will appear here."
                        />
                      )}
                    </IonAccordionGroup>
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
