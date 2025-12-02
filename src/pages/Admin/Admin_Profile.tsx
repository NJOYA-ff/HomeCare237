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
  IonToast,
  IonInput,
  IonModal,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
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
  peopleOutline,
  medicalOutline,
  timeOutline,
  closeOutline,
} from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  updateProfile,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, auth, storage } from "../../firebaseconfig";
import "./Admin.scss";
import { authService, UserRole } from "../../App";
import { useHistory } from "react-router";
interface AdminData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  role: string;
  avatar: string;
  userName: string;
  town: string;
  street: string;
  age?: number;
  sex?: string;
  updatedAt?: Timestamp;
  // New stats fields
  staffCount: number;
  patientCount: number;
  experienceYears: number;
}

const Admin_Profile: React.FC = () => {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [tempData, setTempData] = useState<Partial<AdminData>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    color: "success",
  });
  const [fieldToUpdate, setFieldToUpdate] = useState<string>("");
  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [tempStatValue, setTempStatValue] = useState<string>("");
  const [showStatModal, setShowStatModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format Firebase Timestamp to readable date
  const formatFirebaseTimestamp = (timestamp: Timestamp | string): string => {
    if (typeof timestamp === "string") {
      return timestamp;
    }

    if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
      try {
        const date = timestamp.toDate();
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch (error) {
        console.error("Error formatting timestamp:", error);
        return "Unknown date";
      }
    }

    return "Unknown date";
  };

  // Process admin data after fetching from Firestore
  const processAdminData = (data: any): AdminData => {
    // Format createdAt to string
    const formattedCreatedAt = data.createdAt
      ? formatFirebaseTimestamp(data.createdAt)
      : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    return {
      ...data,
      createdAt: formattedCreatedAt,
      // Initialize stats with default values if they don't exist
      staffCount: data.staffCount || 0,
      patientCount: data.patientCount || 0,
      experienceYears: data.experienceYears || 0,
    };
  };

  // Fetch admin data from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const adminRef = doc(db, "admins", user.uid);

    const unsubscribe = onSnapshot(
      adminRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const adminData = docSnap.data() as any;
          const processedData = processAdminData(adminData);
          setAdmin(processedData);
          setTempData(processedData);
        } else {
          console.log("No admin data found");
        }
      },
      (error) => {
        console.error("Error fetching admin data:", error);
        showToast("Error loading profile data", "danger");
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (message: string, color: string = "success") => {
    setToast({ isOpen: true, message, color });
  };

  // Reauthenticate user for sensitive operations
  const reauthenticate = async (password: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user || !user.email) return false;

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      console.error("Reauthentication failed:", error);
      return false;
    }
  };

  const handleInputChange = (field: keyof AdminData, value: string) => {
    setTempData({
      ...tempData,
      [field]: value,
    });
  };

  // Handle stat value change
  const handleStatChange = (field: keyof AdminData, value: string) => {
    // Convert to number for stats fields
    const numValue =
      field === "experienceYears" ? parseFloat(value) : parseInt(value);
    setTempData({
      ...tempData,
      [field]: isNaN(numValue) ? 0 : numValue,
    });
  };

  // Start editing a stat
  const startEditingStat = (stat: string, currentValue: number) => {
    setEditingStat(stat);
    setTempStatValue(currentValue.toString());
    setShowStatModal(true);
  };

  // Save stat edit
  const saveStatEdit = async () => {
    if (!admin || !editingStat) return;

    const numValue =
      editingStat === "experienceYears"
        ? parseFloat(tempStatValue)
        : parseInt(tempStatValue);

    if (isNaN(numValue) || numValue < 0) {
      showToast("Please enter a valid number", "danger");
      return;
    }

    setIsLoading(true);

    try {
      await updateDoc(doc(db, "admins", admin.uid), {
        [editingStat]: numValue,
        updatedAt: Timestamp.now(),
      });

      showToast("Stat updated successfully");
      setEditingStat(null);
      setTempStatValue("");
      setShowStatModal(false);
    } catch (error) {
      console.error("Error updating stat:", error);
      showToast("Error updating stat", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel stat editing
  const cancelStatEdit = () => {
    setEditingStat(null);
    setTempStatValue("");
    setShowStatModal(false);
  };

  // Upload avatar to Firebase Storage
  const uploadAvatar = async (file: File): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Delete old avatar if exists
    if (admin?.avatar && admin.avatar.startsWith("https://")) {
      try {
        const oldAvatarRef = ref(storage, `admin-profiles/${user.uid}/avatar`);
        await deleteObject(oldAvatarRef);
      } catch (error) {
        console.log("No old avatar to delete or error deleting:", error);
      }
    }

    // Upload new avatar
    const avatarRef = ref(storage, `admin-profiles/${user.uid}/avatar`);
    const snapshot = await uploadBytes(avatarRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !admin) return;

    // Validate file
    if (!file.type.match("image.*")) {
      showToast("Please select an image file", "danger");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "danger");
      return;
    }

    setIsLoading(true);

    try {
      const avatarURL = await uploadAvatar(file);

      // Update Firestore
      await updateDoc(doc(db, "admins", admin.uid), {
        avatar: avatarURL,
        updatedAt: Timestamp.now(),
      });

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser!, {
        photoURL: avatarURL,
      });

      showToast("Profile picture updated successfully");
    } catch (error) {
      console.error("Error updating avatar:", error);
      showToast("Error updating profile picture", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!admin) return;

    setIsLoading(true);

    try {
      const updates: Partial<AdminData> = {};
      const authUpdates: any = {};

      // Check what fields changed
      if (tempData.name !== admin.name) {
        updates.name = tempData.name!;
        authUpdates.displayName = tempData.name;
      }

      if (tempData.email !== admin.email) {
        setFieldToUpdate("email");
        setShowReauthModal(true);
        return;
      }

      if (tempData.phone !== admin.phone) {
        updates.phone = tempData.phone!;
      }

      if (tempData.address !== admin.address) {
        updates.address = tempData.address!;
      }

      if (tempData.town !== admin.town) {
        updates.town = tempData.town!;
      }

      if (tempData.street !== admin.street) {
        updates.street = tempData.street!;
      }

      // Update stats if changed
      if (
        tempData.staffCount !== undefined &&
        tempData.staffCount !== admin.staffCount
      ) {
        updates.staffCount = tempData.staffCount;
      }

      if (
        tempData.patientCount !== undefined &&
        tempData.patientCount !== admin.patientCount
      ) {
        updates.patientCount = tempData.patientCount;
      }

      if (
        tempData.experienceYears !== undefined &&
        tempData.experienceYears !== admin.experienceYears
      ) {
        updates.experienceYears = tempData.experienceYears;
      }

      // Update Firestore
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "admins", admin.uid), {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      }

      // Update Firebase Auth (except email which requires reauth)
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser!, authUpdates);
      }

      showToast("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Error updating profile", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauthAndUpdate = async () => {
    if (!admin || !reauthPassword) return;

    setIsLoading(true);

    try {
      const isAuthenticated = await reauthenticate(reauthPassword);
      if (!isAuthenticated) {
        showToast("Incorrect password", "danger");
        return;
      }

      if (fieldToUpdate === "email" && tempData.email) {
        // Update email in Firebase Auth
        await updateEmail(auth.currentUser!, tempData.email);

        // Update email in Firestore
        await updateDoc(doc(db, "admins", admin.uid), {
          email: tempData.email,
          updatedAt: Timestamp.now(),
        });
      }

      showToast("Profile updated successfully");
      setIsEditing(false);
      setShowReauthModal(false);
      setReauthPassword("");
      setFieldToUpdate("");
    } catch (error: any) {
      console.error("Error updating email:", error);
      if (error.code === "auth/email-already-in-use") {
        showToast("Email is already in use", "danger");
      } else {
        showToast("Error updating email", "danger");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updatePasswordHandler = async () => {
    if (!reauthPassword) {
      showToast("Please enter your current password", "danger");
      return;
    }

    setIsLoading(true);

    try {
      const isAuthenticated = await reauthenticate(reauthPassword);
      if (!isAuthenticated) {
        showToast("Incorrect password", "danger");
        return;
      }

      const newPassword = prompt("Enter new password (minimum 8 characters):");
      if (newPassword && newPassword.length >= 8) {
        await updatePassword(auth.currentUser!, newPassword);
        showToast("Password updated successfully");
      } else if (newPassword) {
        showToast("Password must be at least 8 characters", "danger");
        return;
      } else {
        setShowReauthModal(false);
        setReauthPassword("");
        setIsLoading(false);
        return;
      }

      setShowReauthModal(false);
      setReauthPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === "auth/weak-password") {
        showToast("Password is too weak", "danger");
      } else {
        showToast("Error updating password", "danger");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauthSubmit = () => {
    if (fieldToUpdate === "email") {
      handleReauthAndUpdate();
    } else {
      updatePasswordHandler();
    }
  };
  const history = useHistory();
  const handleLogout = async () => {
    try {
      await authService.logout();
      history.push("/Doctor_signin");
    } catch (error) {
      console.error("Error signing out:", error);
      showToast("Error signing out", "danger");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const cancelEditing = () => {
    setTempData(admin || {});
    setIsEditing(false);
    setEditingStat(null);
    setTempStatValue("");
    setShowStatModal(false);
    setShowReauthModal(false);
  };

  const closeReauthModal = () => {
    setShowReauthModal(false);
    setReauthPassword("");
    setFieldToUpdate("");
  };

  if (!admin) {
    return (
      <IonPage>
        <IonContent>
          <IonLoading isOpen={true} message="Loading profile..." />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="toolbar-profile">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="profile-title">Admin Profile</IonTitle>
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
        <IonLoading isOpen={isLoading} message="Saving changes..." />

        {/* Reauthentication Modal */}
        <IonModal isOpen={showReauthModal} onDidDismiss={closeReauthModal}>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="ion-text-center">
                {fieldToUpdate === "email"
                  ? "Update Email"
                  : "Security Verification"}
                <IonButton
                  fill="clear"
                  color="medium"
                  onClick={closeReauthModal}
                  style={{ position: "absolute", right: "8px", top: "8px" }}
                >
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="ion-text-center ion-margin-bottom">
                {fieldToUpdate === "email"
                  ? "Please enter your current password to update your email address."
                  : "Please enter your current password to continue."}
              </p>

              <IonItem>
                <IonLabel position="stacked">Current Password</IonLabel>
                <IonInput
                  type="password"
                  value={reauthPassword}
                  placeholder="Enter your current password"
                  onIonInput={(e) => setReauthPassword(e.detail.value!)}
                  clearOnEdit={false}
                />
              </IonItem>

              <div className="ion-margin-top">
                <IonButton
                  expand="block"
                  color="primary"
                  onClick={handleReauthSubmit}
                  disabled={!reauthPassword || isLoading}
                >
                  {isLoading ? "Verifying..." : "Confirm"}
                </IonButton>
                <IonButton
                  expand="block"
                  color="medium"
                  fill="outline"
                  onClick={closeReauthModal}
                  disabled={isLoading}
                >
                  Cancel
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </IonModal>

        {/* Stat Editing Modal */}
        <IonModal isOpen={showStatModal} onDidDismiss={cancelStatEdit}>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle className="ion-text-center">
                Edit{" "}
                {editingStat === "staffCount"
                  ? "Staff Count"
                  : editingStat === "patientCount"
                  ? "Patient Count"
                  : "Experience Years"}
                <IonButton
                  fill="clear"
                  color="medium"
                  onClick={cancelStatEdit}
                  style={{ position: "absolute", right: "8px", top: "8px" }}
                >
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked">
                  {editingStat === "staffCount"
                    ? "Number of Staff"
                    : editingStat === "patientCount"
                    ? "Number of Patients"
                    : "Years of Experience"}
                </IonLabel>
                <IonInput
                  type="number"
                  value={tempStatValue}
                  placeholder={`Enter ${
                    editingStat === "experienceYears" ? "years" : "count"
                  }`}
                  onIonInput={(e) => setTempStatValue(e.detail.value!)}
                  min={editingStat === "experienceYears" ? "0" : "0"}
                  clearOnEdit={false}
                />
              </IonItem>

              <div className="ion-margin-top">
                <IonButton
                  expand="block"
                  color="primary"
                  onClick={saveStatEdit}
                  disabled={!tempStatValue || isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </IonButton>
                <IonButton
                  expand="block"
                  color="medium"
                  fill="outline"
                  onClick={cancelStatEdit}
                  disabled={isLoading}
                >
                  Cancel
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </IonModal>

        {/* Toast for notifications */}
        <IonToast
          isOpen={toast.isOpen}
          onDidDismiss={() => setToast({ ...toast, isOpen: false })}
          message={toast.message}
          duration={3000}
          color={toast.color as any}
          position="top"
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
              onClick={isEditing ? triggerFileInput : undefined}
            >
              <IonAvatar className="profile-avatar">
                <img
                  src={
                    admin.avatar ||
                    "https://ionicframework.com/docs/img/demos/avatar.svg"
                  }
                  alt="Admin Avatar"
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
                <IonItem>
                  <IonInput
                    value={tempData.name || ""}
                    placeholder="Full Name"
                    onIonInput={(e) =>
                      handleInputChange("name", e.detail.value!)
                    }
                    className="profile-edit-input"
                  />
                </IonItem>
              ) : (
                <IonText color="dark">
                  <h1 className="profile-name">{admin.name}</h1>
                </IonText>
              )}

              <div className="profile-role">
                <IonIcon icon={shieldCheckmarkOutline} color="primary" />
                <span>{admin.role || "Administrator"}</span>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="profile-stats"
              >
                <motion.div
                  className="stat-item"
                  whileHover={{ scale: isEditing ? 1.05 : 1 }}
                  whileTap={{ scale: isEditing ? 0.95 : 1 }}
                  onClick={
                    isEditing
                      ? () => startEditingStat("staffCount", admin.staffCount)
                      : undefined
                  }
                >
                  <IonIcon icon={peopleOutline} className="stat-icon" />
                  <span className="stat-value">{admin.staffCount}</span>
                  <span className="stat-label">Staff</span>
                  {isEditing && (
                    <IonIcon icon={pencilOutline} className="stat-edit-icon" />
                  )}
                </motion.div>

                <motion.div
                  className="stat-item"
                  whileHover={{ scale: isEditing ? 1.05 : 1 }}
                  whileTap={{ scale: isEditing ? 0.95 : 1 }}
                  onClick={
                    isEditing
                      ? () =>
                          startEditingStat("patientCount", admin.patientCount)
                      : undefined
                  }
                >
                  <IonIcon icon={medicalOutline} className="stat-icon" />
                  <span className="stat-value">{admin.patientCount}</span>
                  <span className="stat-label">Patients</span>
                  {isEditing && (
                    <IonIcon icon={pencilOutline} className="stat-edit-icon" />
                  )}
                </motion.div>

                <motion.div
                  className="stat-item"
                  whileHover={{ scale: isEditing ? 1.05 : 1 }}
                  whileTap={{ scale: isEditing ? 0.95 : 1 }}
                  onClick={
                    isEditing
                      ? () =>
                          startEditingStat(
                            "experienceYears",
                            admin.experienceYears
                          )
                      : undefined
                  }
                >
                  <IonIcon icon={timeOutline} className="stat-icon" />
                  <span className="stat-value">{admin.experienceYears}y</span>
                  <span className="stat-label">Experience</span>
                  {isEditing && (
                    <IonIcon icon={pencilOutline} className="stat-edit-icon" />
                  )}
                </motion.div>
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
              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem>
                  <IonIcon slot="start" icon={mailOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="email"
                      value={tempData.email || ""}
                      placeholder="Email Address"
                      onIonInput={(e) =>
                        handleInputChange("email", e.detail.value!)
                      }
                      className="profile-edit-input"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Email</h3>
                      <p>{admin.email}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem
                  button
                  onClick={() => {
                    setFieldToUpdate("password");
                    setShowReauthModal(true);
                  }}
                >
                  <IonIcon
                    slot="start"
                    icon={lockClosedOutline}
                    color="medium"
                  />
                  <IonLabel>
                    <h3>Password</h3>
                    <p>••••••••</p>
                  </IonLabel>
                  {isEditing && <IonIcon slot="end" icon={pencilOutline} />}
                </IonItem>
              </motion.div>

              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem>
                  <IonIcon slot="start" icon={callOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="tel"
                      value={tempData.phone || ""}
                      placeholder="Phone Number"
                      onIonInput={(e) =>
                        handleInputChange("phone", e.detail.value!)
                      }
                      className="profile-edit-input"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Phone</h3>
                      <p>{admin.phone}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem>
                  <IonIcon slot="start" icon={locationOutline} color="medium" />
                  {isEditing ? (
                    <IonInput
                      type="text"
                      value={tempData.address || ""}
                      placeholder="Address"
                      onIonInput={(e) =>
                        handleInputChange("address", e.detail.value!)
                      }
                      className="profile-edit-input"
                    />
                  ) : (
                    <IonLabel>
                      <h3>Address</h3>
                      <p>{admin.address}</p>
                    </IonLabel>
                  )}
                </IonItem>
              </motion.div>

              {admin.town && (
                <motion.div whileHover={{ scale: 1.01 }}>
                  <IonItem>
                    <IonIcon
                      slot="start"
                      icon={locationOutline}
                      color="medium"
                    />
                    {isEditing ? (
                      <IonInput
                        type="text"
                        value={tempData.town || ""}
                        placeholder="Town/City"
                        onIonInput={(e) =>
                          handleInputChange("town", e.detail.value!)
                        }
                        className="profile-edit-input"
                      />
                    ) : (
                      <IonLabel>
                        <h3>Town/City</h3>
                        <p>{admin.town}</p>
                      </IonLabel>
                    )}
                  </IonItem>
                </motion.div>
              )}

              <motion.div whileHover={{ scale: 1.01 }}>
                <IonItem>
                  <IonIcon slot="start" icon={calendarOutline} color="medium" />
                  <IonLabel>
                    <h3>Member Since</h3>
                    <p>{admin.createdAt}</p>
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
                onClick={saveChanges}
                disabled={isLoading}
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
            color="danger"
            fill="outline"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <IonIcon slot="start" icon={logOutOutline} />
            Log Out
          </IonButton>
        </motion.div>
      </IonContent>
    </IonPage>
  );
};

export default Admin_Profile;
