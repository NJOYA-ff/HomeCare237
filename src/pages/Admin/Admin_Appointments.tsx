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
  IonAvatar,
  IonNote,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonButtons,
  IonButton,
  IonIcon,
  useIonViewWillEnter,
  IonBackButton,
  IonChip,
} from "@ionic/react";
import { db } from "../../firebaseconfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { calendar, time, location, filter } from "ionicons/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import "./Admin2.scss";

type AppointmentStatus = "confirmed" | "pending" | "cancelled" | "completed";

interface Appointment {
  id: string;
  patientName: string;
  patientImage: string;
  service: string;
  date: string;
  time: string;
  address: string;
  status: AppointmentStatus;
  duration: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const Admin_Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("status") as AppointmentStatus | "all") || "all";
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Convert any Firebase Timestamp to readable string
  const convertFirebaseValue = (value: any): any => {
    if (!value) return value;

    // If it's a Firebase Timestamp object
    if (value.seconds !== undefined && value.nanoseconds !== undefined) {
      const date = new Date(value.seconds * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    // If it's an array, convert each element
    if (Array.isArray(value)) {
      return value.map((item) => convertFirebaseValue(item));
    }

    // If it's an object (but not a Timestamp), convert its properties
    if (typeof value === "object" && value !== null) {
      const converted: any = {};
      for (const key in value) {
        converted[key] = convertFirebaseValue(value[key]);
      }
      return converted;
    }

    // Return primitive values as-is
    return value;
  };

  // Safe string conversion for rendering
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();

    // For objects, convert to JSON string (but handle circular references)
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  };

  // Load appointments from Firebase
  useIonViewWillEnter(() => {
    loadAppointments();
  });

  const loadAppointments = () => {
    try {
      setLoading(true);

      // Create a reference to the appointments collection
      const appointmentsRef = collection(db, "appointments");

      // Create query with ordering
      const q = query(appointmentsRef, orderBy("date", "asc"));

      // Get real-time updates
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const appointmentsData: Appointment[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Convert all Firebase values to safe types
            const convertedData = convertFirebaseValue(data);

            const appointment: Appointment = {
              id: doc.id,
              patientName: safeString(convertedData.patientName) || "",
              patientImage:
                safeString(convertedData.patientImage) ||
                "https://ionicframework.com/docs/img/demos/avatar.svg",
              service: safeString(convertedData.service) || "",
              date: safeString(convertedData.date) || "",
              time: safeString(convertedData.time) || "",
              address: safeString(convertedData.address) || "",
              status: (convertedData.status as AppointmentStatus) || "pending",
              duration: safeString(convertedData.duration) || "",
              notes: safeString(convertedData.notes),
              createdAt: safeString(convertedData.createdAt),
              updatedAt: safeString(convertedData.updatedAt),
            };

            appointmentsData.push(appointment);
          });

          setAppointments(appointmentsData);
          setFilteredAppointments(appointmentsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error in snapshot:", error);
          setLoading(false);
        }
      );

      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error("Error loading appointments:", error);
      setLoading(false);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let results = appointments;

    if (statusFilter !== "all") {
      results = results.filter((appt) => appt.status === statusFilter);
    }

    if (searchTerm) {
      results = results.filter(
        (appt) =>
          appt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(results);
  }, [appointments, statusFilter, searchTerm]);

  const getStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "danger";
      case "completed":
        return "primary";
      default:
        return "medium";
    }
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  // Format status text for display
  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <IonPage>
      <IonHeader className="appointment-header">
        <IonToolbar className="main-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="page-title">Appointments</IonTitle>
          <IonButtons slot="end">
            <IonButton className="filter-button" onClick={toggleFilter}>
              <IonIcon slot="icon-only" icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar className="search-toolbar">
          <IonSearchbar
            className="appointment-searchbar"
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value!)}
            placeholder="Search appointments..."
            animated
          />
        </IonToolbar>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              className="filter-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <IonToolbar className="filter-toolbar">
                <IonSegment
                  className="status-segment"
                  value={statusFilter}
                  onIonChange={(e) =>
                    setStatusFilter(e.detail.value as AppointmentStatus | "all")
                  }
                  scrollable
                >
                  <IonSegmentButton className="segment-button" value="all">
                    <IonLabel>All</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton
                    className="segment-button"
                    value="confirmed"
                  >
                    <IonLabel>Confirmed</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton className="segment-button" value="pending">
                    <IonLabel>Pending</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton
                    className="segment-button"
                    value="completed"
                  >
                    <IonLabel>Completed</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton
                    className="segment-button"
                    value="cancelled"
                  >
                    <IonLabel>Cancelled</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonToolbar>
            </motion.div>
          )}
        </AnimatePresence>
      </IonHeader>

      <IonContent className="appointment-content" fullscreen>
        {loading ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="empty-content">
              <p className="empty-text">Loading appointments...</p>
            </div>
          </motion.div>
        ) : filteredAppointments.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="empty-content">
              <IonIcon className="empty-icon" icon={calendar} />
              <p className="empty-text">No appointments found</p>
              {statusFilter !== "all" && (
                <IonButton
                  className="clear-filter-button"
                  fill="clear"
                  onClick={() => setStatusFilter("all")}
                >
                  Clear filters
                </IonButton>
              )}
            </div>
          </motion.div>
        ) : (
          <IonList className="appointment-list" lines="none">
            <AnimatePresence>
              {filteredAppointments.map((appointment) => (
                <motion.div
                  key={appointment.id}
                  className="appointment-item-container"
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.25 }}
                >
                  <IonItem className="appointment-item" lines="none"
                    style={{ borderLeft: `4px solid var(--ion-color-${getStatusColor(appointment.status)})` }}>
                    <div slot="start" style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `var(--ion-color-${getStatusColor(appointment.status)})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: "0.95rem", marginRight: 12,
                    }}>
                      {safeString(appointment.patientName).split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <IonLabel className="appointment-details">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <h2 className="patient-name">{safeString(appointment.patientName)}</h2>
                        <IonChip className={`status-badge-a status-${appointment.status}`}
                          color={getStatusColor(appointment.status)}
                          style={{ margin: 0, height: 24, fontSize: "0.72rem" }}>
                          {formatStatus(appointment.status)}
                        </IonChip>
                      </div>
                      <p className="service-name">{safeString(appointment.service)}</p>
                      <div className="appointment-meta">
                        <span className="meta-item">
                          <IonIcon className="meta-icon" icon={calendar} />
                          <span className="meta-text">{safeString(appointment.date)}</span>
                        </span>
                        <span className="meta-item">
                          <IonIcon className="meta-icon" icon={time} />
                          <span className="meta-text">{safeString(appointment.time)} · {safeString(appointment.duration)}</span>
                        </span>
                        {appointment.address && (
                          <span className="meta-item">
                            <IonIcon className="meta-icon" icon={location} />
                            <span className="meta-text">{safeString(appointment.address)}</span>
                          </span>
                        )}
                      </div>
                    </IonLabel>
                  </IonItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Admin_Appointments;
