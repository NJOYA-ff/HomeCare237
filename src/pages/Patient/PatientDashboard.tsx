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
  IonAlert,
  IonToast,
  IonPopover,
  IonList,
  IonItem as IonListItem,
} from "@ionic/react";
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
  timeOutline,
  callOutline,
  chevronForward,
  fitness,
  ellipsisHorizontal,
} from "ionicons/icons";
import { medicalIcons, ioniconsMedical } from "../../utils/MedicalIcons";
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
import { motion } from "framer-motion";
declare global {
  interface Window {
    voiceflow?: any;
  }
}
import { FiMenu } from "react-icons/fi";
import Menu from "@material-design-icons/svg/round/menu_open.svg";
import { useNotifications } from "../../context/NotificationContext";
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
  specialty: string;
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
      where("status", "in", ["pending", "confirmed"]),
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

      // Load available doctors
      await loadAvailableDoctors();

      // Load initial appointments if real-time listener hasn't populated yet
      const appointmentsSnapshot = await getDocs(
        query(
          collection(db, "appointments"),
          where("patientId", "==", userId),
          where("status", "in", ["pending", "accepted"]),
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

  // Load available doctors from Firestore
  const loadAvailableDoctors = async () => {
    try {
      const doctorsSnapshot = await getDocs(query(collection(db, "doctors")));

      const doctors: Doctor[] = [];
      for (const doc of doctorsSnapshot.docs) {
        const doctorData = doc.data();
        let imageUrl = "https://ionicframework.com/docs/img/demos/avatar.svg";

        // Try to get doctor's profile image
        if (doctorData.profileImage) {
          try {
            imageUrl = await getDownloadURL(
              ref(storage, doctorData.profileImage),
            );
          } catch (error) {
            console.log("Using default avatar for doctor:", doctorData.name);
          }
        }

        doctors.push({
          id: doc.id,
          userName: doctorData.userName || "doctor",
          name: doctorData.name,
          specialty: doctorData.specialization,
          rating: doctorData.rating || 4.5,
          experience: doctorData.experience || "5 years",
          image: imageUrl,
          available: doctorData.available || true,
          nextAvailable: doctorData.nextAvailable || "Not available",
          email: doctorData.email || "No email",
        });
      }

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
        await loadAvailableDoctors();
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

  // Format date for display
  const formatAppointmentDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "No date";

    try {
      const date = timestamp.toDate();
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
        return (
          date.toLocaleDateString() +
          ", " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

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

      // Normalize appointment dates to JS Date objects
      const mapped = upcomingAppointments.map((a) => ({
        ...a,
        _dateObj:
          a.date && typeof (a.date as any).toDate === "function"
            ? (a.date as any).toDate()
            : new Date(a.date as any),
      }));

      // Filter future appointments (including today) and sort ascending (soonest first)
      const future = mapped
        .filter((a) => a._dateObj.getTime() >= now.getTime())
        .sort((x, y) => x._dateObj.getTime() - y._dateObj.getTime());

      if (future.length > 0)
        return future[0] as Appointment & { _dateObj: Date };

      // Fallback: return the soonest appointment by date even if it's in the past
      const allSorted = mapped.sort(
        (x, y) => x._dateObj.getTime() - y._dateObj.getTime(),
      );
      return allSorted[0] as Appointment & { _dateObj: Date };
    } catch (error) {
      console.error("Error computing next appointment:", error);
      return upcomingAppointments[0] || null;
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
        const specialtyText = (doctor.specialty || "").toLowerCase();
        const matchesQuery = !queryText || specialtyText.includes(queryText);
        const matchesSelectedCategory =
          !selectedCategory ||
          specialtyText.includes(selectedCategory.toLowerCase());
        return matchesQuery && matchesSelectedCategory;
      })
      .slice(0, 4);
  }, [availableDoctors, doctorQuery, selectedCategory]);

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
            <IonIcon icon={notificationsOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard-patient">
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent
            pullingIcon={arrowDownCircle}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          ></IonRefresherContent>
        </IonRefresher>

        {/* Alerts and Toasts */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={["OK"]}
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
            <IonText className="ion-text-center ion-padding">
              <p>Loading your dashboard...</p>
            </IonText>
          </div>
        ) : (
          <>
            <div className="patient-home-shell">
              <IonCard className="patient-home-intro">
                <IonCardContent>
                  <p className="tiny-greeting">Hello {userData.name || ""}!</p>
                  <h2 className="home-title">Find your Specialist</h2>
                  <br />
                  <div className="home-search-wrap">
                    <IonIcon icon={searchOutline} />
                    <input
                      value={doctorQuery}
                      onChange={(e) => setDoctorQuery(e.target.value)}
                      placeholder="Search specialist category"
                    />
                    <IonButton fill="clear" size="small">
                      <IonIcon icon={chatbubbleEllipsesOutline} />
                    </IonButton>
                  </div>

                  <div className="home-section-head">
                    <h3>Categories</h3>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={(e) => {
                        setCategoryPopoverEvent(e.nativeEvent);
                        setShowCategoryPopover(true);
                      }}
                    >
                      See all
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
                      <p className="empty-state-text">No category found.</p>
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
                    <h3>Upcoming Appointment</h3>
                    <IonButton fill="clear" size="small">
                      See all
                    </IonButton>
                  </div>

                  {nextAppointment ? (
                    <div className="upcoming-highlight">
                      <IonAvatar>
                        <img
                          src="https://ionicframework.com/docs/img/demos/avatar.svg"
                          alt={nextAppointment.doctorName}
                        />
                      </IonAvatar>
                      <div className="upcoming-meta">
                        <p className="appointment-time">
                          <IonIcon icon={timeOutline} />
                          {formatAppointmentDate(nextAppointment.date)}
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
                    <p className="empty-state-text">No upcoming appointments</p>
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
                        onClick={() => {
                          // For now, just log it. A modal would be better.
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
                        <IonLabel>View Details</IonLabel>
                      </IonListItem>
                      <IonListItem
                        button
                        routerLink={`/patient/book_appointment?appointmentId=${upcomingAppointmentPopover.appointment?.id}`}
                        onClick={() =>
                          setUpcomingAppointmentPopover({
                            show: false,
                            event: undefined,
                            appointment: null,
                          })
                        }
                      >
                        <IonLabel>Reschedule</IonLabel>
                      </IonListItem>
                      <IonListItem
                        button
                        lines="none"
                        onClick={() => {
                          console.log("Cancel appointment");
                          setUpcomingAppointmentPopover({
                            show: false,
                            event: undefined,
                            appointment: null,
                          });
                        }}
                      >
                        <IonLabel color="danger">Cancel Appointment</IonLabel>
                      </IonListItem>
                    </IonList>
                  </IonPopover>
                </IonCardContent>
              </IonCard>

              <IonCard className="home-top-doctors-card">
                <IonCardContent>
                  <div className="home-section-head">
                    <h3>Top Doctor&apos;s For You</h3>
                    <IonButton
                      fill="clear"
                      size="small"
                      routerLink="/patient/specialties"
                    >
                      See all
                    </IonButton>
                  </div>

                  <div className="home-doctor-list">
                    {featuredDoctors.length > 0 ? (
                      featuredDoctors.map((doctor) => (
                        <div className="home-doctor-item" key={doctor.id}>
                          <IonAvatar>
                            <img src={doctor.image} alt={doctor.name} />
                          </IonAvatar>
                          <div className="doctor-item-meta">
                            <p className="doctor-role">
                              {doctor.specialty || "Specialist"}
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
                            Book Now
                          </IonButton>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state-text">
                        No doctors match this search right now.
                      </p>
                    )}
                  </div>
                </IonCardContent>
              </IonCard>
            </div>

            {/* Chatbot */}
            <VoiceflowChat />
            <IonFab vertical="bottom" horizontal="end" slot="fixed">
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
