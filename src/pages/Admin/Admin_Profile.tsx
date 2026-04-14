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
          <IonTitle>Profile</IonTitle>
          <IonButtons slot="end">
            {!isEditing ? (
              <IonButton onClick={() => setIsEditing(true)}>
                <IonIcon slot="icon-only" icon={pencilOutline} />
              </IonButton>
            ) : (
              <IonButton onClick={cancelEditing} color="danger">Cancel</IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="profile-content">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: "none" }} />
        <IonLoading isOpen={isLoading} message="Saving..." />

        {/* Modals */}
        <IonModal isOpen={showReauthModal} onDidDismiss={closeReauthModal}>
          <IonHeader><IonToolbar>
            <IonTitle>{fieldToUpdate === "email" ? "Update Email" : "Verify Identity"}</IonTitle>
            <IonButtons slot="end"><IonButton onClick={closeReauthModal}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
          </IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <p style={{ color: "var(--ion-color-medium)", marginBottom: 16, fontSize: "0.9rem" }}>
              {fieldToUpdate === "email" ? "Enter your current password to update email." : "Enter your current password to continue."}
            </p>
            <IonItem><IonLabel position="stacked">Current Password</IonLabel>
              <IonInput type="password" value={reauthPassword} onIonInput={(e) => setReauthPassword(e.detail.value!)} clearOnEdit={false} />
            </IonItem>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <IonButton expand="block" color="primary" onClick={handleReauthSubmit} disabled={!reauthPassword || isLoading}>
                {isLoading ? "Verifying..." : "Confirm"}
              </IonButton>
              <IonButton expand="block" fill="outline" color="medium" onClick={closeReauthModal}>Cancel</IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showStatModal} onDidDismiss={cancelStatEdit}>
          <IonHeader><IonToolbar>
            <IonTitle>Edit {editingStat === "staffCount" ? "Staff" : editingStat === "patientCount" ? "Patients" : "Experience"}</IonTitle>
            <IonButtons slot="end"><IonButton onClick={cancelStatEdit}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
          </IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <IonItem><IonLabel position="stacked">Value</IonLabel>
              <IonInput type="number" value={tempStatValue} onIonInput={(e) => setTempStatValue(e.detail.value!)} min="0" clearOnEdit={false} />
            </IonItem>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <IonButton expand="block" color="primary" onClick={saveStatEdit} disabled={!tempStatValue || isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </IonButton>
              <IonButton expand="block" fill="outline" color="medium" onClick={cancelStatEdit}>Cancel</IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast isOpen={toast.isOpen} onDidDismiss={() => setToast({ ...toast, isOpen: false })}
          message={toast.message} duration={3000} color={toast.color as any} position="top" />

        {/* Hero Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="profile-hero">
            <motion.div className="avatar-container" whileHover={{ scale: isEditing ? 1.05 : 1 }}
              whileTap={{ scale: isEditing ? 0.95 : 1 }} onClick={isEditing ? triggerFileInput : undefined}>
              <IonAvatar className="profile-avatar">
                <img src={admin.avatar || "https://ionicframework.com/docs/img/demos/avatar.svg"} alt="Avatar" />
              </IonAvatar>
              {isEditing && (
                <div className="avatar-overlay"><IonIcon icon={cameraOutline} color="light" size="large" /></div>
              )}
            </motion.div>

            {isEditing ? (
              <IonInput value={tempData.name || ""} placeholder="Full Name"
                onIonInput={(e) => handleInputChange("name", e.detail.value!)}
                style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: 700 }} />
            ) : (
              <h1 className="profile-name">{admin.name}</h1>
            )}

            <div className="profile-role">
              <IonIcon icon={shieldCheckmarkOutline} />
              <span>{admin.role || "Administrator"}</span>
            </div>

            <div className="profile-stats">
              {[
                { key: "staffCount", label: "Staff", value: admin.staffCount, icon: peopleOutline },
                { key: "patientCount", label: "Patients", value: admin.patientCount, icon: medicalOutline },
                { key: "experienceYears", label: "Exp. (yrs)", value: admin.experienceYears, icon: timeOutline },
              ].map((s) => (
                <motion.div key={s.key} className="stat-item"
                  whileHover={{ scale: isEditing ? 1.05 : 1 }}
                  onClick={isEditing ? () => startEditingStat(s.key, s.value) : undefined}
                  style={{ cursor: isEditing ? "pointer" : "default" }}>
                  <span className="stat-value">{s.value}{s.key === "experienceYears" ? "y" : ""}</span>
                  <span className="stat-label">{s.label}</span>
                  {isEditing && <IonIcon icon={pencilOutline} className="stat-edit-icon" />}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Details */}
        <div className="profile-details-section">
          <p className="profile-section-title">Contact Information</p>
          <div className="profile-details">
            <IonList lines="full" className="ion-no-padding">
              {[
                { icon: mailOutline, label: "Email", field: "email" as const, type: "email" },
                { icon: callOutline, label: "Phone", field: "phone" as const, type: "tel" },
                { icon: locationOutline, label: "Address", field: "address" as const, type: "text" },
                { icon: locationOutline, label: "Town/City", field: "town" as const, type: "text" },
              ].map(({ icon, label, field, type }) => (
                <IonItem key={field}>
                  <IonIcon slot="start" icon={icon} color="primary" />
                  {isEditing ? (
                    <IonInput type={type as any} value={(tempData as any)[field] || ""} placeholder={label}
                      onIonInput={(e) => handleInputChange(field, e.detail.value!)} />
                  ) : (
                    <IonLabel><h3>{label}</h3><p>{(admin as any)[field] || "—"}</p></IonLabel>
                  )}
                </IonItem>
              ))}

              <IonItem button onClick={() => { setFieldToUpdate("password"); setShowReauthModal(true); }}>
                <IonIcon slot="start" icon={lockClosedOutline} color="primary" />
                <IonLabel><h3>Password</h3><p>••••••••</p></IonLabel>
                <IonIcon slot="end" icon={pencilOutline} color="medium" />
              </IonItem>

              <IonItem>
                <IonIcon slot="start" icon={calendarOutline} color="primary" />
                <IonLabel><h3>Member Since</h3><p>{admin.createdAt}</p></IonLabel>
              </IonItem>
            </IonList>
          </div>

          <AnimatePresence>
            {isEditing && (
              <motion.div className="edit-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <IonButton expand="block" color="primary" onClick={saveChanges} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </IonButton>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="profile-actions">
            <IonButton expand="block" color="danger" fill="outline" onClick={handleLogout} disabled={isLoading}>
              <IonIcon slot="start" icon={logOutOutline} />
              Log Out
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Admin_Profile;
