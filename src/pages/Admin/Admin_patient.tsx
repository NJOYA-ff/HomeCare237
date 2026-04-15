import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonAlert,
  IonLoading,
  IonBadge,
  IonButtons,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonFab,
  IonFabButton,
  IonInput,
  IonDatetime,
  IonTextarea,
  IonGrid,
  IonRow,
  IonCol,
  useIonToast,
  IonBackButton,
  IonModal,
  IonImg,
  IonChip,
} from "@ionic/react";
import {
  add,
  trash,
  personAdd,
  close,
  checkmark,
  medical,
  warning,
  informationCircle,
  create,
  call,
  calendar,
  logIn,
  location,
  person,
  male,
  female,
  transgender,
  mail,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { db, auth } from "../../firebaseconfig";
import "./Admin3.scss";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  medicalHistory: string;
  status: "active" | "inactive";
  lastVisit?: string;
  avatar?: string;
  role: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  uid?: string; // Firebase Auth UID
  sex: "male" | "female" | "other";
}

interface AuthForm {
  email: string;
  password: string;
  confirmPassword?: string;
}

const Admin_patient: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [showAlert, setShowAlert] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [presentToast] = useIonToast();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [patientForm, setPatientForm] = useState<
    Omit<
      Patient,
      "id" | "avatar" | "lastVisit" | "createdAt" | "updatedAt" | "uid"
    >
  >({
    name: "",
    email: "",
    phone: "",
    address: "",
    dob: new Date().toISOString(),
    medicalHistory: "",
    status: "active",
    role: "patient",
    sex: "male",
  });

  const [authForm, setAuthForm] = useState<AuthForm>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Firebase collection reference
  const patientsCollection = collection(db, "patients");

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load patients from Firebase
  useEffect(() => {
    setLoading(true);

    const q = query(patientsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const patientsData: Patient[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          patientsData.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            dob: data.dob,
            medicalHistory: data.medicalHistory,
            status: data.status,
            lastVisit: data.lastVisit,
            avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            role: "patient",
            uid: data.uid,
            sex: data.sex || "other", // Default to "other" if not specified
          });
        });

        setPatients(patientsData);
        setFilteredPatients(patientsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching patients:", error);
        presentToast({
          message: "Failed to load patients",
          duration: 2000,
          color: "danger",
          icon: warning,
        });
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [presentToast]);

  // Filter patients
  useEffect(() => {
    let result = patients;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (patient) =>
          patient.name.toLowerCase().includes(term) ||
          patient.email.toLowerCase().includes(term) ||
          patient.phone.includes(term) ||
          patient.address.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((patient) => patient.status === statusFilter);
    }

    setFilteredPatients(result);
  }, [searchTerm, statusFilter, patients]);

  // Calculate age from date of birth
  const resolveAge = (dob: string): number => {
    if (!dob) return 0;
    // If it's a plain number (age stored directly), return it
    const asNumber = Number(dob);
    if (!isNaN(asNumber) && asNumber > 0 && asNumber < 150) return asNumber;
    // Otherwise treat as date of birth
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // Get sex icon and color
  const getSexIcon = (sex: string) => {
    switch (sex) {
      case "male":
        return { icon: male, color: "primary" };
      case "female":
        return { icon: female, color: "danger" };
      default:
        return { icon: transgender, color: "medium" };
    }
  };

  const handleDeleteClick = (id: string) => {
    setPatientToDelete(id);
    setShowAlert(true);
  };

  const confirmDelete = async () => {
    if (patientToDelete) {
      try {
        await deleteDoc(doc(db, "patients", patientToDelete));
        presentToast({
          message: "Patient deleted successfully",
          duration: 2000,
          color: "success",
          icon: checkmark,
        });
      } catch (error) {
        console.error("Error deleting patient:", error);
        presentToast({
          message: "Failed to delete patient",
          duration: 2000,
          color: "danger",
          icon: warning,
        });
      }
    }
    setShowAlert(false);
  };

  const handlePatientSignup = async () => {
    if (!patientForm.name || !authForm.email || !authForm.password) {
      presentToast({
        message: "Name, email, and password are required",
        duration: 2000,
        color: "warning",
        icon: informationCircle,
      });
      return;
    }

    if (authForm.password !== authForm.confirmPassword) {
      presentToast({
        message: "Passwords do not match",
        duration: 2000,
        color: "warning",
        icon: informationCircle,
      });
      return;
    }

    if (authForm.password.length < 6) {
      presentToast({
        message: "Password must be at least 6 characters",
        duration: 2000,
        color: "warning",
        icon: informationCircle,
      });
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        authForm.email,
        authForm.password
      );

      const user = userCredential.user;

      // Create patient record in Firestore
      const newPatient = {
        ...patientForm,
        email: authForm.email, // Use the email from auth form
        avatar: `https://ionicframework.com/docs/img/demos/avatar.svg`,
        uid: user.uid, // Link to Firebase Auth UID
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(patientsCollection, newPatient);

      presentToast({
        message: "Patient account created successfully!",
        duration: 3000,
        color: "success",
        icon: checkmark,
      });

      resetForm();
      setShowModal(false);
    } catch (error: any) {
      console.error("Error creating patient account:", error);

      let errorMessage = "Failed to create patient account";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already in use";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }

      presentToast({
        message: errorMessage,
        duration: 3000,
        color: "danger",
        icon: warning,
      });
    }
  };

  const handleEditPatient = async () => {
    if (!patientForm.name || !patientForm.email) {
      presentToast({
        message: "Name and email are required",
        duration: 2000,
        color: "warning",
        icon: informationCircle,
      });
      return;
    }

    try {
      if (isEditing && currentPatientId) {
        // Update existing patient
        const patientRef = doc(db, "patients", currentPatientId);
        await updateDoc(patientRef, {
          ...patientForm,
          updatedAt: Timestamp.now(),
        });

        presentToast({
          message: "Patient updated successfully",
          duration: 2000,
          color: "success",
          icon: checkmark,
        });

        resetForm();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error updating patient:", error);
      presentToast({
        message: "Failed to update patient",
        duration: 2000,
        color: "danger",
        icon: warning,
      });
    }
  };

  const resetForm = () => {
    setPatientForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      dob: new Date().toISOString(),
      medicalHistory: "",
      status: "active",
      role: "patient",
      sex: "male",
    });
    setAuthForm({
      email: "",
      password: "",
      confirmPassword: "",
    });
    setIsEditing(false);
    setCurrentPatientId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDateChange = (e: CustomEvent) => {
    const value = Array.isArray(e.detail.value)
      ? e.detail.value[0]
      : e.detail.value;
    setPatientForm({ ...patientForm, dob: value || new Date().toISOString() });
  };

  const openEditModal = (patient: Patient) => {
    setPatientForm({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      address: patient.address,
      dob: patient.dob,
      medicalHistory: patient.medicalHistory,
      status: patient.status,
      role: "patient",
      sex: patient.sex,
    });
    setIsEditing(true);
    setCurrentPatientId(patient.id);
    setShowModal(true);
  };

  const openSignupModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleModalSubmit = () => {
    if (isEditing) {
      handleEditPatient();
    } else {
      handlePatientSignup();
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-toolbar-p">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="patient-title">Patients</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openSignupModal}>
              <IonIcon slot="icon-only" icon={personAdd} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar className="filter-toolbar">
          <IonGrid className="filter-grid">
            <IonRow>
              <IonCol size="12" sizeMd="8">
                <IonSearchbar
                  placeholder="Search patients..."
                  value={searchTerm}
                  onIonChange={(e) => setSearchTerm(e.detail.value || "")}
                  animated
                  debounce={300}
                  className="search-bar"
                />
              </IonCol>
              <IonCol size="12" sizeMd="4">
                <IonSelect
                  value={statusFilter}
                  placeholder="Filter by status"
                  onIonChange={(e) => setStatusFilter(e.detail.value)}
                  interface="popover"
                  className="status-filter"
                >
                  <IonSelectOption value="all">All Patients</IonSelectOption>
                  <IonSelectOption value="active">Active</IonSelectOption>
                  <IonSelectOption value="inactive">Inactive</IonSelectOption>
                </IonSelect>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="content">
        <IonLoading isOpen={loading} message="Loading patients..." />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={"Confirm Deletion"}
          message={"Are you sure you want to delete this patient?"}
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              cssClass: "alert-button-cancel",
            },
            {
              text: "Delete",
              cssClass: "alert-button-confirm",
              handler: confirmDelete,
            },
          ]}
        />

        {/* Patient List */}
        {filteredPatients.length === 0 && !loading ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <IonIcon icon={medical} className="empty-icon" />
            <h3>No patients found</h3>
            <p>Try adjusting your search or add a new patient</p>
            <IonButton onClick={openSignupModal} className="empty-action">
              <IonIcon slot="start" icon={personAdd} />
              Add Patient
            </IonButton>
          </motion.div>
        ) : (
          <IonList className="patient-list">
            <AnimatePresence>
              {filteredPatients.map((patient, index) => {
                const sexInfo = getSexIcon(patient.sex);
                return (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 100,
                      damping: 10,
                    }}
                    layout
                  >
                    <IonItem
                      className={`patient-item ${patient.status}`}
                      lines="none"
                      style={{ borderLeft: `4px solid ${patient.status === "active" ? "var(--ion-color-success)" : "var(--ion-color-medium)"}` }}
                    >
                      {/* Avatar with status dot */}
                      <div slot="start" className="p-avatar">
                        <div className="p-initials" style={{ background: sexInfo.color === "danger" ? "var(--ion-color-danger)" : sexInfo.color === "primary" ? "var(--ion-color-primary)" : "var(--ion-color-medium)" }}>
                          {patient.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`p-status-dot ${patient.status}`} />
                      </div>

                      {/* Main info */}
                      <div className="p-info">
                        {/* Row 1: name + age/sex chips */}
                        <div className="p-row p-row-top">
                          <span className="p-name">{patient.name}</span>
                          <div className="p-chips">
                            <IonChip color="medium" style={{ height: 22, fontSize: "0.72rem", margin: 0 }}>
                              <IonIcon icon={person} style={{ fontSize: 12 }} />
                              <IonLabel>{resolveAge(patient.dob)} yrs</IonLabel>
                            </IonChip>
                            <IonChip color={sexInfo.color as any} style={{ height: 22, fontSize: "0.72rem", margin: 0 }}>
                              <IonIcon icon={sexInfo.icon} style={{ fontSize: 12 }} />
                              <IonLabel>{patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}</IonLabel>
                            </IonChip>
                          </div>
                        </div>
                        {/* Row 2: email + phone inline */}
                        <div className="p-row p-row-contact">
                          <span className="p-contact-item"><IonIcon icon={mail} />{patient.email}</span>
                          <span className="p-contact-item"><IonIcon icon={call} />{patient.phone}</span>
                        </div>
                        {/* Row 3: address + last visit */}
                        <div className="p-row p-row-meta">
                          {patient.address && <span className="p-meta-item"><IonIcon icon={location} />{patient.address}</span>}
                          {patient.lastVisit && <span className="p-meta-item"><IonIcon icon={calendar} />Last: {formatDate(patient.lastVisit)}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-actions" slot="end">
                        <IonButton fill="clear" color="primary" onClick={() => openEditModal(patient)} className="edit-button">
                          <IonIcon slot="icon-only" icon={create} />
                        </IonButton>
                        <IonButton fill="clear" color="danger" onClick={() => handleDeleteClick(patient.id)} className="delete-button">
                          <IonIcon slot="icon-only" icon={trash} />
                        </IonButton>
                      </div>
                    </IonItem>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </IonList>
        )}

        {/* Custom Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                <IonIcon icon={isEditing ? create : personAdd} />{" "}
                {isEditing ? "Edit Patient" : "Patient Signup"}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent class="ion-padding">
            {/* Patient Information */}
            <IonItem className="form-item">
              <IonLabel position="floating">Full Name*</IonLabel>
              <IonInput
                value={patientForm.name}
                onIonChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    name: e.detail.value!,
                  })
                }
                required
              />
            </IonItem>

            {isEditing ? (
              // Edit Mode - Simple email field
              <IonItem className="form-item">
                <IonLabel position="floating">Email*</IonLabel>
                <IonInput
                  type="email"
                  value={patientForm.email}
                  onIonChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      email: e.detail.value!,
                    })
                  }
                  required
                />
              </IonItem>
            ) : (
              // Signup Mode - Auth fields
              <>
                <IonItem className="form-item">
                  <IonLabel position="floating">Email*</IonLabel>
                  <IonInput
                    type="email"
                    value={authForm.email}
                    onIonChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        email: e.detail.value!,
                      })
                    }
                    required
                  />
                </IonItem>
                <IonItem className="form-item">
                  <IonLabel position="floating">Password*</IonLabel>
                  <IonInput
                    type="password"
                    value={authForm.password}
                    onIonChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        password: e.detail.value!,
                      })
                    }
                    required
                  />
                </IonItem>
                <IonItem className="form-item">
                  <IonLabel position="floating">Confirm Password*</IonLabel>
                  <IonInput
                    type="password"
                    value={authForm.confirmPassword}
                    onIonChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        confirmPassword: e.detail.value!,
                      })
                    }
                    required
                  />
                </IonItem>
              </>
            )}

            {/* Additional Fields */}
            <IonItem className="form-item">
              <IonLabel position="floating">Phone</IonLabel>
              <IonInput
                type="tel"
                value={patientForm.phone}
                onIonChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    phone: e.detail.value!,
                  })
                }
              />
            </IonItem>

            <IonItem className="form-item">
              <IonLabel>Sex</IonLabel>
              <IonSelect
                value={patientForm.sex}
                onIonChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    sex: e.detail.value as "male" | "female" | "other",
                  })
                }
                interface="popover"
              >
                <IonSelectOption value="male">Male</IonSelectOption>
                <IonSelectOption value="female">Female</IonSelectOption>
                <IonSelectOption value="other">Other</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem className="form-item">
              <IonLabel position="floating">Age</IonLabel>
              <IonInput
                type="number"
                value={patientForm.dob}
                onIonChange={(e) =>
                  setPatientForm({ ...patientForm, dob: e.detail.value! })
                }
                min="0"
                max="150"
              />
            </IonItem>

            <IonItem className="form-item">
              <IonLabel position="floating">Address</IonLabel>
              <IonInput
                value={patientForm.address}
                onIonChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    address: e.detail.value!,
                  })
                }
              />
            </IonItem>
            <IonItem className="form-item">
              <IonLabel position="floating">Medical History</IonLabel>
              <IonTextarea
                value={patientForm.medicalHistory}
                onIonChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    medicalHistory: e.detail.value!,
                  })
                }
                rows={3}
                autoGrow
              />
            </IonItem>
            <IonItem className="form-item">
              <IonLabel>Status</IonLabel>
              <IonSelect
                value={patientForm.status}
                onIonChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    status: e.detail.value as "active" | "inactive",
                  })
                }
                interface="popover"
              >
                <IonSelectOption value="active">Active</IonSelectOption>
                <IonSelectOption value="inactive">Inactive</IonSelectOption>
              </IonSelect>
            </IonItem>

            <div className="form-actions">
              <IonButton
                color="medium"
                onClick={closeModal}
                fill="outline"
                className="action-button"
              >
                Cancel
              </IonButton>
              <IonButton
                color="primary"
                onClick={handleModalSubmit}
                disabled={
                  isEditing
                    ? !patientForm.name || !patientForm.email
                    : !patientForm.name ||
                      !authForm.email ||
                      !authForm.password ||
                      !authForm.confirmPassword
                }
                className="action-button"
              >
                {isEditing ? "Update Patient" : "Create Account"}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonFab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          className="fab-button"
        >
          <IonFabButton onClick={openSignupModal}>
            <IonIcon icon={personAdd} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Admin_patient;
