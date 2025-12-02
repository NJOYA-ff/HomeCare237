import React, { useEffect, useState } from "react";
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
  star,
  callOutline,
} from "ionicons/icons";
import "./Dashboard.scss";

import VoiceFlowChatModal from "./Chat-interface";
import { motion } from "framer-motion";
import { FiMenu } from "react-icons/fi";
import Menu from "@material-design-icons/svg/round/menu_open.svg";
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

const PatientDashboard: React.FC = () => {
  const [currentState, setCurrentState] = useState<string>("healthy");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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
        // Optionally redirect to login page
        // window.location.href = '/login';
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!userData.id) return;

    // Real-time listener for appointments
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("patientId", "==", userData.id),
      where("status", "in", ["scheduled", "confirmed"]),
      orderBy("date", "asc")
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
      }
    );

    // Real-time listener for health metrics
    const metricsQuery = query(
      collection(db, "healthMetrics"),
      where("patientId", "==", userData.id),
      orderBy("timestamp", "desc")
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
      }
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
              ref(storage, userDataFromFirestore.profileImage)
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
          where("status", "in", ["scheduled", "accepted"]),
          orderBy("date", "asc")
        )
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
          orderBy("timestamp", "desc")
        )
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
              ref(storage, doctorData.profileImage)
            );
          } catch (error) {
            console.log("Using default avatar for doctor:", doctorData.name);
          }
        }

        doctors.push({
          id: doc.id,
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
            <IonMenuButton>
              <IonIcon icon={Menu} />
            </IonMenuButton>
          </IonButtons>
          <IonTitle slot="start">HomeCare</IonTitle>
          <IonButton fill="clear" slot="end">
            <IonIcon icon={notificationsOutline} />
            <IonBadge color="danger">2</IonBadge>
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
            {/* Welcome Section */}
            <IonCard className="welcome-card">
              <IonCardContent>
                <IonGrid>
                  <IonRow className="ion-align-items-center">
                    <IonCol size="3">
                      <IonAvatar className="p-avatar">
                        <IonImg
                          src={
                            userData.profileImage ||
                            "https://ionicframework.com/docs/img/demos/avatar.svg"
                          }
                        />
                      </IonAvatar>
                    </IonCol>
                    <IonCol size="6">
                      <h2>Hello, {userData.name}!</h2>
                      <p>How are you feeling today?</p>
                    </IonCol>
                    <IonCol size="3" className="ion-text-end">
                      <IonItem lines="none" className="status-selector">
                        <IonSelect
                          value={currentState}
                          placeholder="Select state"
                          onIonChange={(e) =>
                            handleStateChange(e.detail.value!)
                          }
                          interface="popover"
                        >
                          <IonSelectOption value="healthy">
                            Healthy
                          </IonSelectOption>
                          <IonSelectOption value="mild">
                            Mild Symptoms
                          </IonSelectOption>
                          <IonSelectOption value="moderate">
                            Moderate Symptoms
                          </IonSelectOption>
                          <IonSelectOption value="severe">
                            Severe Symptoms
                          </IonSelectOption>
                          <IonSelectOption value="emergency">
                            Emergency
                          </IonSelectOption>
                        </IonSelect>
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Current Status Indicator */}
            <IonCard className="status-card">
              <IonCardContent>
                <IonItem lines="none">
                  <IonIcon
                    icon={locationOutline}
                    slot="start"
                    color="primary"
                  />
                  <IonLabel>
                    <h3>Current Status</h3>
                    <p>
                      Your health status is set to:{" "}
                      <strong>{currentState}</strong>
                    </p>
                  </IonLabel>
                </IonItem>
                <IonProgressBar
                  value={
                    currentState === "healthy"
                      ? 0.2
                      : currentState === "mild"
                      ? 0.4
                      : currentState === "moderate"
                      ? 0.6
                      : currentState === "severe"
                      ? 0.8
                      : 1
                  }
                  color={
                    currentState === "healthy"
                      ? "success"
                      : currentState === "mild"
                      ? "warning"
                      : currentState === "moderate"
                      ? "warning"
                      : currentState === "severe"
                      ? "danger"
                      : "danger"
                  }
                />
              </IonCardContent>
            </IonCard>

            {/* Health Metrics */}
            <IonCard className="health-metrics">
              <IonCardHeader>
                <IonCardTitle>Health Metrics</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    {healthMetrics.length > 0 ? (
                      healthMetrics.map((metric) => (
                        <IonCol size="6" key={metric.id}>
                          <IonCard className="metric-card" button>
                            <IonCardContent>
                              <IonIcon
                                icon={getMetricIcon(metric.name)}
                                color="primary"
                              />
                              <h3>{metric.name}</h3>
                              <p>{formatMetricValue(metric)}</p>
                              <IonChip
                                color={
                                  metric.status === "normal"
                                    ? "success"
                                    : metric.status === "warning"
                                    ? "warning"
                                    : metric.status === "critical"
                                    ? "danger"
                                    : "primary"
                                }
                              >
                                {metric.status}
                              </IonChip>
                            </IonCardContent>
                          </IonCard>
                        </IonCol>
                      ))
                    ) : (
                      <IonCol size="12">
                        <IonText color="medium">
                          <p className="ion-text-center">
                            No recent health metrics available
                          </p>
                        </IonText>
                      </IonCol>
                    )}
                    <IonCol size="6">
                      <IonCard
                        className="metric-card"
                        button
                        routerLink="/patient/appointments"
                      >
                        <IonCardContent>
                          <IonIcon icon={calendarOutline} color="primary" />
                          <h3>Next Appointment</h3>
                          <p>
                            {upcomingAppointments[0]
                              ? formatAppointmentDate(
                                  upcomingAppointments[0].date
                                )
                              : "No appointments"}
                          </p>
                          <IonChip color="primary">Scheduled</IonChip>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Available Doctors Section */}
            <IonCard className="available-doctor">
              <IonCardHeader>
                <IonCardTitle>Available Doctors</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    {availableDoctors.map((doctor) => (
                      <IonCol size="6" key={doctor.id}>
                        <IonCard className="doctor-card">
                          <IonCardContent>
                            <div className="doctor-header">
                              <IonAvatar className="doctor-avatar">
                                <img src={doctor.image} alt={doctor.name} />
                              </IonAvatar>
                              <div className="doctor-info">
                                <h4>Dr.{doctor.name}</h4> <br />
                                <p>{doctor.specialty}</p>
                              </div>
                            </div>

                            <div className="doctor-rating">
                              <IonIcon icon={star} color="warning" />
                              <span>{doctor.rating}</span>
                              <span className="experience">
                                • {doctor.experience}
                              </span>
                            </div>

                            <div className="doctor-availability">
                              <IonChip
                                color={doctor.available ? "success" : "medium"}
                                outline={!doctor.available}
                              >
                                {doctor.available
                                  ? "Available"
                                  : "Not Available"}
                              </IonChip>
                              <p className="next-available">
                                {doctor.available
                                  ? "Now"
                                  : doctor.nextAvailable}
                              </p>
                            </div>

                            <IonButton
                              className="book-now-btn"
                              expand="block"
                              size="small"
                              color={doctor.available ? "primary" : "medium"}
                              disabled={!doctor.available}
                              routerLink={
                                doctor.available
                                  ? `/patient/book_appointment?doctorId=${doctor.id}`
                                  : undefined
                              }
                            >
                              {doctor.available ? "Book Now" : "Unavailable"}
                            </IonButton>
                          </IonCardContent>
                        </IonCard>
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Upcoming Appointments */}
            <IonCard className="upcoming-app">
              <IonCardHeader>
                <IonCardTitle>Upcoming Appointments</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.slice(0, 3).map((appointment) => (
                    <IonItem
                      key={appointment.id}
                      className="appointment-item"
                      button
                    >
                      <IonAvatar slot="start">
                        <img
                          src={
                            "https://ionicframework.com/docs/img/demos/avatar.svg"
                          }
                          alt={appointment.doctorName}
                        />
                      </IonAvatar>
                      <IonLabel>
                        <h3>{appointment.doctorName}</h3>
                        <p>{appointment.doctorSpecialization}</p>
                        <p>{formatAppointmentDate(appointment.date)}</p>
                      </IonLabel>
                      <IonButton
                        fill="outline"
                        slot="end"
                        routerLink={`/patient/appointment/${appointment.id}`}
                      >
                        View
                      </IonButton>
                    </IonItem>
                  ))
                ) : (
                  <IonText color="medium">
                    <p className="ion-text-center">No upcoming appointments</p>
                  </IonText>
                )}
              </IonCardContent>
            </IonCard>

            {/* Quick Actions */}
            <IonCard className="quick-actions">
              <IonCardHeader>
                <IonCardTitle>Quick Actions</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonButton
                    routerLink="/patient/book_appointment"
                    fill="solid"
                    className="book-btn"
                  >
                    <IonIcon icon={calendarOutline} slot="start" />
                    Book Appointment
                  </IonButton>

                  <IonButton
                    className="medical-r-btn"
                    fill="outline"
                    routerLink="/patient/medical-records"
                  >
                    <IonIcon icon={documentTextOutline} slot="start" />
                    Medical Records
                  </IonButton>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Chatbot Fab */}
            <IonFab vertical="bottom" horizontal="end" slot="fixed">
              <IonFabButton
                className="chatbot-fab"
                onClick={() => setIsChatOpen(true)}
              >
                <IonIcon icon={chatbubbleEllipsesOutline} />
              </IonFabButton>
              <VoiceFlowChatModal
                {...({
                  isOpen: isChatOpen,
                  onClose: () => setIsChatOpen(false),
                  apiKey: "VF.YOUR_API_KEY_HERE",
                  versionID: "production",
                  userId: userData.id || "unknown-user",
                } as any)}
              />
            </IonFab>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PatientDashboard;
