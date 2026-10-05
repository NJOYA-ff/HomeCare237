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
import { MessageBox } from "../../components/ui/MessageBox";
import {
  mailOutline,
  callOutline,
  locationOutline,
  pencilOutline,
  cameraOutline,
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
import LoadingHelix from "../../components/LoadingHelix";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebaseconfig";
import { authService } from "../../App";
import {
  DEFAULT_AVATAR,
  getDocumentImageUrl,
  handleImageError,
} from "../../utils/profileImageStorage";
import {
  appointmentMillis,
  formatAppointmentWhen,
} from "../../utils/appointmentDate";
import { useSettings } from "../../context/SettingsContext";
import "./Profile.scss";
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
  const { language } = useSettings();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tempData, setTempData] = useState<PatientData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  /* Resolved avatar `<img src>`. Kept separate from `patient.avatar` because the
     Firestore document writes the picture under several historical names
     (`profilePhoto` at signup, `photoURL` for Google sign-in, …) and may hold a
     bare Storage path rather than a download URL. `avatarUrl` holds the value
     that is actually safe to hand to `<img src>`. */
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allergyInputRef = useRef<any>(null);
  const conditionInputRef = useRef<any>(null);
  const medicationInputRef = useRef<any>(null);
  const [showLogOutAlert, setShowLogOutAlert] = React.useState(false);

  // Reactively track auth state — auth.currentUser is null on first render
  // if Firebase hasn't restored the session yet, which would leave the page
  // stuck on the loading screen permanently.
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return unsub;
  }, []);

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
    [],
  );

  /* Resolve the avatar from a Firestore patient document.
     `getDocumentImageUrl` checks every historical field name in priority order
     and accepts both a download URL and a bare Storage path. Reading
     `firestoreData.avatar` alone — as this page used to — never matched what
     signup writes (`profilePhoto`) or what Google sign-in writes (`profilePhoto`
     from `photoURL`), so a real uploaded photo was never shown and the avatar
     silently fell back to the placeholder. */
  const resolveAvatar = useCallback(async (source: unknown) => {
    try {
      const resolved = await getDocumentImageUrl(source);
      setAvatarUrl(resolved || DEFAULT_AVATAR);
    } catch (error) {
      console.error("Error resolving patient avatar:", error);
      setAvatarUrl(DEFAULT_AVATAR);
    }
  }, []);

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
        void resolveAvatar(firestoreData);
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
        void resolveAvatar(defaultData);
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
      setAlertMessage("Error loading profile data");
      setShowAlert(true);
    } finally {
      setInitialLoad(false);
    }
  }, [patientId, currentUser, mergePatientData, resolveAvatar]);

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

            // Keep the avatar in sync with edits made on another device. Skipped
            // while editing so a remote change cannot discard in-progress input;
            // the local upload path already updates it optimistically.
            if (!isEditing) {
              void resolveAvatar(firestoreData);
            }
          }
        }, 100);
      },
      (error) => {
        console.error("Error in real-time listener:", error);
      },
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [patientId, initialLoad, isEditing, mergePatientData, resolveAvatar]);

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
    [tempData],
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
    [tempData],
  );

  const saveChanges = async () => {
    if (!tempData || !patientId) return;

    setIsLoading(true);
    try {
      const patientDocRef = doc(db, "patients", patientId);

      // Remove the id field before saving to Firestore
      const { id, ...updateData } = tempData;

      // `setDoc(..., { merge: true })` rather than `updateDoc`: a patient whose
      // document does not exist yet (the "no patient data found" branch above
      // builds an in-memory default and never writes it) made every save throw
      // `NOT_FOUND`, so editing the profile silently did nothing. Merge keeps
      // fields this page does not manage — `profilePhoto`, `role`, `createdAt`,
      // the `medications` subcollection — intact instead of replacing the doc.
      await setDoc(patientDocRef, updateData, { merge: true });

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

  // Save a single field immediately to Firestore
  const saveField = async (field: string, value: any) => {
    if (!patientId) {
      console.error("No patient ID to save field");
      return;
    }
    try {
      const patientDocRef = doc(db, "patients", patientId);

      // Prepare the payload
      const payload: any = { [field]: value };

      console.log("Saving to Firebase:", field, "Value:", payload[field]);
      // Same reason as `saveChanges`: merge-write so this succeeds even when the
      // patient document has not been created yet.
      await setDoc(patientDocRef, payload, { merge: true });

      // Update local state
      setPatient((prev) => (prev ? { ...prev, [field]: value } : null));

      console.log("Successfully saved to Firebase:", field);
    } catch (e: any) {
      console.error("Failed to save field to Firebase:", field, "Error:", e);
      console.error("Error details:", e.message);
      throw e;
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
      // Create a reference to the storage location.
      // `profile_photos/{uid}/…` is the path the Storage rules explicitly
      // authorise for the user's own picture; `patients/{uid}/avatar` only fell
      // through to the catch-all `allow write: if isAuthenticated()`, which let
      // *any* signed-in user overwrite *any* other user's avatar.
      const storageRef = ref(storage, `profile_photos/${patientId}/avatar`);

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

      // Show the new picture immediately instead of waiting for the round trip.
      setAvatarUrl(downloadURL);

      // Also update in Firestore.
      // Write `profilePhoto` — the field both signup flows and `App.tsx` use —
      // *and* `avatar`, so every reader of this document finds it. Writing only
      // `avatar` left the picture invisible to the dashboard, the doctor's patient
      // list and the admin views.
      // Merge-write, for the same reason as `saveChanges`: the patient document
      // may not exist yet.
      const patientDocRef = doc(db, "patients", patientId);
      await setDoc(
        patientDocRef,
        { profilePhoto: downloadURL, avatar: downloadURL },
        { merge: true },
      );
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

  const addItem = async (
    field: "allergies" | "conditions" | "medications",
    item: string,
  ) => {
    if (!tempData) return;

    // Ensure the field exists and is an array
    const currentItems = tempData[field] || [];

    if (item && !currentItems.includes(item)) {
      try {
        // Create a new array with the new item
        const updatedItems = [...currentItems, item];

        // Update local state
        handleInputChange(field, updatedItems);

        // Save to Firebase
        await saveField(field, updatedItems);

        console.log("Item added successfully:", item);
      } catch (e) {
        console.error("Error adding item:", e);
        setAlertMessage("Failed to add item. Please try again.");
        setShowAlert(true);
      }
    }
  };

  const addAllergy = async () => {
    if (!allergyInputRef.current) return;

    const inputValue = await allergyInputRef.current.getInputElement();
    const allergy = inputValue.value.trim();

    if (!allergy) return;

    try {
      const currentItems = tempData?.allergies || [];
      if (!currentItems.includes(allergy)) {
        const updatedItems = [...currentItems, allergy];
        handleInputChange("allergies", updatedItems);
        await saveField("allergies", updatedItems);
        inputValue.value = "";
        console.log("Allergy added successfully:", allergy);
      }
    } catch (e) {
      console.error("Error adding allergy:", e);
      setAlertMessage("Failed to add allergy. Please try again.");
      setShowAlert(true);
    }
  };

  const addCondition = async () => {
    if (!conditionInputRef.current) return;

    const inputValue = await conditionInputRef.current.getInputElement();
    const condition = inputValue.value.trim();

    if (!condition) return;

    try {
      const currentItems = tempData?.conditions || [];
      if (!currentItems.includes(condition)) {
        const updatedItems = [...currentItems, condition];
        handleInputChange("conditions", updatedItems);
        await saveField("conditions", updatedItems);
        inputValue.value = "";
        console.log("Condition added successfully:", condition);
      }
    } catch (e) {
      console.error("Error adding condition:", e);
      setAlertMessage("Failed to add condition. Please try again.");
      setShowAlert(true);
    }
  };

  const addMedication = async () => {
    if (!medicationInputRef.current) return;

    const inputValue = await medicationInputRef.current.getInputElement();
    const medication = inputValue.value.trim();

    if (!medication) return;

    try {
      const currentItems = tempData?.medications || [];
      if (!currentItems.includes(medication)) {
        const updatedItems = [...currentItems, medication];
        handleInputChange("medications", updatedItems);
        await saveField("medications", updatedItems);
        inputValue.value = "";
        console.log("Medication added successfully:", medication);
      }
    } catch (e) {
      console.error("Error adding medication:", e);
      setAlertMessage("Failed to add medication. Please try again.");
      setShowAlert(true);
    }
  };

  const removeItem = async (
    field: "allergies" | "conditions" | "medications",
    index: number,
  ) => {
    if (!tempData) return;

    try {
      // Create a new array without the removed item
      const currentItems = tempData[field] || [];
      const updatedItems = [...currentItems];
      updatedItems.splice(index, 1);

      // Update local state
      handleInputChange(field, updatedItems);

      // Save to Firebase
      await saveField(field, updatedItems);

      console.log("Item removed successfully");
    } catch (e) {
      console.error("Error removing item:", e);
      setAlertMessage("Failed to remove item. Please try again.");
      setShowAlert(true);
    }
  };
  const history = useHistory();
  const handleLogout = async () => {
    // Close the dialog before awaiting: logout() notifies App's auth-state
    // listeners with `null`, which re-renders App onto the public routes and
    // unmounts this page. Anything after that point may never run, so the
    // navigation has to be queued before it, not after.
    setShowLogOutAlert(false);
    try {
      // Must be authService.logout(), not a bare signOut(auth). logout() is the
      // only path that calls clearCredentials(), and an explicit logout is
      // exactly the "forget me on this device" action — leaving the saved
      // PIN/biometric credential behind would let the next person at this
      // device one-tap into the previous patient's account.
      await authService.logout();
      // App's listener flips currentUser → null, which swaps the router to the
      // public routes. /patient/profile does not exist there, so without this
      // push the user lands on a blank screen instead of the sign-in page.
      history.push("/Patient_signin");
    } catch (error) {
      console.error("Error signing out:", error);
      setAlertMessage("Error signing out. Please try again.");
      setShowAlert(true);
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
        orderBy("date", "asc"),
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
        },
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

      // Build `_dateObj` from the booked slot (`time`) together with `date`.
      // Booking stores the doctor's picked slot in `time` ("09:00") while `date`
      // is a Timestamp whose clock time is an artefact of the date-only picker,
      // so reading the clock from `date` displayed the wrong time and could pick
      // the wrong row as "next".
      const mapped = appointments
        .map((a) => {
          const ms = appointmentMillis(a.date, a.time);
          return ms === null ? null : { ...a, _dateObj: new Date(ms) };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      // Only return a future appointment — if none exist, return null
      const future = mapped
        .filter((a) => a._dateObj.getTime() >= now.getTime())
        .sort((x, y) => x._dateObj.getTime() - y._dateObj.getTime());

      return future.length > 0 ? future[0] : null;
    } catch (error) {
      console.error("Error computing next appointment in Profile:", error);
      return null;
    }
  }, [appointments]);

  // Renders the *computed* instant, so the clock time shown is the doctor slot
  // the patient picked rather than the date-only picker's arbitrary time.
  const formatAppointmentDate = (dateObj?: Date | null) =>
    formatAppointmentWhen(
      dateObj ? dateObj.getTime() : null,
      language,
    );

  // Show loading while data is being fetched initially
  if (initialLoad) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <LoadingHelix />
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
        <IonToolbar className="patient-dashboard-toolbar toolbar-profile">
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

      <IonContent className="dashboard-patient profile-content">
        <div className="profile-shell">
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

          <MessageBox
            isOpen={showAlert}
            title={alertMessage.includes("Error") ? "Error" : "Success"}
            message={alertMessage}
            /* Mirrors the title's conditional so the icon and accent agree with
               the copy instead of contradicting it. */
            tone={alertMessage.includes("Error") ? "danger" : "success"}
            actions={[
              {
                label: "OK",
                color: "primary",
                onClick: () => setShowAlert(false),
              },
            ]}
            onDismiss={() => setShowAlert(false)}
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
                  {/* `avatarUrl` is the resolved value (any historical field name,
                      Storage paths resolved to a real download URL) rather than
                      `tempData.avatar`, which no write path used to populate.
                      `handleImageError` swaps in the bundled placeholder exactly
                      once if the URL is stale or the device is offline. */}
                  <img
                    src={avatarUrl}
                    alt="Patient Avatar"
                    onError={handleImageError}
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
                    onIonInput={(e) =>
                      handleInputChange("name", e.detail.value!)
                    }
                    className="profile-edit-input"
                  />
                ) : (
                  <IonText color="dark">
                    <h1 className="profile-name">
                      {patient.name || "Not set"}
                    </h1>
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
                          handleInputChange(
                            "age",
                            parseInt(e.detail.value!) || 0,
                          )
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
                            `/patient/book_appointment?appointmentId=${nextAppointment.id}`,
                          );
                        }
                      }}
                      style={{
                        cursor: nextAppointment ? "pointer" : "default",
                      }}
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
                    <IonIcon
                      slot="start"
                      icon={locationOutline}
                      color="medium"
                    />
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
                                e.detail.value!,
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
                                e.detail.value!,
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
                                e.detail.value!,
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
                                e.detail.value!,
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
                                e.detail.value!,
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
                    <IonIcon
                      slot="start"
                      icon={bandageOutline}
                      color="medium"
                    />
                    <IonLabel>
                      <h3>Allergies</h3>
                      {isEditing ? (
                        <div className="items-edit">
                          <IonInput
                            ref={allergyInputRef}
                            placeholder="Add an allergy"
                            onKeyPress={async (e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                await addAllergy();
                              }
                            }}
                            className="item-input"
                            onIonBlur={addAllergy}
                          />
                          <div className="item-chips">
                            {(tempData.allergies || []).map(
                              (allergy, index) => (
                                <IonChip key={index} color="warning">
                                  <IonLabel>{allergy}</IonLabel>
                                  <IonIcon
                                    icon={closeCircleOutline}
                                    onClick={() =>
                                      removeItem("allergies", index)
                                    }
                                  />
                                </IonChip>
                              ),
                            )}
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
                            ref={conditionInputRef}
                            placeholder="Add a condition"
                            onKeyPress={async (e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                await addCondition();
                              }
                            }}
                            className="item-input"
                            onIonBlur={addCondition}
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
                              ),
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
                            ref={medicationInputRef}
                            placeholder="Add a medication"
                            onKeyPress={async (e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                await addMedication();
                              }
                            }}
                            className="item-input"
                            onIonBlur={addMedication}
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
                              ),
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
                <IonButton
                  color="primary"
                  className="profile-save-btn"
                  onClick={saveChanges}
                >
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
              expand="block"
              color="danger"
              fill="outline"
              onClick={() => setShowLogOutAlert(true)}
              disabled={isLoading}
            >
              <IonIcon slot="start" icon={logOutOutline} />
              Log Out
            </IonButton>
          </motion.div>
        </div>
      </IonContent>
      <MessageBox
        isOpen={showLogOutAlert}
        title="Log Out"
        message="Are you sure you want to Log out?"
        tone="info"
        actions={[
          {
            label: "Cancel",
            color: "medium",
            onClick: () => setShowLogOutAlert(false),
          },
          {
            label: "Yes, Log out",
            color: "danger",
            onClick: handleLogout,
          },
        ]}
        onDismiss={() => setShowLogOutAlert(false)}
      />
    </IonPage>
  );
};

export default Profile;
