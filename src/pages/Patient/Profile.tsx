import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonAvatar,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonList,
  IonButtons,
  IonBackButton,
  IonBadge,
  IonText,
  IonAlert,
  IonLoading,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonInput,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import {
  mailOutline,
  callOutline,
  locationOutline,
  pencilOutline,
  cameraOutline,
  lockClosedOutline,
  heartOutline,
  medkitOutline,
  bandageOutline,
  accessibilityOutline,
  maleOutline,
  femaleOutline,
  transgenderOutline,
  shieldCheckmarkOutline,
  documentTextOutline,
  calendarOutline,
  closeCircleOutline,
  logOutOutline,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { db, storage, auth } from "../../firebaseconfig";
import "./Profile.scss";
import { authService, UserRole } from "../../App";
import { useHistory } from "react-router";

interface PatientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  notifications: number;
  avatar: string;
  bio: string;
  age: number;
  gender: string;
  bloodType: string;
  height: string;
  weight: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  primaryDoctor: string;
  insurance: {
    provider: string;
    policyNumber: string;
  };
  allergies: string[];
  conditions: string[];
  medications: string[];
  lastCheckup: string;
  nextAppointment: string;
}

// Default patient data structure
const defaultPatientData: Omit<PatientData, "id"> = {
  name: "",
  email: "",
  phone: "",
  address: "",
  joinDate: "",
  notifications: 0,
  avatar: "",
  bio: "",
  age: 0,
  gender: "",
  bloodType: "",
  height: "",
  weight: "",
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  primaryDoctor: "",
  insurance: {
    provider: "",
    policyNumber: "",
  },
  allergies: [],
  conditions: [],
  medications: [],
  lastCheckup: "",
  nextAppointment: "",
};

const Profile: React.FC = () => {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tempData, setTempData] = useState<PatientData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogOutAlert, setShowLogOutAlert] = React.useState(false);
  // Get current user ID
  const currentUser = auth.currentUser;
  const patientId = currentUser?.uid;

  // Helper function to safely merge Firestore data with defaults - memoized
  const mergePatientData = useCallback(
    (firestoreData: any, id: string): PatientData => {
      return {
        id,
        ...defaultPatientData,
        ...firestoreData,
        // Ensure nested objects are properly merged
        emergencyContact: {
          ...defaultPatientData.emergencyContact,
          ...(firestoreData?.emergencyContact || {}),
        },
        insurance: {
          ...defaultPatientData.insurance,
          ...(firestoreData?.insurance || {}),
        },
        // Ensure arrays are properly set
        allergies: Array.isArray(firestoreData?.allergies)
          ? firestoreData.allergies
          : defaultPatientData.allergies,
        conditions: Array.isArray(firestoreData?.conditions)
          ? firestoreData.conditions
          : defaultPatientData.conditions,
        medications: Array.isArray(firestoreData?.medications)
          ? firestoreData.medications
          : defaultPatientData.medications,
      };
    },
    []
  );

  // Load initial data once
  const loadInitialData = useCallback(async () => {
    if (!patientId) return;

    try {
      const patientDocRef = doc(db, "patients", patientId);
      const docSnapshot = await getDoc(patientDocRef);

      if (docSnapshot.exists()) {
        const firestoreData = docSnapshot.data();
        const mergedData = mergePatientData(firestoreData, docSnapshot.id);
        setPatient(mergedData);
        setTempData(mergedData);
      } else {
        console.log("No patient data found - creating default structure");
        // Create a default patient data structure
        const defaultData: PatientData = {
          id: patientId,
          ...defaultPatientData,
          email: currentUser?.email || "",
          name: currentUser?.displayName || "",
        };
        setPatient(defaultData);
        setTempData(defaultData);
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
      setAlertMessage("Error loading profile data");
      setShowAlert(true);
    } finally {
      setInitialLoad(false);
    }
  }, [patientId, currentUser, mergePatientData]);

  // Set up real-time listener only after initial load
  useEffect(() => {
    if (!patientId || initialLoad) return;

    const patientDocRef = doc(db, "patients", patientId);

    // Real-time listener for patient data with debouncing
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = onSnapshot(
      patientDocRef,
      (docSnapshot) => {
        // Debounce updates to prevent rapid re-renders
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (docSnapshot.exists()) {
            const firestoreData = docSnapshot.data();
            const mergedData = mergePatientData(firestoreData, docSnapshot.id);

            // Only update if data actually changed
            setPatient((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(mergedData)) {
                return prev;
              }
              return mergedData;
            });

            // Only update tempData if not in editing mode
            if (!isEditing) {
              setTempData((prev) => {
                if (JSON.stringify(prev) === JSON.stringify(mergedData)) {
                  return prev;
                }
                return mergedData;
              });
            }
          }
        }, 100);
      },
      (error) => {
        console.error("Error in real-time listener:", error);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [patientId, initialLoad, isEditing, mergePatientData]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleInputChange = useCallback(
    (field: keyof PatientData, value: string | number | string[] | any) => {
      if (!tempData) return;

      setTempData({
        ...tempData,
        [field]: value,
      });
    },
    [tempData]
  );

  const handleNestedInputChange = useCallback(
    (parentField: keyof PatientData, field: string, value: string) => {
      if (!tempData) return;

      setTempData({
        ...tempData,
        [parentField]: {
          ...(tempData[parentField] as any),
          [field]: value,
        },
      });
    },
    [tempData]
  );

  const saveChanges = async () => {
    if (!tempData || !patientId) return;

    setIsLoading(true);
    try {
      const patientDocRef = doc(db, "patients", patientId);

      // Remove the id field before saving to Firestore
      const { id, ...updateData } = tempData;

      await updateDoc(patientDocRef, updateData);

      setPatient(tempData);
      setIsEditing(false);
      setAlertMessage("Profile updated successfully!");
      setShowAlert(true);
    } catch (error) {
      console.error("Error updating profile:", error);
      setAlertMessage("Error updating profile. Please try again.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEditing = useCallback(() => {
    setTempData(patient);
    setIsEditing(false);
  }, [patient]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    if (!file.type.match("image.*")) {
      setAlertMessage("Please select an image file");
      setShowAlert(true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAlertMessage("Image must be less than 5MB");
      setShowAlert(true);
      return;
    }

    setIsLoading(true);

    try {
      // Create a reference to the storage location
      const storageRef = ref(storage, `patients/${patientId}/avatar`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the patient data with new avatar URL
      if (tempData) {
        setTempData({
          ...tempData,
          avatar: downloadURL,
        });
      }

      // Also update in Firestore
      const patientDocRef = doc(db, "patients", patientId);
      await updateDoc(patientDocRef, {
        avatar: downloadURL,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      setAlertMessage("Error uploading image. Please try again.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = () => {
    fileInputRef.current?.click();
  };

  const addItem = useCallback(
    (field: "allergies" | "conditions" | "medications", item: string) => {
      if (!tempData) return;

      // Ensure the field exists and is an array
      const currentItems = tempData[field] || [];

      if (item && !currentItems.includes(item)) {
        handleInputChange(field, [...currentItems, item]);
      }
    },
    [tempData, handleInputChange]
  );

  const removeItem = useCallback(
    (field: "allergies" | "conditions" | "medications", index: number) => {
      if (!tempData) return;

      // Ensure the field exists and is an array
      const currentItems = tempData[field] || [];
      const updatedItems = [...currentItems];
      updatedItems.splice(index, 1);
      handleInputChange(field, updatedItems);
    },
    [tempData, handleInputChange]
  );
  const history = useHistory();
  const handleLogout = async () => {
    try {
      await authService.logout();
      // Redirect to login page or handle logout
      history.push("/Patient_signin");
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Listen to patient's appointments in real-time
  useEffect(() => {
    if (!patient?.id) return;

    try {
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("patientId", "==", patient.id),
        where("status", "in", ["pending", "confirmed", "accepted"]),
        orderBy("date", "asc")
      );

      const unsubscribe = onSnapshot(
        appointmentsQuery,
        (snapshot) => {
          const appts: any[] = [];
          snapshot.forEach((d) => appts.push({ id: d.id, ...d.data() }));
          setAppointments(appts);
        },
        (error) => {
          console.error("Error listening to appointments in Profile:", error);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up appointments listener:", error);
    }
  }, [patient?.id]);

  // Safe getters for array lengths
  const getAllergiesCount = () => patient?.allergies?.length || 0;
  const getConditionsCount = () => patient?.conditions?.length || 0;
  const getMedicationsCount = () => patient?.medications?.length || 0;

  // Safe getters for nested objects
  const getEmergencyContact = () =>
    patient?.emergencyContact || defaultPatientData.emergencyContact;
  const getInsurance = () => patient?.insurance || defaultPatientData.insurance;

  // Safe array getters for display
  const getAllergies = () => patient?.allergies || [];
  const getConditions = () => patient?.conditions || [];
  const getMedications = () => patient?.medications || [];

  // Determine next appointment from appointments list: prefer soonest future appointment
  const nextAppointment = React.useMemo(() => {
    if (!appointments || appointments.length === 0) return null;
    try {
      const now = new Date();

      const mapped = appointments.map((a) => ({
        ...a,
        _dateObj:
          a.date && typeof (a.date as any).toDate === "function"
            ? (a.date as any).toDate()
            : new Date(a.date as any),
      }));

      const future = mapped
        .filter((a) => a._dateObj.getTime() >= now.getTime())
        .sort((x, y) => x._dateObj.getTime() - y._dateObj.getTime());

      if (future.length > 0) return future[0];

      const allSorted = mapped.sort(
        (x, y) => x._dateObj.getTime() - y._dateObj.getTime()
      );
      return allSorted[0];
    } catch (error) {
      console.error("Error computing next appointment in Profile:", error);
      return appointments[0] || null;
    }
  }, [appointments]);

  const formatAppointmentDate = (dateObj?: Date | null) => {
    if (!dateObj) return "No date";
    try {
      const date = dateObj;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === now.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      } else {
        return `${date.toLocaleDateString()}, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    } catch (error) {
      console.error("Error formatting appointment date:", error);
      return "Invalid date";
    }
  };

  // Show loading while data is being fetched initially
  if (initialLoad) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-padding">
          <div className="loading-container">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
            <IonText className="ion-text-center ion-padding">
              <p>Loading your Profile...</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Show error state if no patient data after loading
  if (!patient || !tempData) {
    return (
      <IonPage>
        <IonHeader class="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/patient/dashboard" />
            </IonButtons>
            <IonTitle>My Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="ion-text-center">
            <h2>Error Loading Profile</h2>
            <p>Unable to load profile data. Please try again.</p>
            <IonButton onClick={loadInitialData}>Retry</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar className="toolbar-profile">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle className="profile-title">My Profile</IonTitle>
          <IonButtons slot="end">
            {!isEditing ? (
              <IonButton onClick={() => setIsEditing(true)}>
                <IonIcon slot="icon-only" icon={pencilOutline} />
              </IonButton>
            ) : (
              <IonButton onClick={cancelEditing} color="danger">
                Cancel
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding profile-content">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: "none" }}
        />

        {/* Loading Indicator */}
        <IonLoading
          isOpen={isLoading}
          message={isLoading ? "Saving changes..." : "Uploading image..."}
          spinner="circles"
        />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertMessage.includes("Error") ? "Error" : "Success"}
          message={alertMessage}
          buttons={["OK"]}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="profile-header">
            <motion.div
              whileHover={{ scale: isEditing ? 1.05 : 1 }}
              whileTap={{ scale: isEditing ? 0.95 : 1 }}
              className="avatar-container"
              onClick={isEditing ? selectFromGallery : undefined}
            >
              <IonAvatar className="profile-avatar">
                <img
                  src={
                    tempData.avatar ||
                    "https://ionicframework.com/docs/img/demos/avatar.svg"
                  }
                  alt="Patient Avatar"
                />
              </IonAvatar>
              {isEditing && (
                <div className="avatar-overlay">
                  <IonIcon icon={cameraOutline} color="light" size="large" />
                </div>
              )}
            </motion.div>

            <div className="profile-info">
              {isEditing ? (
                <IonInput
                  value={tempData.name}
                  onIonInput={(e) => handleInputChange("name", e.detail.value!)}
                  className="profile-edit-input"
                />
              ) : (
                <IonText color="dark">
                  <h1 className="profile-name">{patient.name || "Not set"}</h1>
                </IonText>
              )}

              <div className="profile-meta">
                <IonChip color="primary">
                  {isEditing ? (
                    <IonSelect
                      value={tempData.gender}
                      onIonChange={(e) =>
                        handleInputChange("gender", e.detail.value)
                      }
                      interface="popover"
                    >
                      <IonSelectOption value="male">Male</IonSelectOption>
                      <IonSelectOption value="female">Female</IonSelectOption>
                      <IonSelectOption value="other">Other</IonSelectOption>
                    </IonSelect>
                  ) : (
                    <>
                      <IonIcon
                        icon={
                          patient.gender === "male"
                            ? maleOutline
                            : patient.gender === "female"
                            ? femaleOutline
                            : transgenderOutline
                        }
                      />
                      <IonLabel>{patient.gender || "Not set"}</IonLabel>
                    </>
                  )}
                </IonChip>

                <IonChip color="secondary">
                  <IonIcon icon={accessibilityOutline} />
                  {isEditing ? (
                    <IonInput
                      type="number"
                      value={tempData.age}
                      onIonInput={(e) =>
                        handleInputChange("age", parseInt(e.detail.value!) || 0)
                      }
                      className="chip-input"
                    />
                  ) : (
                    <IonLabel>{patient.age || 0} years</IonLabel>
                  )}
                </IonChip>

                <IonChip color="tertiary">
                  <IonIcon icon={heartOutline} />
                  {isEditing ? (
                    <IonInput
                      value={tempData.bloodType}
                      onIonInput={(e) =>
                        handleInputChange("bloodType", e.detail.value!)
                      }
                      className="chip-input"
                    />
                  ) : (
                    <IonLabel>{patient.bloodType || "Not set"}</IonLabel>
                  )}
                </IonChip>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="profile-stats"
              >
                <div className="stat-item">
                  <IonIcon icon={bandageOutline} color="primary" />
                  <span className="stat-value">{getConditionsCount()}</span>
                  <span className="stat-label">Conditions</span>
                </div>
                <div className="stat-item">
                  <IonIcon icon={medkitOutline} color="secondary" />
                  <span className="stat-value">{getMedicationsCount()}</span>
                  <span className="stat-label">Medications</span>
                </div>
                <div className="stat-item">
                  <div
                    onClick={() => {
                      if (nextAppointment && nextAppointment.id) {
                        history.push(
                          `/patient/book_appointment?appointmentId=${nextAppointment.id}`
                        );
                      }
                    }}
                    style={{ cursor: nextAppointment ? "pointer" : "default" }}
                  >
                    <IonIcon icon={calendarOutline} color="tertiary" />
                    <IonLabel>
                      <span className="stat-value">
                        {nextAppointment
                          ? formatAppointmentDate(nextAppointment._dateObj)
                          : "N/A"}
                      </span>
                    </IonLabel>

                    <span className="stat-label">Next Appt</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            exit={{ opacity: 0 }}
            className="profile-details"
          >
            <IonList lines="full" className="ion-no-padding">
              {/* Email */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={mailOutline} color="medium" />
                  <IonLabel>
                    <h3>Email</h3>
                    <p>{patient.email || "Not set"}</p>
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Phone */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={callOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="tel"
                      value={tempData.phone}
                      onIonInput={(e) =>
                        handleInputChange("phone", e.detail.value!)
                      }
                      className="profile-edit-input"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Phone</h3>
                      <p>{patient.phone || "Not set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Address */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={locationOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="text"
                      value={tempData.address}
                      onIonInput={(e) =>
                        handleInputChange("address", e.detail.value!)
                      }
                      className="profile-edit-input"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Address</h3>
                      <p>{patient.address || "Not set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Physical Stats */}
              <IonCard>
                <IonCardContent>
                  <IonGrid>
                    <IonRow>
                      <IonCol>
                        <IonItem lines="none">
                          <IonLabel>
                            <h3>Height</h3>
                            {isEditing ? (
                              <IonInput
                                value={tempData.height}
                                onIonInput={(e) =>
                                  handleInputChange("height", e.detail.value!)
                                }
                                className="profile-edit-input"
                              />
                            ) : (
                              <p>{patient.height || "Not set"}</p>
                            )}
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                      <IonCol>
                        <IonItem lines="none">
                          <IonLabel>
                            <h3>Weight</h3>
                            {isEditing ? (
                              <IonInput
                                value={tempData.weight}
                                onIonInput={(e) =>
                                  handleInputChange("weight", e.detail.value!)
                                }
                                className="profile-edit-input"
                              />
                            ) : (
                              <p>{patient.weight || "Not set"}</p>
                            )}
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>

              {/* Emergency Contact */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon
                    slot="start"
                    icon={shieldCheckmarkOutline}
                    color="medium"
                  />
                  <IonLabel>
                    <h3>Emergency Contact</h3>
                    {isEditing ? (
                      <div>
                        <IonInput
                          placeholder="Name"
                          value={tempData.emergencyContact.name}
                          onIonInput={(e) =>
                            handleNestedInputChange(
                              "emergencyContact",
                              "name",
                              e.detail.value!
                            )
                          }
                          className="profile-edit-input"
                        />
                        <IonInput
                          placeholder="Phone"
                          value={tempData.emergencyContact.phone}
                          onIonInput={(e) =>
                            handleNestedInputChange(
                              "emergencyContact",
                              "phone",
                              e.detail.value!
                            )
                          }
                          className="profile-edit-input"
                        />
                        <IonInput
                          placeholder="Relationship"
                          value={tempData.emergencyContact.relationship}
                          onIonInput={(e) =>
                            handleNestedInputChange(
                              "emergencyContact",
                              "relationship",
                              e.detail.value!
                            )
                          }
                          className="profile-edit-input"
                        />
                      </div>
                    ) : (
                      <p>
                        {getEmergencyContact().name
                          ? `${getEmergencyContact().name} (${
                              getEmergencyContact().relationship
                            }) - ${getEmergencyContact().phone}`
                          : "Not set"}
                      </p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Insurance Information */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon
                    slot="start"
                    icon={documentTextOutline}
                    color="medium"
                  />
                  <IonLabel>
                    <h3>Insurance</h3>
                    {isEditing ? (
                      <div>
                        <IonInput
                          placeholder="Provider"
                          value={tempData.insurance.provider}
                          onIonInput={(e) =>
                            handleNestedInputChange(
                              "insurance",
                              "provider",
                              e.detail.value!
                            )
                          }
                          className="profile-edit-input"
                        />
                        <IonInput
                          placeholder="Policy Number"
                          value={tempData.insurance.policyNumber}
                          onIonInput={(e) =>
                            handleNestedInputChange(
                              "insurance",
                              "policyNumber",
                              e.detail.value!
                            )
                          }
                          className="profile-edit-input"
                        />
                      </div>
                    ) : (
                      <p>
                        {getInsurance().provider
                          ? `${getInsurance().provider} - ${
                              getInsurance().policyNumber
                            }`
                          : "Not set"}
                      </p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Allergies */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={bandageOutline} color="medium" />
                  <IonLabel>
                    <h3>Allergies</h3>
                    {isEditing ? (
                      <div className="items-edit">
                        <IonInput
                          placeholder="Add an allergy"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              addItem(
                                "allergies",
                                (e.target as HTMLInputElement).value
                              );
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="item-input"
                        />
                        <div className="item-chips">
                          {(tempData.allergies || []).map((allergy, index) => (
                            <IonChip key={index} color="warning">
                              <IonLabel>{allergy}</IonLabel>
                              <IonIcon
                                icon={closeCircleOutline}
                                onClick={() => removeItem("allergies", index)}
                              />
                            </IonChip>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p>{getAllergies().join(", ") || "None reported"}</p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Medical Conditions */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={heartOutline} color="medium" />
                  <IonLabel>
                    <h3>Medical Conditions</h3>
                    {isEditing ? (
                      <div className="items-edit">
                        <IonInput
                          placeholder="Add a condition"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              addItem(
                                "conditions",
                                (e.target as HTMLInputElement).value
                              );
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="item-input"
                        />
                        <div className="item-chips">
                          {(tempData.conditions || []).map(
                            (condition, index) => (
                              <IonChip key={index} color="danger">
                                <IonLabel>{condition}</IonLabel>
                                <IonIcon
                                  icon={closeCircleOutline}
                                  onClick={() =>
                                    removeItem("conditions", index)
                                  }
                                />
                              </IonChip>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <p>{getConditions().join(", ") || "None reported"}</p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Medications */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={medkitOutline} color="medium" />
                  <IonLabel>
                    <h3>Current Medications</h3>
                    {isEditing ? (
                      <div className="items-edit">
                        <IonInput
                          placeholder="Add a medication"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              addItem(
                                "medications",
                                (e.target as HTMLInputElement).value
                              );
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="item-input"
                        />
                        <div className="item-chips">
                          {(tempData.medications || []).map(
                            (medication, index) => (
                              <IonChip key={index} color="primary">
                                <IonLabel>{medication}</IonLabel>
                                <IonIcon
                                  icon={closeCircleOutline}
                                  onClick={() =>
                                    removeItem("medications", index)
                                  }
                                />
                              </IonChip>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <p>{getMedications().join(", ") || "None reported"}</p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Bio */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon
                    slot="start"
                    icon={documentTextOutline}
                    color="medium"
                  />
                  <IonLabel>
                    <h3>Bio</h3>
                    {isEditing ? (
                      <IonTextarea
                        value={tempData.bio}
                        onIonInput={(e) =>
                          handleInputChange("bio", e.detail.value!)
                        }
                        rows={4}
                        className="profile-edit-textarea"
                      />
                    ) : (
                      <p>{patient.bio || "No bio added"}</p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>
            </IonList>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="edit-actions"
            >
              <IonButton color="primary" onClick={saveChanges}>
                Save Changes
              </IonButton>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="profile-actions"
        >
          <IonButton
            color="danger"
            fill="outline"
            onClick={() => setShowLogOutAlert(true)}
          >
            <IonIcon slot="start" icon={logOutOutline} />
            Log Out
          </IonButton>
        </motion.div>
      </IonContent>
      <IonAlert
        isOpen={showLogOutAlert}
        onDidDismiss={() => setShowLogOutAlert(false)}
        header="Log Out"
        message="Are you sure you want to Log out?"
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
          },
          {
            text: "Yes, Log out",
            handler: handleLogout,
          },
        ]}
      />
    </IonPage>
  );
};

export default Profile;
