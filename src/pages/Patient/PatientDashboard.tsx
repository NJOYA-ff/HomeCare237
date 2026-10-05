import React, { useEffect, useState, useMemo } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonAvatar,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar,
  IonFab,
  IonFabButton,
  IonButtons,
  IonMenuButton,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  createAnimation,
  IonText,
  IonSkeletonText,
  IonImg,
  IonToast,
  IonPopover,
  IonList,
  IonItem as IonListItem,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { DEFAULT_AVATAR, handleImageError } from "../../utils/profileImageStorage";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import {
  FaHeartbeat,
  FaStethoscope,
  FaPills,
  FaSyringe,
  FaHospital,
  FaUserMd,
  FaClinicMedical,
  FaProcedures,
  FaXRay,
  FaAllergies,
  FaBandAid,
  FaBookMedical,
  FaCapsules,
  FaDiagnoses,
  FaDna,
  FaFileMedical,
  FaFirstAid,
  FaFlask,
  FaHeart,
  FaLungs,
  FaPrescriptionBottle,
  FaPrescriptionBottleAlt,
  FaShieldAlt,
  FaSkullCrossbones,
  FaTeeth,
  FaThermometerHalf,
  FaTooth,
  FaChild,
  FaVenus,
  FaBrain,
  FaBone,
  FaAmbulance,
  FaEye,
  FaUserInjured,
  FaVial,
  FaWeight,
} from "react-icons/fa";

import {
  GiBrain,
  GiKidneys,
  GiLiver,
  GiHand,
  GiMedicalPack,
  GiMedicalDrip,
  GiMedicalPackAlt,
  GiMedicines,
  GiMedicinePills,
  GiMedicalThermometer,
  GiHeartBeats,
  GiLungs,
  GiStomach,
} from "react-icons/gi";

import {
  MdHealthAndSafety,
  MdLocalPharmacy,
  MdMedicalServices,
  MdMonitorHeart,
  MdSick,
  MdVaccines,
  MdCoronavirus,
  MdAirlineSeatReclineExtra,
  MdBloodtype,
  MdEmergency,
  MdLocalHospital,
  MdMedicalInformation,
  MdPsychology,
  MdSensors,
  MdSupportAgent,
} from "react-icons/md";
import { ref, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, storage, auth } from "../../firebaseconfig";
import {
  calendarOutline,
  pulseOutline,
  documentTextOutline,
  chatbubbleEllipsesOutline,
  notificationsOutline,
  locationOutline,
  arrowDownCircle,
  heartOutline,
  searchOutline,
  star,
  callOutline,
  chevronForward,
  fitness,
  ellipsisHorizontal,
} from "ionicons/icons";
import { medicalIcons, ioniconsMedical } from "../../utils/MedicalIcons";
import {
  appointmentMillis,
  formatAppointmentWhen,
} from "../../utils/appointmentDate";
import monitor_heart from "@material-design-icons/svg/outlined/heart_broken.svg";
import {
  medical,
  people,
  bodyOutline,
  fitnessOutline,
  banOutline,
  eyeOutline,
  bandageOutline,
} from "ionicons/icons";
import "./Dashboard.scss";

import VoiceflowChat from "./Chat-interface";
import AudioCallModal from "./AudioCallModal";
import { useHistory } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Forces Leaflet to recalculate its size once the container is in the DOM.
 *  Without this the tiles render grey/blank inside Ionic's shadow DOM. */
const InvalidateSize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  }, [map]);
  return null;
};

// Fix leaflet default marker icons (same fix as Health_units_p)
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Explicit icon instance — Vite breaks the default icon's asset URL
// resolution, so we always pass this directly to <Marker icon={...} />.
const dashMapMarkerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
import LoadingHelix from "../../components/LoadingHelix";
import { motion } from "framer-motion";
declare global {
  interface Window {
    voiceflow?: any;
  }
}
import { FiMenu, FiPhone, FiMessageSquare } from "react-icons/fi";
import Menu from "@material-design-icons/svg/round/menu_open.svg";
import { useNotifications } from "../../context/NotificationContext";
import { useSettings } from "../../context/SettingsContext";
// Interfaces for type safety
interface UserData {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  currentStatus?: string;
}

interface Appointment {
  id: string;
  doctorId: string;
  userName: string;
  doctorName: string;
  doctorSpecialization: string;
  date: Timestamp;
  /** The slot the patient picked from the doctor's `availableSlots`, e.g. "09:00". */
  time?: string;
  status: string;
  notes?: string;
}

interface HealthMetric {
  id: string;
  name: string;
  value: string;
  unit: string;
  icon: string;
  status: "normal" | "warning" | "critical" | "info";
  timestamp: Timestamp;
}

interface Doctor {
  id: string;
  userName: string;
  name: string;
  specialization: string;
  rating: number;
  experience: string;
  image: string;
  available: boolean;
  nextAvailable: string;
  email: string;
  phone?: string;
}

interface CategoryColor {
  bg: string;
  fg: string;
}

const PatientDashboard: React.FC = () => {
  const { t, language } = useSettings();
  const [currentState, setCurrentState] = useState<string>("healthy");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const handleOpenChat = () => {
    if (window.voiceflow?.chat?.open) {
      window.voiceflow.chat.open();
    }
  };
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    sendLocalNotification,
  } = useNotifications();
  // Firebase data states
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [userData, setUserData] = useState<UserData>({
    id: "",
    name: "",
    email: "",
  });
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const [categoryPopoverEvent, setCategoryPopoverEvent] = useState<any>(null);
  const [showUpcomingPopover, setShowUpcomingPopover] = useState(false);
  const [upcomingPopoverEvent, setUpcomingPopoverEvent] = useState<any>(null);
  const [upcomingAppointmentPopover, setUpcomingAppointmentPopover] = useState<{
    show: boolean;
    event: Event | undefined;
    appointment: Appointment | null;
  }>({ show: false, event: undefined, appointment: null });

  // Doctor card call/message state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callDoctorId, setCallDoctorId] = useState("");
  const history = useHistory();

  // Firebase initialization and auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        await loadUserData(user);
        await loadDashboardData(user.uid);
      } else {
        setLoading(false);
        console.log("No user logged in");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpcomingAppointmentMore = (
    e: React.MouseEvent,
    appointment: Appointment,
  ) => {
    e.persist();
    setUpcomingAppointmentPopover({
      show: true,
      event: e.nativeEvent,
      appointment,
    });
  };

  // Real-time listeners
  useEffect(() => {
    if (!userData.id) return;

    // Real-time listener for appointments (newest first)
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("patientId", "==", userData.id),
      where("status", "in", ["pending", "confirmed", "accepted"]),
      orderBy("date", "asc"),
    );

    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const appointments: Appointment[] = [];
        snapshot.forEach((doc) => {
          appointments.push({ id: doc.id, ...doc.data() } as Appointment);
        });
        setUpcomingAppointments(appointments);
      },
      (error) => {
        console.error("Error listening to appointments:", error);
        showError("Failed to load appointments");
      },
    );

    // Real-time listener for health metrics
    const metricsQuery = query(
      collection(db, "healthMetrics"),
      where("patientId", "==", userData.id),
      orderBy("timestamp", "desc"),
    );

    const unsubscribeMetrics = onSnapshot(
      metricsQuery,
      (snapshot) => {
        const metrics: HealthMetric[] = [];
        snapshot.forEach((doc) => {
          metrics.push({ id: doc.id, ...doc.data() } as HealthMetric);
        });
        // Get metrics from last 7 days and limit to 4
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentMetrics = metrics
          .filter((metric) => metric.timestamp.toDate() > oneWeekAgo)
          .slice(0, 4);
        setHealthMetrics(recentMetrics);
      },
      (error) => {
        console.error("Error listening to health metrics:", error);
        showError("Failed to load health metrics");
      },
    );

    return () => {
      unsubscribeAppointments();
      unsubscribeMetrics();
    };
  }, [userData.id]);

  // Load user data from Firestore - FIXED: Accept user parameter
  const loadUserData = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, "patients", user.uid));
      if (userDoc.exists()) {
        const userDataFromFirestore = userDoc.data() as UserData;
        setUserData({ ...userDataFromFirestore, id: user.uid });
        setCurrentState(userDataFromFirestore.currentStatus || "healthy");

        // Load profile image if exists
        if (userDataFromFirestore.profileImage) {
          try {
            const imageUrl = await getDownloadURL(
              ref(storage, userDataFromFirestore.profileImage),
            );
            setUserData((prev) => ({ ...prev, profileImage: imageUrl }));
          } catch (error) {
            console.log("No custom profile image, using default");
          }
        }
      } else {
        // Create user document if it doesn't exist - FIXED: Use the user parameter directly
        const userDataToSave = {
          name: user.displayName || "User",
          email: user.email || "", // Ensure email is never undefined
          currentStatus: "healthy",
          createdAt: Timestamp.now(),
        };

        await setDoc(doc(db, "patients", user.uid), userDataToSave);

        setUserData({
          id: user.uid,
          name: userDataToSave.name,
          email: userDataToSave.email,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      showError("Failed to load user data");
    }
  };

  // Load dashboard data
  const loadDashboardData = async (userId: string) => {
    try {
      setLoading(true);

      // Load available doctors (only those the patient has appointments with)
      await loadAvailableDoctors(userId);

      // Load initial appointments if real-time listener hasn't populated yet
      const appointmentsSnapshot = await getDocs(
        query(
          collection(db, "appointments"),
          where("patientId", "==", userId),
          where("status", "in", ["pending", "confirmed", "accepted"]),
          orderBy("date", "desc"),
        ),
      );

      const appointments: Appointment[] = [];
      appointmentsSnapshot.forEach((doc) => {
        appointments.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setUpcomingAppointments(appointments);

      // Load initial health metrics if real-time listener hasn't populated yet
      const metricsSnapshot = await getDocs(
        query(
          collection(db, "healthMetrics"),
          where("patientId", "==", userId),
          orderBy("timestamp", "desc"),
        ),
      );

      const metrics: HealthMetric[] = [];
      metricsSnapshot.forEach((doc) => {
        metrics.push({ id: doc.id, ...doc.data() } as HealthMetric);
      });

      // Get metrics from last 7 days and limit to 4
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentMetrics = metrics
        .filter((metric) => metric.timestamp.toDate() > oneWeekAgo)
        .slice(0, 4);
      setHealthMetrics(recentMetrics);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      showError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Load only doctors this patient has booked an appointment with
  const loadAvailableDoctors = async (patientId?: string) => {
    // Resolve the patient ID — prefer the explicit arg, fall back to state
    const uid = patientId || userData.id;
    if (!uid) return;

    try {
      // 1. Get all appointments for this patient (any status)
      const appointmentsSnap = await getDocs(
        query(collection(db, "appointments"), where("patientId", "==", uid)),
      );

      // 2. Collect unique doctorIds
      const doctorIds = [
        ...new Set(
          appointmentsSnap.docs.map((d) => d.data().doctorId as string),
        ),
      ];

      if (doctorIds.length === 0) {
        setAvailableDoctors([]);
        return;
      }

      // 3. Fetch each doctor document and resolve their profile image
      const doctors: Doctor[] = [];
      await Promise.all(
        doctorIds.map(async (did) => {
          try {
            const doctorDoc = await getDoc(doc(db, "doctors", did));
            if (!doctorDoc.exists()) return;

            const doctorData = doctorDoc.data();
            // Local bundled SVG, not the old remote Ionic placeholder — the
            // remote URL is a network dependency and is explicitly treated as
            // "no picture" by PLACEHOLDER_URLS in utils/profileImage.ts, so
            // reusing it here would render a dead image on a doctor with no
            // profile photo.
            let imageUrl = DEFAULT_AVATAR;

            if (doctorData.profileImage) {
              try {
                imageUrl = await getDownloadURL(
                  ref(storage, doctorData.profileImage),
                );
              } catch {
                console.log("Using default avatar for doctor:", doctorData.name);
              }
            }

            doctors.push({
              id: doctorDoc.id,
              userName: doctorData.userName || "doctor",
              name: doctorData.name,
              specialization: doctorData.specialization,
              rating: doctorData.rating || 4.5,
              experience: doctorData.experience || "5 years",
              image: imageUrl,
              available: doctorData.available ?? true,
              nextAvailable: doctorData.nextAvailable || "Not available",
              email: doctorData.email || "No email",
            });
          } catch (err) {
            console.error("Error fetching doctor:", did, err);
          }
        }),
      );

      setAvailableDoctors(doctors);
    } catch (error) {
      console.error("Error loading doctors:", error);
      showError("Failed to load doctors list");
    }
  };

  // Update user status in Firebase
  const handleStateChange = async (value: string) => {
    try {
      setCurrentState(value);

      if (userData.id) {
        await updateDoc(doc(db, "users", userData.id), {
          currentStatus: value,
          lastStatusUpdate: Timestamp.now(),
        });

        // Log status change in health history
        await addDoc(collection(db, "healthHistory"), {
          patientId: userData.id,
          type: "status_change",
          from: currentState,
          to: value,
          timestamp: Timestamp.now(),
          notes: "User updated their health status",
        });

        showSuccess("Health status updated successfully");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Failed to update health status");
      // Revert local state on error
      setCurrentState(currentState);
    }
  };

  // Refresh data
  const doRefresh = async (event: any) => {
    setRefreshing(true);
    try {
      if (firebaseUser) {
        await loadDashboardData(firebaseUser.uid);
        await loadAvailableDoctors(firebaseUser.uid);
      }
      showSuccess("Dashboard refreshed");
    } catch (error) {
      console.error("Error refreshing data:", error);
      showError("Failed to refresh data");
    } finally {
      setRefreshing(false);
      event.detail.complete();
    }
  };

  // Utility functions
  const showError = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const showSuccess = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Format date for display. Takes the *computed* instant (`_dateObj`), which
  // `nextAppointment` builds from the booked doctor slot via `appointmentMillis`,
  // so the clock time shown is the one the patient actually picked.
  const formatAppointmentDate = (ms: number | null) =>
    formatAppointmentWhen(ms, language);

  // Get icon for health metric
  const getMetricIcon = (metricName: string) => {
    const icons: { [key: string]: string } = {
      "Heart Rate": heartOutline,
      "Blood Pressure": pulseOutline,
      Temperature: pulseOutline,
      Oxygen: pulseOutline,
      Weight: pulseOutline,
      default: documentTextOutline,
    };
    return icons[metricName] || icons.default;
  };

  // Format health metric value for display
  const formatMetricValue = (metric: HealthMetric) => {
    return `${metric.value} ${metric.unit}`;
  };

  // Specialties list (use same variable as Book_Appointment)
  const medicalSpecialties = [
    "General Practitioner",
    "Cardiologist",
    "Pediatrician",
    "Dermatologist",
    "Gynecologist",
    "Orthopedic Surgeon",
    "Neurologist",
    "Psychiatrist",
    "Dentist",
    "Ophthalmologist",
    "ENT Specialist",
    "Urologist",
    "Endocrinologist",
    "Gastroenterologist",
    "Oncologist",
    "Rheumatologist",
    "Pulmonologist",
    "Nephrologist",
    "Allergist",
    "Physiotherapist",
  ];

  const specialtyIcons: { [key: string]: React.ReactNode } = {
    "General Practitioner": <FaStethoscope />,
    Cardiologist: <FaHeartbeat />,
    Pediatrician: <FaChild />,
    Dermatologist: <FaUserMd />,
    Gynecologist: <FaVenus />,
    "Orthopedic Surgeon": <FaBone />,
    Neurologist: <FaBrain />,
    Psychiatrist: <FaBrain />,
    Dentist: <FaTooth />,
    Ophthalmologist: <FaEye />,
    "ENT Specialist": <FaHospital />,
    Urologist: <FaHospital />,
    Endocrinologist: <FaPills />,
    Gastroenterologist: <FaPills />,
    Oncologist: <FaHospital />,
    Rheumatologist: <FaBone />,
    Pulmonologist: <FaLungs />,
    Nephrologist: <FaHospital />,
    Allergist: <FaSyringe />,
    Physiotherapist: <FaStethoscope />,
  };

  // Determine the next appointment to show: prefer the soonest future appointment (>= now).
  const nextAppointment = useMemo(() => {
    if (!upcomingAppointments || upcomingAppointments.length === 0) return null;
    try {
      const now = new Date();

      // `_dateObj` must be built from the *booked slot* (`time`), not just the
      // stored `date`. Booking writes the picked doctor slot into `time`
      // ("09:00") while `date` is a Timestamp whose clock time comes from the
      // date-only picker, so using `date` alone both displayed the wrong time
      // and sorted/picked the wrong row as "next".
      const mapped = upcomingAppointments
        .map((a) => {
          const ms = appointmentMillis(a.date, (a as any).time);
          return ms === null ? null : { ...a, _dateObj: new Date(ms) };
        })
        .filter((a): a is Appointment & { _dateObj: Date } => a !== null);

      // Only return a future appointment — if none exist, return null
      const future = mapped
        .filter((a) => a._dateObj.getTime() >= now.getTime())
        .sort((x, y) => x._dateObj.getTime() - y._dateObj.getTime());

      return future.length > 0
        ? (future[0] as Appointment & { _dateObj: Date })
        : null;
    } catch (error) {
      console.error("Error computing next appointment:", error);
      return null;
    }
  }, [upcomingAppointments]);

  const filteredCategoryResults = useMemo(() => {
    const queryText = doctorQuery.trim().toLowerCase();
    if (!queryText) return medicalSpecialties;
    return medicalSpecialties.filter((specialty) =>
      specialty.toLowerCase().includes(queryText),
    );
  }, [doctorQuery]);

  const visibleCategories = useMemo(() => {
    const baseList = filteredCategoryResults;
    return baseList.slice(0, 4);
  }, [filteredCategoryResults]);

  const featuredDoctors = useMemo(() => {
    const queryText = doctorQuery.trim().toLowerCase();
    return availableDoctors
      .filter((doctor) => {
        const specialtyText = (doctor.specialization || "").toLowerCase();
        const matchesQuery = !queryText || specialtyText.includes(queryText);
        const matchesSelectedCategory =
          !selectedCategory ||
          specialtyText.includes(selectedCategory.toLowerCase());
        return matchesQuery && matchesSelectedCategory;
      })
      .slice(0, 4);
  }, [availableDoctors, doctorQuery, selectedCategory]);

  /**
   * Same filter used in Consult.tsx's filteredDoctors:
   * match on doctor name OR specialization against the search query.
   * Shows all matched doctors (no slice) so the card list is complete.
   */
  const consultFilteredDoctors = useMemo(() => {
    const queryText = doctorQuery.trim().toLowerCase();
    return availableDoctors.filter(
      (doctor) =>
        doctor.name.toLowerCase().includes(queryText) ||
        (doctor.specialization || "").toLowerCase().includes(queryText),
    );
  }, [availableDoctors, doctorQuery]);

  // Animation effects
  useEffect(() => {
    if (!loading) {
      const statsCards = document.querySelectorAll(".welcome-card");
      statsCards.forEach((card, index) => {
        const animation = createAnimation()
          .addElement(card)
          .duration(600)
          .delay(100 * index)
          .fromTo("transform", "translateY(30px)", "translateY(0px)")
          .fromTo("opacity", "0", "1");
        animation.play();
      });

      const content = document.querySelector(".dashboard-patient");
      if (content) {
        const animation = createAnimation()
          .addElement(content)
          .duration(800)
          .fromTo("opacity", "0", "1");
        animation.play();
      }
    }
  }, [loading]);

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar className="patient-dashboard-toolbar">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle slot="start">HomeCare</IonTitle>
          <IonButton fill="clear" slot="end" routerLink="/notifications">
            {unreadCount > 0 && (
              <IonBadge color="danger" style={{ marginLeft: "8px" }}>
                {unreadCount}
              </IonBadge>
            )}
            <IonIcon icon={notificationsOutline} color="dark" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard-patient">
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent
            pullingIcon={arrowDownCircle}
            pullingText={t("pullToRefresh")}
            refreshingSpinner="circles"
            refreshingText={t("refreshing")}
          ></IonRefresherContent>
        </IonRefresher>

        {/* Alerts and Toasts */}
        <MessageBox
          isOpen={showAlert}
          title={t("error")}
          message={alertMessage}
          tone="danger"
          actions={[
            {
              label: t("ok"),
              color: "primary",
              onClick: () => setShowAlert(false),
            },
          ]}
          onDismiss={() => setShowAlert(false)}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />

        {/* Loading State */}
        {loading ? (
          <div className="loading-container">
            <LoadingHelix />
            <IonText className="ion-text-center ion-padding">
              <p>{t("loadingDashboard")}</p>
            </IonText>
          </div>
        ) : (
          <>
            <div className="patient-home-shell">
              <IonCard className="patient-home-intro">
                <IonCardContent>
                  <p className="tiny-greeting">{t("helloGreeting")} {userData.name || ""}!</p>
                  <h2 className="home-title">{t("findSpecialist")}</h2>
                  <br />
                  <div className="home-search-wrap">
                    <IonIcon icon={searchOutline} />
                    <input
                      value={doctorQuery}
                      onChange={(e) => setDoctorQuery(e.target.value)}
                      placeholder={t("searchSpecialist")}
                    />
                    <IonButton fill="clear" size="small">
                      <IonIcon icon={chatbubbleEllipsesOutline} />
                    </IonButton>
                  </div>

                  <div className="home-section-head">
                    <h3>{t("categories")}</h3>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={(e) => {
                        setCategoryPopoverEvent(e.nativeEvent);
                        setShowCategoryPopover(true);
                      }}
                    >
                      {t("seeAll")}
                    </IonButton>
                  </div>

                  <div className="home-categories">
                    {visibleCategories.length > 0 ? (
                      visibleCategories.map((specialty, index) => {
                        return (
                          <div
                            key={specialty}
                            className="home-category-wrapper"
                          >
                            <IonButton
                              className="home-category-btn"
                              routerLink={`/patient/specialties?specialty=${encodeURIComponent(
                                specialty,
                              )}`}
                            >
                              {specialtyIcons[specialty] || (
                                <IonIcon icon={medical} />
                              )}
                            </IonButton>
                            <IonLabel>{specialty}</IonLabel>
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty-state-text">{t("noCategoryFound")}</p>
                    )}
                  </div>
                  {selectedCategory && (
                    <p className="selected-category-tag">
                      Selected: {selectedCategory}
                    </p>
                  )}
                  <IonPopover
                    isOpen={showCategoryPopover}
                    event={categoryPopoverEvent}
                    onDidDismiss={() => setShowCategoryPopover(false)}
                    className="category-dropdown-popover"
                  >
                    <IonList className="category-dropdown-list">
                      {medicalSpecialties.map((specialty) => (
                        <IonListItem
                          key={specialty}
                          button
                          detail={false}
                          routerLink={`/patient/specialties?specialty=${encodeURIComponent(
                            specialty,
                          )}`}
                          onClick={() => setShowCategoryPopover(false)}
                        >
                          <IonLabel>{specialty}</IonLabel>
                        </IonListItem>
                      ))}
                    </IonList>
                  </IonPopover>
                </IonCardContent>
              </IonCard>

              <IonCard className="home-upcoming-card">
                <IonCardContent>
                  <div className="home-section-head">
                    <h3>{t("upcomingAppointment")}</h3>
                    <IonButton fill="clear" size="small" routerLink="/patient/book_appointment?tab=myAppointments">
                      {t("seeAll")}
                    </IonButton>
                  </div>

                  {nextAppointment ? (
                    <div className="upcoming-highlight">
                      {/* The appointment document stores no doctor picture, so
                          fall back to the bundled SVG placeholder. */}
                      <IonAvatar>
                        <img
                          src={DEFAULT_AVATAR}
                          alt={nextAppointment.doctorName}
                          onError={handleImageError}
                        />
                      </IonAvatar>
                      <div className="upcoming-meta">
                        <p className="appointment-time">
                          {formatAppointmentDate(
                            nextAppointment._dateObj.getTime(),
                          )}
                        </p>
                        <h4>{nextAppointment.doctorName}</h4>
                        <p>{nextAppointment.doctorSpecialization}</p>
                      </div>
                      <IonButton
                        fill="clear"
                        onClick={(e) =>
                          handleUpcomingAppointmentMore(e, nextAppointment)
                        }
                      >
                        <IonIcon
                          icon={ellipsisHorizontal}
                          slot="icon-only"
                          color="light"
                        />
                      </IonButton>
                    </div>
                  ) : (
                    <p className="empty-state-text">{t("noUpcomingAppointments")}</p>
                  )}
                  <IonPopover
                    isOpen={upcomingAppointmentPopover.show}
                    event={upcomingAppointmentPopover.event}
                    onDidDismiss={() =>
                      setUpcomingAppointmentPopover({
                        show: false,
                        event: undefined,
                        appointment: null,
                      })
                    }
                  >
                    <IonList>
                      <IonListItem
                        button
                        lines="none"
                        onClick={() => {
                          console.log(
                            "View Details for",
                            upcomingAppointmentPopover.appointment,
                          );
                          setUpcomingAppointmentPopover({
                            show: false,
                            event: undefined,
                            appointment: null,
                          });
                        }}
                      >
                        <IonLabel>{t("viewDetails")}</IonLabel>
                      </IonListItem>
                    </IonList>
                  </IonPopover>
                </IonCardContent>
              </IonCard>

              {/* ── Doctor Cards Section — below upcoming appointment ─── */}
              <IonCard className="dash-doctor-cards-section">
                <IonCardContent>
                  <div className="home-section-head dash-doctor-section-head">
                    <h3 className="dash-doctor-section-title">Available Doctors</h3>
                    <IonButton
                      fill="clear"
                      size="small"
                      className="dash-doctor-see-all"
                      routerLink="/patient/consult"
                    >
                      {t("seeAll")}
                    </IonButton>
                  </div>

                  {consultFilteredDoctors.length === 0 ? (
                    <p className="dash-doctor-empty">{t("noDoctorsMatch")}</p>
                  ) : (
                    <div className="dash-doctor-scroll-row">
                      {consultFilteredDoctors.map((doctor) => (
                        <IonCard
                          key={doctor.id}
                          className="dash-doctor-card"
                          button={false}
                        >
                          {/* Profile image */}
                          <div className="dash-doctor-card-img-wrap">
                            <img
                              src={doctor.image || DEFAULT_AVATAR}
                              alt={`Dr. ${doctor.name}`}
                              className="dash-doctor-card-img"
                              onError={handleImageError}
                            />
                          </div>

                          {/* Info */}
                          <div className="dash-doctor-card-body">
                            <p className="dash-doctor-specialty">
                              {doctor.specialization || "Specialist"}
                            </p>
                            <h4 className="dash-doctor-name">
                              Dr. {doctor.name || doctor.userName}
                            </h4>
                            <p className="dash-doctor-rating">
                              <IonIcon icon={star} className="dash-star-icon" />
                              {doctor.rating} &middot; {doctor.experience}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="dash-doctor-card-actions">
                            <button
                              className="dash-doc-btn dash-doc-btn--call"
                              aria-label={`Call Dr. ${doctor.name}`}
                              onClick={() => {
                                setCallDoctorId(doctor.id);
                                setIsCallModalOpen(true);
                              }}
                            >
                              <FiPhone size={15} />
                              <span>Call</span>
                            </button>
                            <button
                              className="dash-doc-btn dash-doc-btn--msg"
                              aria-label={`Message Dr. ${doctor.name}`}
                              onClick={() =>
                                history.push(`/patient/consult?doctorId=${doctor.id}`)
                              }
                            >
                              <FiMessageSquare size={15} />
                              <span>Message</span>
                            </button>
                          </div>
                        </IonCard>
                      ))}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
              {/* ── End Doctor Cards Section ─────────────────────────────── */}

              {/* ── Map Preview Section ──────────────────────────────────── */}
              <IonCard className="dash-map-preview-card">
                <IonCardContent className="dash-map-preview-content">
                  <div className="home-section-head dash-map-section-head">
                    <h3>Health Units Near You</h3>
                  </div>

                  {/* Non-interactive leaflet map preview */}
                  <div className="dash-map-wrap">
                    <MapContainer
                      center={[4.1527, 9.2403]}
                      zoom={13}
                      zoomControl={false}
                      dragging={false}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                      touchZoom={false}
                      keyboard={false}
                      attributionControl={false}
                      className="dash-map-leaflet"
                    >
                      <InvalidateSize />
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* Marker pointing at Buea */}
                      <Marker position={[4.1527, 9.2403]} icon={dashMapMarkerIcon} />
                    </MapContainer>

                    {/* Gradient scrim */}
                    <div className="dash-map-overlay" />

                    {/* View Map button — bottom-right corner */}
                    <IonButton
                      className="dash-map-view-btn"
                      fill="outline"
                      routerLink="/patient/health_units_p"
                      aria-label="View health units map"
                    >
                      <IonIcon icon={locationOutline} slot="start" />
                      View Map
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
              {/* ── End Map Preview Section ───────────────────────────────── */}

              <IonCard className="home-top-doctors-card">
                <IonCardContent>
                  <div className="home-section-head">
                    <h3>{t("topDoctors")}</h3>
                    <IonButton
                      fill="clear"
                      size="small"
                      routerLink="/patient/specialties?all=1"
                    >
                      {t("seeAll")}
                    </IonButton>
                  </div>

                  <div className="home-doctor-list">
                    {featuredDoctors.length > 0 ? (
                      featuredDoctors.map((doctor) => (
                        <div className="home-doctor-item" key={doctor.id}>
                          <IonAvatar>
                            <img
                              src={doctor.image || DEFAULT_AVATAR}
                              alt={doctor.name}
                              onError={handleImageError}
                            />
                          </IonAvatar>
                          <div className="doctor-item-meta">
                            <p className="doctor-role">
                              {doctor.specialization || "Specialist"}
                            </p>
                            <h4>Dr. {doctor.name || doctor.userName}</h4>
                            <p className="doctor-rating-line">
                              <IonIcon icon={star} />
                              {doctor.rating} · {doctor.experience}
                            </p>
                          </div>
                          <IonButton
                            size="small"
                            className="doctor-book-mini-btn"
                            disabled={!doctor.available}
                            routerLink={
                              doctor.available
                                ? `/patient/book_appointment?doctorId=${doctor.id}`
                                : undefined
                            }
                          >
                            {t("bookNow")}
                          </IonButton>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state-text">
                        {t("noDoctorsMatch")}
                      </p>
                    )}
                  </div>
                </IonCardContent>
              </IonCard>

              {/* ── End Doctor Cards Section ─────────────────────────────── */}
            </div>

            {/* Audio Call Modal — opened from doctor cards */}
            <AudioCallModal
              isOpen={isCallModalOpen}
              onClose={() => {
                setIsCallModalOpen(false);
                setCallDoctorId("");
              }}
              doctorId={callDoctorId}
            />

            {/* Chatbot */}
            <VoiceflowChat />
            <IonFab
              vertical="bottom"
              horizontal="end"
              slot="fixed"
              style={{
                // Push the FAB above the tab bar AND the device safe area
                // (home indicator on iPhone, gesture bar on Android)
                marginBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
                marginRight: "env(safe-area-inset-right, 0px)",
              }}
            >
              <IonFabButton
                className="chatbot"
                aria-label="Open chat"
                onClick={handleOpenChat}
              >
                <IonIcon icon={chatbubbleEllipsesOutline} />
              </IonFabButton>
            </IonFab>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PatientDashboard;
