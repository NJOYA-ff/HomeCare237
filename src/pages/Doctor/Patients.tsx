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
  IonCardContent,
  IonChip,
  IonIcon,
  IonButtons,
  IonButton,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonAvatar,
  IonSkeletonText,
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonList,
  IonBackButton,
} from "@ionic/react";
import { db, auth, storage } from "../../firebaseconfig";
import {
  call,
  location,
  calendar,
  medical,
  alertCircle,
  close,
  filter,
  male,
  female,
} from "ionicons/icons";
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
} from "firebase/firestore";
import "./Patients.scss";

// Define patient interface
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  photo: string;
  phone: string;
  address: string;
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
  const [segment, setSegment] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);

  // Fetch patients from Firestore
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const patientsCollection = collection(db, "patients");
        const patientsQuery = query(patientsCollection, orderBy("name"));
        const querySnapshot = await getDocs(patientsQuery);

        const patientsData: Patient[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          patientsData.push({
            id: doc.id,
            name: data.name,
            age: data.age,
            gender: data.gender,
            photo:
              data.photo ||
              "https://ionicframework.com/docs/img/demos/avatar.svg",
            phone: data.phone,
            address: data.address,
            lastVisit: data.lastVisit,
            status: data.status,
            bloodType: data.bloodType,
            conditions: data.conditions || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        setPatients(patientsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching patients:", error);
        setLoading(false);
      }
    };

    // Real-time listener version

    const patientsCollection = collection(db, "patients");
    const patientsQuery = query(patientsCollection, orderBy("name"));

    const unsubscribe = onSnapshot(
      patientsQuery,
      (querySnapshot) => {
        const patientsData: Patient[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          patientsData.push({
            id: doc.id,
            name: data.name,
            age: data.age,
            gender: data.gender,
            photo:
              data.photo ||
              "https://ionicframework.com/docs/img/demos/avatar.svg",
            phone: data.phone,
            address: data.address,
            lastVisit: data.lastVisit,
            status: data.status,
            bloodType: data.bloodType,
            conditions: data.conditions || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setPatients(patientsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to patients:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();

    fetchPatients();
  }, []);

  // Fetch medical history for selected patient
  const fetchMedicalHistory = async (patientId: string) => {
    try {
      const medicalHistoryCollection = collection(db, "medicalHistory");
      const medicalHistoryQuery = query(
        medicalHistoryCollection,
        where("patientId", "==", patientId),
        orderBy("date", "desc")
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

  // Filter patients based on search and segment
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchText.toLowerCase()) ||
      patient.conditions.some((condition) =>
        condition.toLowerCase().includes(searchText.toLowerCase())
      );

    if (segment === "all") return matchesSearch;
    return matchesSearch && patient.status === segment;
  });

  // Open patient detail modal
  const openPatientDetail = async (patient: Patient) => {
    setSelectedPatient(patient);
    await fetchMedicalHistory(patient.id);
    setShowModal(true);
  };

  // Handle segment change
  const handleSegmentChange = (e: any) => {
    setSegment(e.detail.value as string);
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
    updates: Partial<Patient>
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle>Patients</IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <IonIcon icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search patients or conditions"
            animated
          />
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={segment} onIonChange={handleSegmentChange}>
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="stable">
              <IonLabel>Stable</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="recovering">
              <IonLabel>Recovering</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="critical">
              <IonLabel>Critical</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {loading ? (
          // Show skeleton loaders while loading
          Array.from({ length: 5 }).map((_, index) => (
            <IonCard key={index} className="patient-card">
              <IonCardHeader>
                <div className="patient-header">
                  <IonSkeletonText
                    animated
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                    }}
                  />
                  <div className="patient-info">
                    <IonSkeletonText
                      animated
                      style={{ width: "60%", height: "16px" }}
                    />
                    <IonSkeletonText
                      animated
                      style={{ width: "40%", height: "14px", marginTop: "8px" }}
                    />
                  </div>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <IonSkeletonText
                  animated
                  style={{ width: "80%", height: "14px" }}
                />
                <IonSkeletonText
                  animated
                  style={{ width: "70%", height: "14px", marginTop: "8px" }}
                />
              </IonCardContent>
            </IonCard>
          ))
        ) : (
          // Show patient list
          <>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <IonCard
                  key={patient.id}
                  className="patient-card"
                  onClick={() => openPatientDetail(patient)}
                >
                  <div className="patient-header">
                    <IonAvatar className="patient-avatar">
                      <img src={patient.photo} alt={patient.name} />
                    </IonAvatar>
                    <div className="patient-info-p">
                      <h2>{patient.name}</h2>
                      <p>
                        {patient.age} yrs •{" "}
                        {patient.gender === "male" ? "Male" : "Female"} •{" "}
                        {patient.bloodType}
                      </p>
                    </div>
                    <IonChip
                      color={
                        patient.status === "stable"
                          ? "success"
                          : patient.status === "recovering"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {patient.status}
                    </IonChip>
                  </div>

                  <IonCardContent>
                    <div className="patient-details-p">
                      <div className="detail-item-p">
                        <IonIcon icon={call} />
                        <span>{patient.phone}</span>
                      </div>
                      <div className="detail-item-p">
                        <IonIcon icon={location} />
                        <span>{patient.address}</span>
                      </div>
                      <div className="detail-item-p">
                        <IonIcon icon={calendar} />
                        <span>Last visit: {patient.lastVisit}</span>
                      </div>
                    </div>

                    <div className="conditions">
                      {patient.conditions.map((condition, index) => (
                        <IonChip key={index} color="primary" outline>
                          {condition}
                        </IonChip>
                      ))}
                    </div>
                  </IonCardContent>
                </IonCard>
              ))
            ) : (
              <div className="no-results">
                <IonIcon icon={alertCircle} size="large" />
                <p>No patients found</p>
              </div>
            )}
          </>
        )}

        {/* Patient Detail Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Patient Details</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
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
                      src={selectedPatient.photo}
                      alt={selectedPatient.name}
                    />
                  </IonAvatar>
                  <h1>{selectedPatient.name}</h1>
                  <p>
                    {selectedPatient.age} years •
                    {selectedPatient.gender === "male" ? (
                      <IonIcon icon={male} color="primary" />
                    ) : (
                      <IonIcon icon={female} color="danger" />
                    )}{" "}
                    •{selectedPatient.bloodType}
                  </p>
                  <IonChip
                    color={
                      selectedPatient.status === "stable"
                        ? "success"
                        : selectedPatient.status === "recovering"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {selectedPatient.status}
                  </IonChip>
                </div>

                <IonCard className="info-card">
                  <IonCardHeader>
                    <IonCardTitle>Contact Information</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      <IonItem>
                        <IonIcon icon={call} slot="start" />
                        <IonLabel>{selectedPatient.phone}</IonLabel>
                      </IonItem>
                      <IonItem>
                        <IonIcon icon={location} slot="start" />
                        <IonLabel>{selectedPatient.address}</IonLabel>
                      </IonItem>
                    </IonList>
                  </IonCardContent>
                </IonCard>

                <IonCard className="info-card">
                  <IonCardHeader>
                    <IonCardTitle>Medical Conditions</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="conditions">
                      {selectedPatient.conditions.map((condition, index) => (
                        <IonChip key={index} color="primary">
                          <IonIcon icon={medical} />
                          <IonLabel>{condition}</IonLabel>
                        </IonChip>
                      ))}
                    </div>
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
                        <p>No medical history records found.</p>
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
