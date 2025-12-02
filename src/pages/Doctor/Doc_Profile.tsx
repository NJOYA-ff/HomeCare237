import React, { useState, useRef, useEffect } from "react";
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
  IonToggle,
} from "@ionic/react";
import {
  mailOutline,
  callOutline,
  locationOutline,
  settingsOutline,
  logOutOutline,
  notificationsOutline,
  calendarOutline,
  shieldCheckmarkOutline,
  cameraOutline,
  pencilOutline,
  lockClosedOutline,
  starOutline,
  schoolOutline,
  languageOutline,
  timeOutline,
  cashOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  documentTextOutline,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  DocumentReference,
  DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { db, auth, storage } from "../../firebaseconfig";
import { authService, UserRole } from "../../App";
import "./Doctor.scss";
import { useHistory } from "react-router";

interface DoctorData {
  name: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
  joinDate: string;
  notifications: number;
  specialization: string;
  avatar: string;
  bio: string;
  experience: number;
  rating: number;
  consultationFee: number;
  languages: string[];
  education: string;
  licenseNumber: string;
  availableHours: string;
  isAvailable: boolean;
  uid?: string;
}

const defaultDoctorData: DoctorData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  joinDate: new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  notifications: 0,
  specialization: "",
  avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
  bio: "",
  experience: 0,
  rating: 0,
  consultationFee: 0,
  languages: [],
  education: "",
  licenseNumber: "",
  availableHours: "",
  isAvailable: true,
};

const Doc_profile: React.FC = () => {
  const [doctor, setDoctor] = useState<DoctorData>(defaultDoctorData);
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState<DoctorData>(defaultDoctorData);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadDoctorData(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadDoctorData = async (uid: string) => {
    try {
      setLoading(true);
      const doctorRef = doc(db, "doctors", uid);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data() as DoctorData;
        setDoctor((prev) => ({
          ...defaultDoctorData,
          ...doctorData,
          uid,
        }));
        setTempData((prev) => ({
          ...defaultDoctorData,
          ...doctorData,
          uid,
        }));
      } else {
        // Create initial doctor document with default data
        const initialData: DoctorData = {
          ...defaultDoctorData,
          uid,
          email: currentUser?.email || "",
          name: currentUser?.displayName || "",
          joinDate: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };

        await setDoc(doctorRef, initialData);
        setDoctor(initialData);
        setTempData(initialData);
      }
    } catch (error) {
      console.error("Error loading doctor data:", error);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof DoctorData,
    value: string | number | boolean | string[]
  ) => {
    setTempData({
      ...tempData,
      [field]: value,
    });
  };

  const saveChanges = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const doctorRef = doc(db, "doctors", currentUser.uid);

      // Prepare update data (exclude uid from being saved in Firestore)
      const { uid, password, ...updateData } = tempData;

      await updateDoc(doctorRef, updateData);

      setDoctor(tempData);
      setIsEditing(false);
      setShowAlert(true);
    } catch (error) {
      console.error("Error saving doctor data:", error);
      alert("Error saving changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEditing = () => {
    setTempData(doctor);
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      setShowAvatarOptions(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.match("image.*")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      setIsLoading(true);

      // Upload to Firebase Storage
      const storageRef = ref(storage, `doctors/${currentUser.uid}/avatar`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update temp data with new avatar URL
      setTempData({
        ...tempData,
        avatar: downloadURL,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = () => {
    // Camera functionality would be implemented here
    alert("Camera functionality would be implemented here");
    setShowAvatarOptions(false);
  };

  const selectFromGallery = () => {
    fileInputRef.current?.click();
    setShowAvatarOptions(false);
  };

  const addLanguage = (lang: string) => {
    if (lang && !tempData.languages.includes(lang)) {
      handleInputChange("languages", [...tempData.languages, lang]);
    }
  };

  const removeLanguage = (index: number) => {
    const updatedLanguages = [...tempData.languages];
    updatedLanguages.splice(index, 1);
    handleInputChange("languages", updatedLanguages);
  };
  const history = useHistory();
  const handleLogout = async () => {
    try {
      await authService.logout();
      history.push("/Doctor_signin");
      // Redirect to login page or handle logout
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <IonLoading
            isOpen={loading}
            message="Loading profile..."
            spinner="circles"
          />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="toolbar-profile">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle className="profile-title">Doctor Profile</IonTitle>
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
          message={isEditing ? "Saving changes..." : "Uploading image..."}
          spinner="circles"
        />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={"Profile Updated"}
          message={"Your profile has been successfully updated."}
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
              onClick={selectFromGallery}
            >
              <IonAvatar className="profile-avatar">
                <img
                  src={tempData.avatar || defaultDoctorData.avatar}
                  alt="Doctor Avatar"
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
                  placeholder="Enter your name"
                />
              ) : (
                <IonText color="dark">
                  <h1 className="profile-name">
                    {doctor.name || "Dr. Unknown"}
                  </h1>
                </IonText>
              )}

              <div className="profile-specialty">
                <IonIcon icon={shieldCheckmarkOutline} color="primary" />
                {isEditing ? (
                  <IonInput
                    value={tempData.specialization}
                    onIonInput={(e) =>
                      handleInputChange("specialization", e.detail.value!)
                    }
                    className="profile-edit-input"
                    placeholder="Enter your specialty"
                  />
                ) : (
                  <span>{doctor.specialization || "Specialty not set"}</span>
                )}
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="profile-stats"
              >
                <div className="stat-item">
                  <IonIcon icon={starOutline} color="warning" />
                  <span className="stat-value">{doctor.rating || 0}</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="stat-item">
                  <IonIcon icon={calendarOutline} color="primary" />
                  <span className="stat-value">{doctor.experience || 0}y</span>
                  <span className="stat-label">Experience</span>
                </div>
                <div className="stat-item">
                  <IonIcon icon={cashOutline} color="success" />
                  <span className="stat-value">
                    {(doctor.consultationFee || 0).toLocaleString()} XAF
                  </span>
                  <span className="stat-label">Fee</span>
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
              {/* Email Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={mailOutline} color="medium" />
                  <IonLabel>
                    <h3>Email</h3>
                    <p>{doctor.email || "No email set"}</p>
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Phone Field */}
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
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Phone</h3>
                      <p>{doctor.phone || "No phone number set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Address Field */}
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
                      placeholder="Enter address"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Address</h3>
                      <p>{doctor.address || "No address set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Consultation Fee Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={cashOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="number"
                      value={tempData.consultationFee}
                      onIonInput={(e) =>
                        handleInputChange(
                          "consultationFee",
                          parseInt(e.detail.value!) || 0
                        )
                      }
                      className="profile-edit-input"
                      placeholder="Enter consultation fee"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Consultation Fee</h3>
                      <p>
                        {(doctor.consultationFee || 0).toLocaleString()} XAF
                      </p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Education Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={schoolOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="text"
                      value={tempData.education}
                      onIonInput={(e) =>
                        handleInputChange("education", e.detail.value!)
                      }
                      className="profile-edit-input"
                      placeholder="Enter education"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Education</h3>
                      <p>{doctor.education || "No education set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* License Number Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon
                    slot="start"
                    icon={shieldCheckmarkOutline}
                    color="medium"
                  />
                  {isEditing ? (
                    <IonInput
                      type="text"
                      value={tempData.licenseNumber}
                      onIonInput={(e) =>
                        handleInputChange("licenseNumber", e.detail.value!)
                      }
                      className="profile-edit-input"
                      placeholder="Enter license number"
                    />
                  ) : (
                    <IonLabel>
                      <h3>License Number</h3>
                      <p>{doctor.licenseNumber || "No license number set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Available Hours Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={timeOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="text"
                      value={tempData.availableHours}
                      onIonInput={(e) =>
                        handleInputChange("availableHours", e.detail.value!)
                      }
                      className="profile-edit-input"
                      placeholder="Enter available hours"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Available Hours</h3>
                      <p>{doctor.availableHours || "No available hours set"}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {/* Languages Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={languageOutline} color="medium" />
                  <IonLabel>
                    <h3>Languages</h3>
                    {isEditing ? (
                      <div className="languages-edit">
                        <IonInput
                          placeholder="Add a language"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              addLanguage((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="language-input"
                        />
                        <div className="language-chips">
                          {tempData.languages.map((lang, index) => (
                            <IonChip key={index} color="primary">
                              <IonLabel>{lang}</IonLabel>
                              <IonIcon
                                icon={closeCircleOutline}
                                onClick={() => removeLanguage(index)}
                              />
                            </IonChip>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p>
                        {doctor.languages.length > 0
                          ? doctor.languages.join(", ")
                          : "No languages set"}
                      </p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Bio Field */}
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
                        placeholder="Enter your bio"
                      />
                    ) : (
                      <p>{doctor.bio || "No bio set"}</p>
                    )}
                  </IonLabel>
                </IonItem>
              </motion.div>

              {/* Availability Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon
                    slot="start"
                    icon={checkmarkCircleOutline}
                    color="medium"
                  />
                  <IonLabel>
                    <h3>Availability</h3>
                    <p>
                      {doctor.isAvailable
                        ? "Available for consultations"
                        : "Not available"}
                    </p>
                  </IonLabel>
                  {isEditing && (
                    <IonToggle
                      checked={tempData.isAvailable}
                      onIonChange={(e) =>
                        handleInputChange("isAvailable", e.detail.checked)
                      }
                      slot="end"
                    />
                  )}
                </IonItem>
              </motion.div>

              {/* Member Since Field */}
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem className="profile-d-item">
                  <IonIcon slot="start" icon={calendarOutline} color="medium" />
                  <IonLabel>
                    <h3>Member Since</h3>
                    <p>{doctor.joinDate}</p>
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
          <IonButton color="danger" fill="outline" onClick={handleLogout}>
            <IonIcon slot="start" icon={logOutOutline} />
            Log Out
          </IonButton>
        </motion.div>
      </IonContent>
    </IonPage>
  );
};

export default Doc_profile;
