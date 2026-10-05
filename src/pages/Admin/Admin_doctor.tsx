import React, { useState, useEffect } from "react";
import LoadingHelix from "../../components/LoadingHelix";
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
  IonBadge,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonFab,
  IonFabButton,
  IonInput,
  IonDatetime,
  IonTextarea,
  useIonToast,
  IonModal,
  IonImg,
  IonSegment,
  IonSegmentButton,
  IonText,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";

import "./Admin3.scss";
import {
  checkmark,
  informationCircle,
  personAdd,
  medical,
  add,
  school,
  star,
  create,
  trash,
  call,
  close,
  shield,
  logIn,
  mail,
  location,
  calendar,
  shieldCheckmarkOutline,
} from "ionicons/icons";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { db, auth } from "../../firebaseconfig";

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  specialization: string;
  yearsOfExperience: number;
  status: "active" | "on leave" | "inactive";
  licenseNumber: string;
  lastActive?: string;
  avatar?: string;
  rating?: number;
  role: string;
  uid?: string; // Firebase Auth UID
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin";
  status: "active" | "inactive";
  avatar: string;
  uid?: string; // Firebase Auth UID
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface AuthForm {
  email: string;
  password: string;
  confirmPassword?: string;
}

const Admin_doctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<string | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [presentToast] = useIonToast();
  const [modalMode, setModalMode] = useState<"doctor" | "admin">("doctor");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [doctorForm, setDoctorForm] = useState<
    Omit<
      Doctor,
      | "id"
      | "avatar"
      | "lastActive"
      | "rating"
      | "uid"
      | "createdAt"
      | "updatedAt"
    >
  >({
    name: "",
    email: "",
    phone: "",
    address: "",
    dob: new Date().toISOString(),
    specialization: "General Practitioner",
    yearsOfExperience: 0,
    status: "active",
    role: "doctor",
    licenseNumber: "",
  });

  const [adminForm, setAdminForm] = useState<
    Omit<Admin, "id" | "avatar" | "uid" | "createdAt" | "updatedAt">
  >({
    name: "",
    email: "",
    phone: "",
    role: "admin",
    status: "active",
  });

  const [authForm, setAuthForm] = useState<AuthForm>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Firebase collection references
  const doctorsCollection = collection(db, "doctors");
  const adminsCollection = collection(db, "admins");

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load doctors from Firebase
  useEffect(() => {
    setLoading(true);

    const q = query(doctorsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const doctorsData: Doctor[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          doctorsData.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            dob: data.dob,
            specialization: data.specialization,
            yearsOfExperience: data.yearsOfExperience,
            status: data.status,
            licenseNumber: data.licenseNumber,
            lastActive: data.lastActive,
            avatar: data.avatar,
            rating: data.rating,
            uid: data.uid,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            role: "doctor",
          });
        });

        setDoctors(doctorsData);
        setFilteredDoctors(doctorsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching doctors:", error);
        presentToast({
          message: "Failed to load doctors",
          duration: 2000,
          color: "danger",
        });
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [presentToast]);

  // Load admins from Firebase
  useEffect(() => {
    const q = query(adminsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const adminsData: Admin[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          adminsData.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            status: data.status,
            avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
            uid: data.uid,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        setAdmins(adminsData);
      },
      (error) => {
        console.error("Error fetching admins:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter doctors
  useEffect(() => {
    let result = doctors;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(term) ||
          doctor.email.toLowerCase().includes(term) ||
          doctor.phone.includes(term) ||
          doctor.specialization.toLowerCase().includes(term)
      );
    }

    setFilteredDoctors(result);
  }, [searchTerm, doctors]);

  const handleDeleteClick = (id: string, type: "doctor" | "admin") => {
    if (type === "doctor") {
      setDoctorToDelete(id);
    } else {
      setAdminToDelete(id);
    }
    setShowAlert(true);
  };

  const confirmDelete = async () => {
    try {
      if (doctorToDelete) {
        await deleteDoc(doc(db, "doctors", doctorToDelete));
        presentToast({
          message: "Doctor deleted successfully",
          duration: 2000,
          color: "success",
          icon: checkmark,
        });
        setDoctorToDelete(null);
      } else if (adminToDelete) {
        await deleteDoc(doc(db, "admins", adminToDelete));
        presentToast({
          message: "Admin deleted successfully",
          duration: 2000,
          color: "success",
          icon: checkmark,
        });
        setAdminToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
      presentToast({
        message: "Failed to delete",
        duration: 2000,
        color: "danger",
      });
    }
    setShowAlert(false);
  };

  const handleDoctorSignup = async () => {
    if (
      !doctorForm.name ||
      !authForm.email ||
      !authForm.password ||
      !doctorForm.licenseNumber
    ) {
      presentToast({
        message: "Name, email, password and license number are required",
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

      // Create doctor record in Firestore
      const newDoctor = {
        ...doctorForm,
        email: authForm.email, // Use the email from auth form
        avatar: `https://ionicframework.com/docs/img/demos/avatar.svg`,
        rating: Math.floor(Math.random() * 2) + 4 + Math.random(), // Random rating between 4.0 and 5.0
        uid: user.uid, // Link to Firebase Auth UID
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(doctorsCollection, newDoctor);

      presentToast({
        message: "Doctor account created successfully!",
        duration: 3000,
        color: "success",
        icon: checkmark,
      });

      resetForm();
      setShowModal(false);
    } catch (error: any) {
      console.error("Error creating doctor account:", error);

      let errorMessage = "Failed to create doctor account";
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
      });
    }
  };

  const handleAdminSignup = async () => {
    if (!adminForm.name || !authForm.email || !authForm.password) {
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

      // Create admin record in Firestore
      const newAdmin = {
        ...adminForm,
        email: authForm.email, // Use the email from auth form
        avatar: `https://ionicframework.com/docs/img/demos/avatar.svg`,
        uid: user.uid, // Link to Firebase Auth UID
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(adminsCollection, newAdmin);

      presentToast({
        message: "Admin account created successfully!",
        duration: 3000,
        color: "success",
        icon: checkmark,
      });

      resetForm();
      setShowModal(false);
    } catch (error: any) {
      console.error("Error creating admin account:", error);

      let errorMessage = "Failed to create admin account";
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
      });
    }
  };

  const handleEditDoctor = async () => {
    if (!doctorForm.name || !doctorForm.email || !doctorForm.licenseNumber) {
      presentToast({
        message: "Name, email and license number are required",
        duration: 2000,
        color: "warning",
        icon: informationCircle,
      });
      return;
    }

    try {
      if (isEditing && currentDoctorId) {
        // Update existing doctor
        const doctorRef = doc(db, "doctors", currentDoctorId);
        await updateDoc(doctorRef, {
          ...doctorForm,
          updatedAt: Timestamp.now(),
        });

        presentToast({
          message: "Doctor updated successfully",
          duration: 2000,
          color: "success",
          icon: checkmark,
        });

        resetForm();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error updating doctor:", error);
      presentToast({
        message: "Failed to update doctor",
        duration: 2000,
        color: "danger",
      });
    }
  };

  const handleEditAdmin = async () => {
    if (!adminForm.name || !adminForm.email) {
      presentToast({
        message: "Name and email are required",
        duration: 2000,
        color: "warning",
        icon: informationCircle,
      });
      return;
    }

    try {
      if (isEditing && currentAdminId) {
        // Update existing admin
        const adminRef = doc(db, "admins", currentAdminId);
        await updateDoc(adminRef, {
          ...adminForm,
          updatedAt: Timestamp.now(),
        });

        presentToast({
          message: "Admin updated successfully",
          duration: 2000,
          color: "success",
          icon: checkmark,
        });

        resetForm();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error updating admin:", error);
      presentToast({
        message: "Failed to update admin",
        duration: 2000,
        color: "danger",
      });
    }
  };

  const resetForm = () => {
    setDoctorForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      dob: new Date().toISOString(),
      specialization: "General Practitioner",
      yearsOfExperience: 0,
      status: "active",
      role: "doctor",
      licenseNumber: "",
    });
    setAdminForm({
      name: "",
      email: "",
      phone: "",
      role: "admin",
      status: "active",
    });
    setAuthForm({
      email: "",
      password: "",
      confirmPassword: "",
    });
    setIsEditing(false);
    setCurrentDoctorId(null);
    setCurrentAdminId(null);
    setModalMode("doctor");
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
    setDoctorForm({ ...doctorForm, dob: value || new Date().toISOString() });
  };

  const openEditModal = (doctor: Doctor) => {
    setDoctorForm({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      address: doctor.address,
      dob: doctor.dob,
      specialization: doctor.specialization,
      yearsOfExperience: doctor.yearsOfExperience,
      status: doctor.status,
      licenseNumber: doctor.licenseNumber,
      role: "doctor",
    });
    setIsEditing(true);
    setCurrentDoctorId(doctor.id);
    setModalMode("doctor");
    setShowModal(true);
  };

  const openEditAdminModal = (admin: Admin) => {
    setAdminForm({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      status: admin.status,
    });
    setIsEditing(true);
    setCurrentAdminId(admin.id);
    setModalMode("admin");
    setShowModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode("doctor");
    setShowModal(true);
  };

  const openAdminModal = () => {
    resetForm();
    setModalMode("admin");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleModalSubmit = () => {
    if (isEditing && modalMode === "doctor") {
      handleEditDoctor();
    } else if (isEditing && modalMode === "admin") {
      handleEditAdmin();
    } else if (modalMode === "doctor") {
      handleDoctorSignup();
    } else if (modalMode === "admin") {
      handleAdminSignup();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "on leave":
        return "warning";
      case "inactive":
        return "medium";
      default:
        return "primary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "on leave":
        return "On Leave";
      case "inactive":
        return "Inactive";
      default:
        return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "danger";
      case "admin":
        return "primary";
      case "moderator":
        return "success";
      default:
        return "medium";
    }
  };

  const specializations = [
    "General Practitioner",
    "Cardiology",
    "Neurology",
    "Pediatrics",
    "Orthopedics",
    "Dermatology",
    "Oncology",
    "Psychiatry",
    "Endocrinology",
    "Gastroenterology",
  ];

  const adminRoles = [
    { value: "super_admin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "moderator", label: "Moderator" },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-toolbar-p">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="doctors-title">Doctors & Admins</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openAddModal}>
              <IonIcon slot="icon-only" icon={personAdd} />
            </IonButton>
            <IonButton onClick={openAdminModal}>
              <IonIcon slot="icon-only" icon={shieldCheckmarkOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        {/* Search only — status filtering is intentionally removed */}
        <IonToolbar className="filter-toolbar">
          <IonSearchbar
            placeholder="Search doctors..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || "")}
            animated
            debounce={300}
            className="search-bar search-bar--full"
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="content">
        {loading && (
          <div className="loading-container">
            <LoadingHelix />
            <p>Loading doctors...</p>
          </div>
        )}

        <MessageBox
          isOpen={showAlert}
          title="Confirm Deletion"
          message="Are you sure you want to delete this item?"
          tone="danger"
          actions={[
            {
              label: "Cancel",
              color: "medium",
              onClick: () => setShowAlert(false),
            },
            {
              /* Deletion is unrecoverable, so the confirm action carries the danger
                 colour and Cancel stays quiet. */
              label: "Delete",
              color: "danger",
              onClick: () => {
                setShowAlert(false)
                confirmDelete();
              },
            },
          ]}
          onDismiss={() => setShowAlert(false)}
        />

        {/* Admins List Section */}
        <div className="admins-section">
          <div className="section-header">
            <IonLabel className="section-title">Admins ({admins.length})</IonLabel>
            <IonButton
              size="small"
              fill="outline"
              onClick={openAdminModal}
              className="add-admin-btn"
            >
              <IonIcon slot="start" icon={shieldCheckmarkOutline} />
              Add Admin
            </IonButton>
          </div>
          {admins.length > 0 ? (
            <IonList className="admin-list">
                {admins.map((admin) => (
                  <div key={admin.id}>
                    <IonItem className="admin-item" lines="none"
                    >
                      <div slot="start" className="p-avatar">
                        <div className="p-initials" style={{ background: "var(--ion-color-tertiary)" }}>
                          {admin.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`p-status-dot ${admin.status}`} />
                      </div>

                      <div className="p-info">
                        <div className="p-row p-row-top">
                          <span className="p-name">{admin.name}</span>
                          <IonBadge color={getRoleColor(admin.role)} style={{ fontSize: "0.65rem", padding: "3px 7px" }}>
                            {admin.role.replace("_", " ")}
                          </IonBadge>
                        </div>
                        <div className="p-row p-row-contact">
                          <span className="p-contact-item"><IonIcon icon={mail} />{admin.email}</span>
                          {admin.phone && <span className="p-contact-item"><IonIcon icon={call} />{admin.phone}</span>}
                        </div>
                      </div>

                      <div className="p-actions" slot="end">
                        <IonButton fill="clear" color="primary" onClick={() => openEditAdminModal(admin)} className="edit-button">
                          <IonIcon slot="icon-only" icon={create} />
                        </IonButton>
                        <IonButton fill="clear" color="danger" onClick={() => handleDeleteClick(admin.id, "admin")} className="delete-button">
                          <IonIcon slot="icon-only" icon={trash} />
                        </IonButton>
                      </div>
                    </IonItem>
                  </div>
                ))}
            </IonList>
          ) : (
            <div
              className="empty-state"
            >
              <IonIcon icon={shield} className="empty-icon" />
              <h3>No admins found</h3>
              <p>Add a new admin to manage the system</p>
              <IonButton onClick={openAdminModal} className="empty-action">
                <IonIcon slot="start" icon={shield} />
                Add Admin
              </IonButton>
            </div>
          )}
        </div>

        {/* Doctors List Section */}
        <div className="doctors-section">
          <IonLabel className="section-title">Doctors ({filteredDoctors.length})</IonLabel>
          {filteredDoctors.length === 0 && !loading ? (
            <div className="empty-state">
              <IonIcon icon={medical} className="empty-icon" />
              <h3>No doctors found</h3>
              <p>Try adjusting your search or add a new doctor</p>
              <IonButton onClick={openAddModal} className="empty-action">
                <IonIcon slot="start" icon={add} />
                Add Doctor
              </IonButton>
            </div>
          ) : (
            <IonList className="doctor-list">
                {filteredDoctors.map((doctor) => (
                  <div key={doctor.id}>
                    <IonItem
                      className={`doctor-item ${doctor.status}`}
                      lines="none"
                    >
                      <div slot="start" className="p-avatar">
                        <div className="p-initials" style={{ background: "var(--ion-color-secondary)" }}>
                          {doctor.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`p-status-dot ${doctor.status === "active" ? "active" : doctor.status === "on leave" ? "on-leave" : "inactive"}`} />
                      </div>

                      <div className="p-info">
                        {/* Row 1: name + status + account badge */}
                        <div className="p-row p-row-top">
                          <span className="p-name">{doctor.name}</span>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {doctor.uid && <IonBadge color="success" style={{ fontSize: "0.62rem", padding: "2px 6px" }}>✓ Account</IonBadge>}
                            <IonBadge color={getStatusColor(doctor.status)} style={{ fontSize: "0.62rem", padding: "2px 6px" }}>{getStatusText(doctor.status)}</IonBadge>
                          </div>
                        </div>
                        {/* Row 2: specialization + experience + rating */}
                        <div className="p-row p-row-spec">
                          <span className="p-spec"><IonIcon icon={school} />{doctor.specialization}</span>
                          <span className="p-meta-item"><IonIcon icon={calendar} />{doctor.yearsOfExperience} yrs</span>
                          {doctor.rating && <span className="p-rating"><IonIcon icon={star} />{doctor.rating.toFixed(1)}</span>}
                        </div>
                        {/* Row 3: email + phone */}
                        <div className="p-row p-row-contact">
                          <span className="p-contact-item"><IonIcon icon={mail} />{doctor.email}</span>
                          <span className="p-contact-item"><IonIcon icon={call} />{doctor.phone}</span>
                        </div>
                      </div>

                      <div className="p-actions" slot="end">
                        <IonButton fill="clear" color="primary" onClick={() => openEditModal(doctor)} className="edit-button">
                          <IonIcon slot="icon-only" icon={create} />
                        </IonButton>
                        <IonButton fill="clear" color="danger" onClick={() => handleDeleteClick(doctor.id, "doctor")} className="delete-button">
                          <IonIcon slot="icon-only" icon={trash} />
                        </IonButton>
                      </div>
                    </IonItem>
                  </div>
                ))}
            </IonList>
          )}
        </div>

        {/* Add/Edit Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                <IonIcon icon={modalMode === "doctor" ? personAdd : shield} />{" "}
                {isEditing
                  ? `Edit ${modalMode === "doctor" ? "Doctor" : "Admin"}`
                  : `Add New ${modalMode === "doctor" ? "Doctor" : "Admin"}`}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
            <IonToolbar>
              <IonSegment
                color="primary"
                value={modalMode}
                onIonChange={(e) =>
                  setModalMode(e.detail.value as "doctor" | "admin")
                }
                disabled={isEditing}
              >
                <IonSegmentButton value="doctor">
                  <IonLabel>Doctor</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="admin">
                  <IonLabel>Admin</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonToolbar>
          </IonHeader>
          <IonContent class="ion-padding">
            {/* Common Information */}
            <IonItem className="form-item">
              <IonLabel position="floating">Full Name*</IonLabel>
              <IonInput
                value={
                  modalMode === "doctor" ? doctorForm.name : adminForm.name
                }
                onIonChange={(e) =>
                  modalMode === "doctor"
                    ? setDoctorForm({ ...doctorForm, name: e.detail.value! })
                    : setAdminForm({ ...adminForm, name: e.detail.value! })
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
                  value={
                    modalMode === "doctor" ? doctorForm.email : adminForm.email
                  }
                  onIonChange={(e) =>
                    modalMode === "doctor"
                      ? setDoctorForm({ ...doctorForm, email: e.detail.value! })
                      : setAdminForm({ ...adminForm, email: e.detail.value! })
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

            <IonItem className="form-item">
              <IonLabel position="floating">Phone</IonLabel>
              <IonInput
                type="tel"
                value={
                  modalMode === "doctor" ? doctorForm.phone : adminForm.phone
                }
                onIonChange={(e) =>
                  modalMode === "doctor"
                    ? setDoctorForm({ ...doctorForm, phone: e.detail.value! })
                    : setAdminForm({ ...adminForm, phone: e.detail.value! })
                }
              />
            </IonItem>

            {modalMode === "doctor" ? (
              // Doctor Specific Fields
              <>
                <IonItem className="form-item">
                  <IonLabel position="floating">Age</IonLabel>
                  <IonInput
                    type="number"
                    value={doctorForm.dob}
                    onIonChange={(e) =>
                      setDoctorForm({ ...doctorForm, dob: e.detail.value! })
                    }
                    min="0"
                    max="100"
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">Address</IonLabel>
                  <IonInput
                    value={doctorForm.address}
                    onIonChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        address: e.detail.value!,
                      })
                    }
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel>Specialization</IonLabel>
                  <IonSelect
                    value={doctorForm.specialization}
                    onIonChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        specialization: e.detail.value,
                      })
                    }
                    interface="popover"
                  >
                    {specializations.map((spec) => (
                      <IonSelectOption key={spec} value={spec}>
                        {spec}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">Years of Experience</IonLabel>
                  <IonInput
                    type="number"
                    value={doctorForm.yearsOfExperience}
                    onIonChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        yearsOfExperience: parseInt(e.detail.value!) || 0,
                      })
                    }
                    min="0"
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel position="floating">License Number*</IonLabel>
                  <IonInput
                    value={doctorForm.licenseNumber}
                    onIonChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        licenseNumber: e.detail.value!,
                      })
                    }
                    required
                  />
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel>Status</IonLabel>
                  <IonSelect
                    value={doctorForm.status}
                    onIonChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        status: e.detail.value as
                          | "active"
                          | "on leave"
                          | "inactive",
                      })
                    }
                    interface="popover"
                  >
                    <IonSelectOption value="active">Active</IonSelectOption>
                    <IonSelectOption value="on leave">On Leave</IonSelectOption>
                    <IonSelectOption value="inactive">Inactive</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </>
            ) : (
              // Admin Specific Fields
              <>
                <IonItem className="form-item">
                  <IonLabel>Role</IonLabel>
                  <IonSelect
                    value={adminForm.role}
                    onIonChange={(e) =>
                      setAdminForm({
                        ...adminForm,
                        role: e.detail.value as "admin",
                      })
                    }
                    interface="popover"
                  >
                    {adminRoles.map((role) => (
                      <IonSelectOption key={role.value} value={role.value}>
                        {role.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                <IonItem className="form-item">
                  <IonLabel>Status</IonLabel>
                  <IonSelect
                    value={adminForm.status}
                    onIonChange={(e) =>
                      setAdminForm({
                        ...adminForm,
                        status: e.detail.value as "active" | "inactive",
                      })
                    }
                    interface="popover"
                  >
                    <IonSelectOption value="active">Active</IonSelectOption>
                    <IonSelectOption value="inactive">Inactive</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </>
            )}

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
                    ? modalMode === "doctor"
                      ? !doctorForm.name ||
                        !doctorForm.email ||
                        !doctorForm.licenseNumber
                      : !adminForm.name || !adminForm.email
                    : modalMode === "doctor"
                    ? !doctorForm.name ||
                      !authForm.email ||
                      !authForm.password ||
                      !doctorForm.licenseNumber
                    : !adminForm.name || !authForm.email || !authForm.password
                }
                className="action-button"
              >
                {isEditing
                  ? `Update ${modalMode === "doctor" ? "Doctor" : "Admin"}`
                  : `Create ${
                      modalMode === "doctor" ? "Doctor" : "Admin"
                    } Account`}
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
          <IonFabButton onClick={openAddModal}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Admin_doctors;
