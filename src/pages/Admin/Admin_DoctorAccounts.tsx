import LoadingHelix from "../../components/LoadingHelix";
import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSearchbar,
  IonButtons,
  IonBackButton,
  IonBadge,
  IonAvatar,
  IonSelect,
  IonSelectOption,
  IonText,
  IonIcon,
  IonButton,
  useIonToast,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import {
  medicalOutline,
  callOutline,
  mailOutline,
  starOutline,
  star,
  locationOutline,
  lockClosed,
  lockOpen,
  checkmarkCircle,
} from "ionicons/icons";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";

import "./Admin3.scss";
import { DEFAULT_AVATAR, handleImageError, pickImageField } from "../../utils/profileImageStorage";

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  status: "active" | "inactive" | "on leave" | "pending";
  avatar?: string;
  rating?: number;
  region?: string;
  city?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  isEnabled?: boolean; // explicit enable/disable flag
  isVerified?: boolean;
  createdAt?: Timestamp;
}

type FilterStatus = "all" | "pending" | "enabled" | "disabled" | "verified";

const Admin_DoctorAccounts: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filtered, setFiltered] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  // Confirmation alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [pendingDoctor, setPendingDoctor] = useState<Doctor | null>(null);
  const [pendingValue, setPendingValue] = useState<boolean>(false);

  // ── Load doctors ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "doctors"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Doctor[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "Unknown Doctor",
            email: data.email || "",
            phone: data.phone,
            specialization: data.specialization || "General Practitioner",
            // isEnabled takes priority; fall back to status field
            isEnabled:
              data.isEnabled !== undefined
                ? Boolean(data.isEnabled)
                : data.status !== "inactive",
            isVerified: data.isVerified === true,
            status: data.status || "active",
            // Read every historical alias; `avatar` alone missed the
            // `profilePhoto` URL written at signup.
            avatar: pickImageField(data),
            rating: data.rating,
            region: data.region,
            city: data.city,
            licenseNumber: data.licenseNumber,
            yearsOfExperience: data.yearsOfExperience,
            createdAt: data.createdAt,
          };
        });
        setDoctors(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading doctors:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ── Filter ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = doctors;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.email.toLowerCase().includes(term) ||
          (d.specialization || "").toLowerCase().includes(term) ||
          (d.city || "").toLowerCase().includes(term)
      );
    }

    if (filterStatus === "enabled") {
      result = result.filter((d) => d.isEnabled);
    } else if (filterStatus === "disabled") {
      result = result.filter((d) => !d.isEnabled);
    } else if (filterStatus === "pending") {
      result = result.filter((d) => !d.isVerified || d.status === "pending");
    } else if (filterStatus === "verified") {
      result = result.filter((d) => d.isVerified);
    }

    setFiltered(result);
  }, [doctors, searchTerm, filterStatus]);

  // ── Toggle handler ───────────────────────────────────────────────────────
  const requestToggle = (doctor: Doctor, newValue: boolean) => {
    setPendingDoctor(doctor);
    setPendingValue(newValue);
    setAlertOpen(true);
  };

  const confirmToggle = async () => {
    if (!pendingDoctor) return;
    try {
      await updateDoc(doc(db, "doctors", pendingDoctor.id), {
        isEnabled: pendingValue,
        // Keep status field consistent
        status: pendingValue ? "active" : "inactive",
        updatedAt: Timestamp.now(),
      });
      presentToast({
        message: `Dr. ${pendingDoctor.name} has been ${pendingValue ? "enabled" : "disabled"}.`,
        duration: 2500,
        color: "#2563eb",
        position: "top",
      });
    } catch (err) {
      console.error("Toggle error:", err);
      presentToast({
        message: "Failed to update account status.",
        duration: 2500,
        color: "var(--ion-color-text)",
        position: "top",
      });
    } finally {
      setAlertOpen(false);
      setPendingDoctor(null);
    }
  };

  const approveDoctor = async (doctor: Doctor) => {
    try {
      await updateDoc(doc(db, "doctors", doctor.id), {
        isVerified: true,
        isEnabled: true,
        status: "active",
        updatedAt: Timestamp.now(),
      });
      presentToast({
        message: `Dr. ${doctor.name} has been verified and enabled.`,
        duration: 2500,
        color: "#2563eb",
        position: "top",
      });
    } catch (err) {
      console.error("Doctor approval error:", err);
      presentToast({
        message: "Failed to approve doctor.",
        duration: 2500,
        color: "var(--ion-color-text)",
        position: "top",
      });
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const avatarColors = [
    "#3880ff", "#2dd36f", "#eb445a", "#ffc409",
    "#7044ff", "#3dc2ff", "#ff6b81", "#20c997",
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return avatarColors[hash % avatarColors.length];
  };

  const enabledCount = doctors.filter((d) => d.isEnabled).length;
  const disabledCount = doctors.filter((d) => !d.isEnabled).length;
  const pendingCount = doctors.filter((d) => !d.isVerified || d.status === "pending").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Doctor Accounts</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal">

        {/* ── Summary chips ─────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 4px 4px",
            flexWrap: "wrap",
          }}
        >
          <IonBadge color="dark" className="hc-badge-outline" style={{ fontSize: "0.82rem", padding: "6px 10px", borderRadius: 20 }}>
            Total: {doctors.length}
          </IonBadge>
          <IonBadge color="dark" className="hc-badge-outline" style={{ fontSize: "0.82rem", padding: "6px 10px", borderRadius: 20 }}>
            Enabled: {enabledCount}
          </IonBadge>
            <IonBadge color="dark" className="hc-badge-outline" style={{ fontSize: "0.82rem", padding: "6px 10px", borderRadius: 20 }}>
              Disabled: {disabledCount}
            </IonBadge>
            <IonBadge color="dark" className="hc-badge-outline" style={{ fontSize: "0.82rem", padding: "6px 10px", borderRadius: 20 }}>
              Pending: {pendingCount}
            </IonBadge>
        </div>

        {/* ── Search ────────────────────────────────────────────── */}
        <IonSearchbar
          value={searchTerm}
          onIonInput={(e) => setSearchTerm(e.detail.value!)}
          placeholder="Search by name, email, specialty…"
          animated
          style={{ paddingTop: 4 }}
        />

        {/* ── Filter ────────────────────────────────────────────── */}
        <IonItem lines="none" style={{ marginBottom: 8 }}>
          <IonLabel>Filter</IonLabel>
          <IonSelect
            value={filterStatus}
            interface="popover"
            onIonChange={(e) => setFilterStatus(e.detail.value)}
                >
                  <IonSelectOption value="all">All doctors</IonSelectOption>
                  <IonSelectOption value="pending">Pending review</IonSelectOption>
                  <IonSelectOption value="verified">Verified only</IonSelectOption>
                  <IonSelectOption value="enabled">Enabled only</IonSelectOption>
                  <IonSelectOption value="disabled">Disabled only</IonSelectOption>
                </IonSelect>
        </IonItem>

        {/* ── List ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="loading-container">
            <LoadingHelix />
            <p>Loading doctors…</p>
          </div>
        ) : filtered.length === 0 ? (
          <IonText color="dark">
            <p style={{ textAlign: "center", padding: "32px 16px" }}>
              No doctors match your search.
            </p>
          </IonText>
        ) : (
          <IonList style={{ background: "transparent" }}>
            {filtered.map((doctor) => (
                <div key={doctor.id}>
                  <IonItem
                    lines="none"
                    style={{
                      "--background": "var(--ion-item-background)",
                      borderRadius: 14,
                      marginBottom: 10,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                      opacity: doctor.isEnabled ? 1 : 0.65,
                    }}
                  >
                    {/* Avatar */}
                    <IonAvatar slot="start" style={{ marginRight: 12 }}>
                      {doctor.avatar ? (
                        <img
                          src={doctor.avatar || DEFAULT_AVATAR}
                          alt={doctor.name}
                          onError={handleImageError}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            background: getAvatarColor(doctor.name),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: "1rem",
                          }}
                        >
                          {getInitials(doctor.name)}
                        </div>
                      )}
                    </IonAvatar>

                    {/* Info */}
                    <IonLabel>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.96rem",
                            color: "var(--ion-color-text)",
                          }}
                        >
                          {doctor.name}
                        </span>
                        {/* Enabled / Disabled lock icon */}
                        <IonIcon
                          icon={doctor.isEnabled ? lockOpen : lockClosed}
                          style={{
                            fontSize: "1rem",
                            color: doctor.isEnabled ? "#2563eb" : "var(--ion-color-text)",
                          }}
                          title={doctor.isEnabled ? "Account enabled" : "Account disabled"}
                        />
                        {/* Single tick icon for verified doctors */}
                        {doctor.isVerified && (
                          <IonIcon
                            icon={checkmarkCircle}
                            style={{
                              fontSize: "1.2rem",
                              color: "#2563eb",
                              marginLeft: 2,
                            }}
                          />
                        )}
                      </div>

                      {/* Specialty */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.82rem",
                          color: "#2563eb",
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        <IonIcon icon={medicalOutline} style={{ fontSize: 13 }} />
                        {doctor.specialization}
                      </div>

                      {/* Email */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.78rem",
                          color: "var(--ion-color-text)",
                          marginBottom: 2,
                        }}
                      >
                        <IonIcon icon={mailOutline} style={{ fontSize: 12 }} />
                        {doctor.email}
                      </div>

                      {/* Phone + Location row */}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          fontSize: "0.77rem",
                          color: "var(--ion-color-text)",
                        }}
                      >
                        {doctor.phone && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <IonIcon icon={callOutline} style={{ fontSize: 12 }} />
                            {doctor.phone}
                          </span>
                        )}
                        {(doctor.city || doctor.region) && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <IonIcon icon={locationOutline} style={{ fontSize: 12 }} />
                            {[doctor.city, doctor.region].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {doctor.rating !== undefined && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#2563eb" }}>
                            <IonIcon icon={star} style={{ fontSize: 12 }} />
                            {doctor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </IonLabel>

                    {!doctor.isVerified && (
                      <IonButton
                        slot="end"
                        size="small"
                        fill="outline"
                        style={{
                          "--border-color": "#2563eb",
                          "--color": "#2563eb",
                          color: "#2563eb",
                        } as React.CSSProperties}
                        onClick={() => approveDoctor(doctor)}
                        title="Verify doctor"
                      >
                        <IonIcon icon={checkmarkCircle} slot="start" />
                        Verify
                      </IonButton>
                    )}

                    {/* Toggle */}
                    <IonToggle
                      slot="end"
                      checked={doctor.isEnabled}
                      style={{
                        "--background": doctor.isEnabled ? "#2563eb" : "var(--ion-color-text)",
                        "--background-checked": "#2563eb",
                        "--indicator-background": "#ffffff",
                      } as React.CSSProperties}
                      onIonChange={(e) => {
                        // Prevent the onSnapshot re-render from firing twice
                        if (e.detail.checked !== doctor.isEnabled) {
                          requestToggle(doctor, e.detail.checked);
                        }
                      }}
                    />
                  </IonItem>
                </div>
              ))}
          </IonList>
        )}

        {/* ── Confirmation alert ───────────────────────────────── */}
        <MessageBox
          isOpen={alertOpen}
          title={pendingValue ? "Enable Account" : "Disable Account"}
          message={
            pendingDoctor
              ? `Are you sure you want to ${pendingValue ? "enable" : "disable"} Dr. ${pendingDoctor.name}'s account?`
              : ""
          }
          tone="info"
          actions={[
            {
              label: "Cancel",
              color: "medium",
              onClick: () => {
                setAlertOpen(false);
                setPendingDoctor(null);
              },
            },
            {
              label: pendingValue ? "Enable" : "Disable",
              /* Disabling locks a doctor out of the app, so that branch takes the
                 danger colour; enabling is restorative and stays primary. */
              color: pendingValue ? "primary" : "danger",
              onClick: () => {
                setAlertOpen(false);
                setPendingDoctor(null);
                confirmToggle();
              },
            },
          ]}
          onDismiss={() => {
            setAlertOpen(false);
            setPendingDoctor(null);
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Admin_DoctorAccounts;
