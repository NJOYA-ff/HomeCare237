import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonAvatar,
  IonLabel,
  IonBadge,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonSearchbar,
  IonText,
  IonNote,
  createAnimation,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonMenuButton,
  IonChip,
} from "@ionic/react";
import GroupAddIcon from "@material-design-icons/svg/filled/group_add.svg";
import {
  calendar,
  person,
  location,
  time,
  star,
  notifications,
  chatbubbleEllipses,
  wallet,
  documents,
  arrowDownCircle,
  medical,
  close,
  filter,
  videocam,
  call,
} from "ionicons/icons";
import "./Doctor.scss";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { FiMenu } from "react-icons/fi";
import { useNotifications } from "../../context/NotificationContext";

// Updated Types to match your appointments data structure
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientImage: string;
  date: string;
  time: string;
  address: string;
  service: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "completed"
    | "confirmed"
    | "cancelled";
  phone: string;
  symptoms: string;
  duration: string;
  consultationFee: string;
  createdAt?: any;
  updatedAt?: any;
  // Additional fields for compatibility
  datetime?: Timestamp;
  location?: string;
  type?: "in-person" | "virtual";
  condition?: string;
  notes?: string;
  doctorId?: string;
}
interface Doctor {
  id: string;
  name: string;
  specialization: string;
  avatar: string;
  rating: number;
  reviews: number;
  region: string;
  city: string;
  address: string;
  consultationFee: number;
  languages: string[];
  availableSlots: string[];
  isAvailable: boolean;
  experience: number;
  email?: string;
  phone?: string;
}
interface Referral {
  id: string;
  referringDoctorId: string;
  referringDoctorName: string;
  receivingDoctorId: string;
  receivingDoctorName: string;
  receivingDoctorSpecialization: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  referralDate: string;
  reason: string;
  clinicalNotes: string;
  urgency: "routine" | "urgent" | "emergency";
  status: "pending" | "accepted" | "rejected" | "completed";
  additionalInstructions: string;
  createdAt: any;
  updatedAt: any;
  receivingDoctor?: Doctor;
  patient?: Patient;
  referringDoctor?: Doctor;
}
interface Patient {
  id: string;
  name: string;
  image: string;
  email: string;
  lastVisit: string;
  nextAppointment?: string;
  condition: string;
  status: "stable" | "critical" | "recovering";
  age: number;
  gender: "male" | "female" | "other";
  phone: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string[];
  allergies?: string[];
  currentMedications?: string[];
}

interface Stats {
  totalAppointments: number;
  completedAppointments: number;
  totalPatients: number;
  earnings: number;
  rating: number;
}

interface DoctorProfile {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
  address: string;
  experience: number;
  qualifications: string[];
  consultationFee: number;
  rating: number;
  totalRatings: number;
  availableSlots: string[];
}

type AnimationType = "spring" | "tween" | "keyframes";
type CustomVariants = Variants & {
  hidden: {
    opacity: number;
    y?: number;
    x?: number;
  };
  visible: (i: number) => {
    opacity: number;
    y?: number;
    x?: number;
    transition: {
      delay: number;
      duration: number;
      type: AnimationType;
      stiffness?: number;
    };
  };
};

const listItemVariants: CustomVariants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      type: "spring" as AnimationType,
      stiffness: 100,
    },
  }),
};

const DoctorDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    null,
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    earnings: 0,
    rating: 0,
  });
  const [segment, setSegment] = useState<"today" | "upcoming">("today");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const contentRef = useRef<HTMLIonContentElement>(null);
  const [showfilter, setShowFilter] = useState(false);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const { unreadCount, markAsRead, clearAll, sendLocalNotification } =
    useNotifications();
  // Safe value converter for Firestore data
  const safeValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    // Handle Firestore Timestamp
    if (
      value instanceof Object &&
      "seconds" in value &&
      "nanoseconds" in value
    ) {
      try {
        const timestamp = value as Timestamp;
        const date = timestamp.toDate();
        return date.toLocaleDateString("en-US");
      } catch (error) {
        return "Invalid Date";
      }
    }

    return String(value);
  };

  // Firebase initialization and auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadDoctorProfile(user.uid);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load doctor profile from Firestore
  const loadDoctorProfile = async (doctorId: string) => {
    try {
      const docRef = doc(db, "doctors", doctorId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const doctorData = docSnap.data();
        const profile = {
          id: docSnap.id,
          ...doctorData,
        } as DoctorProfile;

        setDoctorProfile(profile);
        await loadDashboardData(doctorId, profile);
      } else {
        console.log("No doctor profile found!");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading doctor profile:", error);
      setLoading(false);
    }
  };

  // Process appointment data to ensure compatibility
  const processAppointmentData = (docId: string, data: any): Appointment => {
    console.log("Processing appointment:", { id: docId, data });

    // Map your appointment fields to the expected structure
    return {
      id: docId,
      patientId: data.patientId || "",
      patientName: data.patientName || "Unknown Patient",
      patientImage:
        data.patientImage ||
        "https://ionicframework.com/docs/img/demos/avatar.svg",
      date: safeValue(data.date) || safeValue(data.createdAt) || "N/A",
      time: data.time || "N/A",
      address: data.address || "No address provided",
      service: data.service || "General Checkup",
      status: (data.status || "pending") as any,
      phone: data.phone || "No phone provided",
      symptoms: data.symptoms || "No symptoms provided",
      duration: data.duration || "30 mins",
      consultationFee: data.consultationFee || "0 XAF",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      // Additional fields for compatibility
      datetime: data.datetime || data.createdAt,
      location: data.address, // Use address as location
      type: data.type || "in-person",
      condition: data.symptoms, // Use symptoms as condition
      notes: data.notes || "",
      doctorId: data.doctorId || currentUser?.uid || "",
    };
  };

  // Load dashboard data from Firestore
  const loadDashboardData = async (
    doctorId: string,
    profile: DoctorProfile,
  ) => {
    try {
      setLoading(true);

      // Load appointments - UNCOMMENTED the queries
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("doctorId", "==", doctorId), // UNCOMMENTED
        orderBy("createdAt", "desc"), // UNCOMMENTED - using createdAt for ordering
        limit(50), // UNCOMMENTED
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData: Appointment[] = [];
      const patientIds = new Set<string>();

      appointmentsSnapshot.forEach((doc) => {
        const appointment = processAppointmentData(doc.id, doc.data());
        appointmentsData.push(appointment);

        if (appointment.patientId) {
          patientIds.add(appointment.patientId);
        }
      });

      console.log("Loaded appointments:", appointmentsData);
      setAppointments(appointmentsData);
      setFilteredAppointments(appointmentsData); // Initialize filtered appointments

      // Load recent patients
      const patientsData: Patient[] = [];
      for (const patientId of Array.from(patientIds).slice(0, 10)) {
        try {
          const patientDoc = await getDoc(doc(db, "patients", patientId));
          if (patientDoc.exists()) {
            const patientData = patientDoc.data();
            patientsData.push({
              id: patientDoc.id,
              name: patientData.name || "Unknown Patient",
              image:
                patientData.profilePicture ||
                "https://ionicframework.com/docs/img/demos/avatar.svg",
              email: patientData.email || "",
              lastVisit: patientData.lastVisit || "Never",
              condition: patientData.condition || "No condition specified",
              status:
                (patientData.status as "stable" | "critical" | "recovering") ||
                "stable",
              age: patientData.age || 0,
              gender:
                (patientData.gender as "male" | "female" | "other") || "other",
              phone: patientData.phone || "No phone",
              address: patientData.address,
              emergencyContact: patientData.emergencyContact,
              medicalHistory: patientData.medicalHistory || [],
              allergies: patientData.allergies || [],
              currentMedications: patientData.currentMedications || [],
            });
          }
        } catch (error) {
          console.error(`Error loading patient ${patientId}:`, error);
        }
      }

      setRecentPatients(patientsData);

      // Load received referrals
      try {
        const referralsQuery = query(
          collection(db, "referrals"),
          where("receivingDoctorId", "==", doctorId),
          orderBy("createdAt", "desc"),
          limit(50),
        );
        const referralsSnapshot = await getDocs(referralsQuery);
        const referrals: Referral[] = [];
        referralsSnapshot.forEach((rDoc) => {
          referrals.push({ id: rDoc.id, ...(rDoc.data() as any) } as Referral);
        });
        setReceivedReferrals(referrals);
      } catch (err) {
        console.error("Error loading received referrals:", err);
      }

      // Calculate stats
      const totalAppointments = appointmentsData.length;
      const completedAppointments = appointmentsData.filter(
        (app) => app.status === "completed" || app.status === "accepted",
      ).length;

      const totalPatients = patientIds.size;
      const consultationFee = profile?.consultationFee || 5000;

      // Calculate earnings from completed appointments
      const earnings = appointmentsData
        .filter(
          (app) => app.status === "completed" || app.status === "accepted",
        )
        .reduce((total, app) => {
          const fee = parseInt(app.consultationFee) || consultationFee;
          return total + fee;
        }, 0);

      const rating = profile?.rating || 0;

      setStats({
        totalAppointments,
        completedAppointments,
        totalPatients,
        earnings,
        rating,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoading(false);
    }
  };

  // Real-time updates for appointments
  useEffect(() => {
    if (!currentUser) return;

    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("doctorId", "==", currentUser.uid), // UNCOMMENTED
      orderBy("createdAt", "desc"), // UNCOMMENTED
      limit(50), // UNCOMMENTED
    );

    const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
      const updatedAppointments: Appointment[] = [];
      const patientIds = new Set<string>();

      snapshot.forEach((doc) => {
        const appointment = processAppointmentData(doc.id, doc.data());
        updatedAppointments.push(appointment);

        if (appointment.patientId) {
          patientIds.add(appointment.patientId);
        }
      });

      console.log("Real-time appointments update:", updatedAppointments);
      setAppointments(updatedAppointments);

      // Update stats
      const completedAppointments = updatedAppointments.filter(
        (app) => app.status === "completed" || app.status === "accepted",
      ).length;

      const consultationFee = doctorProfile?.consultationFee || 5000;
      const earnings = updatedAppointments
        .filter(
          (app) => app.status === "completed" || app.status === "accepted",
        )
        .reduce((total, app) => {
          const fee = parseInt(app.consultationFee) || consultationFee;
          return total + fee;
        }, 0);

      setStats((prev) => ({
        ...prev,
        totalAppointments: updatedAppointments.length,
        completedAppointments,
        totalPatients: patientIds.size,
        earnings,
      }));
    });

    return () => unsubscribe();
  }, [currentUser, doctorProfile]);

  const handleshowfilter = () => {
    setShowFilter(!showfilter);
  };

  // Filter appointments based on search and status - FIXED
  useEffect(() => {
    let result = appointments;

    // Filter by search text
    if (searchText) {
      result = result.filter(
        (app) =>
          app.patientName.toLowerCase().includes(searchText.toLowerCase()) ||
          (app.service &&
            app.service.toLowerCase().includes(searchText.toLowerCase())) ||
          (app.symptoms &&
            app.symptoms.toLowerCase().includes(searchText.toLowerCase())),
      );
    }

    // Filter by status - map status values for compatibility
    if (filterStatus !== "all") {
      result = result.filter((app) => {
        // Map status values: "accepted" -> "confirmed", etc.
        if (filterStatus === "confirmed") {
          return app.status === "accepted" || app.status === "confirmed";
        }
        return app.status === filterStatus;
      });
    }

    console.log("Filtered appointments:", result.length);
    setFilteredAppointments(result);
  }, [searchText, filterStatus, appointments]);

  // Animation effects
  useEffect(() => {
    if (loading) return;

    const statsCards = document.querySelectorAll(".stats-card");
    statsCards.forEach((card, index) => {
      const animation = createAnimation()
        .addElement(card)
        .duration(600)
        .delay(100 * index)
        .fromTo("transform", "translateY(30px)", "translateY(0px)")
        .fromTo("opacity", "0", "1");
      animation.play();
    });

    const content = document.querySelector(".dashboard-content");
    if (content) {
      const animation = createAnimation()
        .addElement(content)
        .duration(800)
        .fromTo("opacity", "0", "1");
      animation.play();
    }
  }, [loading]);

  const doRefresh = async (event: any) => {
    if (currentUser) {
      await loadDoctorProfile(currentUser.uid);
    }
    event.detail.complete();
  };

  const formatCurrency = (amount: number): string => {
    return `FCFA ${amount.toLocaleString("fr-FR")}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "confirmed":
      case "accepted":
        return "success";
      case "pending":
        return "warning";
      case "completed":
        return "primary";
      case "cancelled":
      case "rejected":
        return "danger";
      case "stable":
        return "success";
      case "recovering":
        return "warning";
      case "critical":
        return "danger";
      default:
        return "medium";
    }
  };

  const getStatusDisplay = (status: string): string => {
    switch (status) {
      case "accepted":
        return "confirmed";
      case "rejected":
        return "cancelled";
      default:
        return status;
    }
  };

  const viewAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: Appointment["status"],
  ) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        status,
        updatedAt: Timestamp.now(),
      });

      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, status });
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // FIXED: Better date comparison for appointments
  const getDayAppointments = useCallback((): Appointment[] => {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    if (segment === "today") {
      return filteredAppointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.date);
        const appointmentDateString = appointmentDate
          .toISOString()
          .split("T")[0];
        return appointmentDateString === todayString;
      });
    } else {
      // For upcoming, show all appointments from today onwards
      return filteredAppointments.filter((appointment) => {
        try {
          const appointmentDate = new Date(appointment.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return appointmentDate >= today;
        } catch (error) {
          console.error("Error parsing appointment date:", appointment.date);
          return false;
        }
      });
    }
  }, [filteredAppointments, segment]);

  const handleSegmentChange = (e: CustomEvent) => {
    setSegment(e.detail.value as "today" | "upcoming");
  };

  const handleStatusFilterChange = (e: CustomEvent) => {
    setFilterStatus(e.detail.value);
  };

  // Helper to format date for display
  const formatDisplayDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatLastVisit = (dateString: string): string => {
    if (!dateString || dateString === "Never") {
      return "Never";
    }
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if date is invalid
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString; // Return original string in case of an error
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border dashboard-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton>
              <FiMenu size={20} />{" "}
            </IonMenuButton>
          </IonButtons>
          <IonTitle>
            {doctorProfile ? `Dr. ${doctorProfile.name}` : "Doctor Dashboard"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/doc/notification">
              <IonIcon icon={notifications} />
              {unreadCount > 0 && (
                <IonBadge color="danger" style={{ marginLeft: "8px" }}>
                  {unreadCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="dashboard-content-p" ref={contentRef}>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent
            pullingIcon={arrowDownCircle}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          ></IonRefresherContent>
        </IonRefresher>

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
            <div className="welcome-section ion-padding">
              <IonText color="dark">
                <h1>
                  {getGreeting()},{" "}
                  {doctorProfile ? `Dr. ${doctorProfile.name}` : "Doctor"}
                </h1>
                <p>
                  Here's your schedule for{" "}
                  {segment === "today" ? "today" : "upcoming days"}
                </p>
              </IonText>
            </div>

            {/* Stats Overview */}
            <IonGrid className="stats-grid ion-padding">
              <IonRow>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="stats-card animated-card" button>
                    <IonCardContent>
                      <div
                        className="stat-icon-container"
                        style={{
                          background: "rgba(var(--ion-color-primary-rgb), 0.1)",
                        }}
                      >
                        <IonIcon icon={calendar} color="primary" />
                      </div>
                      <IonCardTitle>{stats.totalAppointments}</IonCardTitle>
                      <IonNote>Appointments</IonNote>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="stats-card animated-card" button>
                    <IonCardContent>
                      <div
                        className="stat-icon-container"
                        style={{
                          background:
                            "rgba(var(--ion-color-secondary-rgb), 0.1)",
                        }}
                      >
                        <IonIcon icon={person} color="secondary" />
                      </div>
                      <IonCardTitle>{stats.totalPatients}</IonCardTitle>
                      <IonNote>Patients</IonNote>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="stats-card animated-card" button>
                    <IonCardContent>
                      <div
                        className="stat-icon-container"
                        style={{
                          background: "rgba(var(--ion-color-success-rgb), 0.1)",
                        }}
                      >
                        <IonIcon icon={GroupAddIcon} color="success" />
                      </div>
                      <IonCardTitle>{receivedReferrals.length}</IonCardTitle>
                      <IonNote>Referrals</IonNote>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="stats-card animated-card" button>
                    <IonCardContent>
                      <div
                        className="stat-icon-container"
                        style={{
                          background: "rgba(var(--ion-color-warning-rgb), 0.1)",
                        }}
                      >
                        <IonIcon icon={star} color="warning" />
                      </div>
                      <IonCardTitle>{stats.rating}/5</IonCardTitle>
                      <IonNote>Rating</IonNote>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Appointments Section */}
            <div className="appointments-section ion-padding">
              <div className="section-header">
                <IonText color="dark">
                  <h2>Appointments</h2>
                  <p className="appointment-count">
                    {getDayAppointments().length}{" "}
                    {segment === "today" ? "today" : "upcoming"}
                  </p>
                </IonText>

                <div className="controls-container">
                  <IonSegment value={segment} onIonChange={handleSegmentChange}>
                    <IonSegmentButton value="today">
                      <IonLabel>Today</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="upcoming">
                      <IonLabel>Upcoming</IonLabel>
                    </IonSegmentButton>
                  </IonSegment>
                </div>
              </div>

              <div slot="header">
                <IonSearchbar
                  placeholder="Search appointments..."
                  value={searchText}
                  onIonInput={(e) => setSearchText(e.detail.value!)}
                />
              </div>

              <div className="ion-padding" slot="content">
                <IonText>
                  <h4>Filter by status</h4>
                </IonText>
                <AnimatePresence>
                  {showfilter && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IonSegment
                        value={filterStatus}
                        onIonChange={handleStatusFilterChange}
                      >
                        <IonSegmentButton value="all">
                          <IonLabel>All</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="confirmed">
                          <IonLabel>Confirmed</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="pending">
                          <IonLabel>Pending</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="completed">
                          <IonLabel>Completed</IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <IonList className="appointment-list animated-list">
                {getDayAppointments().map((appointment, index) => (
                  <IonItem
                    key={appointment.id}
                    className="appointment-item animated-item"
                    button
                    detail={false}
                    onClick={() => viewAppointmentDetails(appointment)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <IonAvatar slot="start" className="patients-avatar">
                      <img
                        src={appointment.patientImage}
                        alt={appointment.patientName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://ionicframework.com/docs/img/demos/avatar.svg";
                        }}
                      />
                    </IonAvatar>
                    <IonLabel>
                      <h2>{appointment.patientName}</h2>
                      <div className="appointment-meta">
                        <IonNote className="meta-item">
                          <IonIcon className="meta-icon" icon={time} />
                          <span className="meta-text">{appointment.time}</span>
                        </IonNote>
                        {segment === "upcoming" && (
                          <IonNote className="meta-item">
                            <IonIcon className="meta-icon" icon={calendar} />
                            <span className="meta-text">
                              {formatDisplayDate(appointment.date)}
                            </span>
                          </IonNote>
                        )}
                        {appointment.address && (
                          <IonNote className="meta-item">
                            <IonIcon className="meta-icon" icon={location} />
                            <span className="meta-text">
                              {appointment.address}
                            </span>
                          </IonNote>
                        )}
                        {appointment.service && (
                          <IonNote className="meta-item">
                            <IonIcon className="meta-icon" icon={medical} />
                            <span className="meta-text">
                              {appointment.service}
                            </span>
                          </IonNote>
                        )}
                      </div>
                    </IonLabel>
                    <IonChip color={getStatusColor(appointment.status)}>
                      {getStatusDisplay(appointment.status)}
                    </IonChip>
                  </IonItem>
                ))}
              </IonList>

              {getDayAppointments().length === 0 && (
                <div className="empty-state">
                  <IonIcon icon={calendar} color="medium" />
                  <IonText color="medium">
                    <p>No {segment} appointments found</p>
                  </IonText>
                  <IonButton
                    fill="clear"
                    color="primary"
                    onClick={() => {
                      setFilterStatus("all");
                      setSearchText("");
                    }}
                  >
                    Clear filters
                  </IonButton>
                </div>
              )}
            </div>

            {/* Recent Patients Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.01 }}
            >
              <IonCard className="activity-card">
                <IonCardHeader>
                  <IonCardTitle>Recent Patients</IonCardTitle>
                  <IonCardSubtitle>
                    {recentPatients.length} patients
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList lines="none" className="patient-list">
                    {recentPatients.map((patient, index) => (
                      <motion.div
                        key={patient.id}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        variants={listItemVariants}
                        whileHover={{ x: 5 }}
                      >
                        <IonItem className="patient-item" button detail>
                          <IonAvatar slot="start">
                            <img src={patient.image} alt={patient.name} />
                          </IonAvatar>
                          <IonLabel>
                            <h2>{patient.name}</h2>
                            <p>{patient.condition}</p>
                          </IonLabel>
                          <div className="patient-status">
                            <IonChip color={getStatusColor(patient.status)}>
                              {patient.status}
                            </IonChip>
                            <p className="last-checkup">
                              <IonIcon icon={time} />
                              {formatLastVisit(patient.lastVisit)}
                            </p>
                          </div>
                        </IonItem>
                      </motion.div>
                    ))}
                  </IonList>
                  {recentPatients.length === 0 && (
                    <div className="empty-state ion-text-center ion-padding">
                      <IonIcon icon={person} color="medium" size="large" />
                      <IonText color="medium">
                        <p>No recent patients found</p>
                      </IonText>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </motion.div>
          </>
        )}

        {/* Appointment Detail Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Appointment Details</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedAppointment && (
              <div className="appointment-detail">
                <div className="patient-header">
                  <IonAvatar className="detail-avatar">
                    <img
                      src={selectedAppointment.patientImage}
                      alt={selectedAppointment.patientName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://ionicframework.com/docs/img/demos/avatar.svg";
                      }}
                    />
                  </IonAvatar>
                  <div className="patient-detail">
                    <h2>{selectedAppointment.patientName}</h2>
                    <IonBadge
                      color={getStatusColor(selectedAppointment.status)}
                    >
                      {getStatusDisplay(selectedAppointment.status)}
                    </IonBadge>
                  </div>
                </div>

                <IonList lines="full">
                  <IonItem>
                    <IonIcon icon={time} slot="start" color="primary" />
                    <IonLabel>
                      <p>Time</p>
                      <h3>{selectedAppointment.time}</h3>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonIcon icon={calendar} slot="start" color="primary" />
                    <IonLabel>
                      <p>Date</p>
                      <h3>{formatDisplayDate(selectedAppointment.date)}</h3>
                    </IonLabel>
                  </IonItem>
                  {selectedAppointment.address && (
                    <IonItem>
                      <IonIcon icon={location} slot="start" color="primary" />
                      <IonLabel>
                        <p>Location</p>
                        <h3>{selectedAppointment.address}</h3>
                      </IonLabel>
                    </IonItem>
                  )}
                  <IonItem>
                    <IonIcon icon={videocam} slot="start" color="primary" />
                    <IonLabel>
                      <p>Type</p>
                      <h3>
                        {selectedAppointment.type === "virtual"
                          ? "Virtual Consultation"
                          : "In-Person Visit"}
                      </h3>
                    </IonLabel>
                  </IonItem>
                  {selectedAppointment.service && (
                    <IonItem>
                      <IonIcon icon={medical} slot="start" color="primary" />
                      <IonLabel>
                        <p>Service</p>
                        <h3>{selectedAppointment.service}</h3>
                      </IonLabel>
                    </IonItem>
                  )}
                  {selectedAppointment.symptoms && (
                    <IonItem>
                      <IonIcon icon={documents} slot="start" color="primary" />
                      <IonLabel>
                        <p>Symptoms</p>
                        <h3>{selectedAppointment.symptoms}</h3>
                      </IonLabel>
                    </IonItem>
                  )}
                  <IonItem>
                    <IonIcon icon={wallet} slot="start" color="primary" />
                    <IonLabel>
                      <p>Consultation Fee</p>
                      <h3>{selectedAppointment.consultationFee}</h3>
                    </IonLabel>
                  </IonItem>
                </IonList>

                <div className="action-buttons">
                  {selectedAppointment.status === "pending" && (
                    <>
                      <IonButton
                        expand="block"
                        color="success"
                        onClick={() =>
                          updateAppointmentStatus(
                            selectedAppointment.id,
                            "accepted",
                          )
                        }
                      >
                        Confirm Appointment
                      </IonButton>
                      <IonButton
                        expand="block"
                        color="danger"
                        fill="outline"
                        onClick={() =>
                          updateAppointmentStatus(
                            selectedAppointment.id,
                            "rejected",
                          )
                        }
                      >
                        Cancel Appointment
                      </IonButton>
                    </>
                  )}
                  {(selectedAppointment.status === "accepted" ||
                    selectedAppointment.status === "confirmed") && (
                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={() =>
                        updateAppointmentStatus(
                          selectedAppointment.id,
                          "completed",
                        )
                      }
                    >
                      Mark as Completed
                    </IonButton>
                  )}
                  <IonButton expand="block" color="primary">
                    <IonIcon icon={call} slot="start" />
                    Call Patient
                  </IonButton>
                  <IonButton expand="block" color="secondary" fill="outline">
                    <IonIcon icon={chatbubbleEllipses} slot="start" />
                    Send Message
                  </IonButton>
                  {selectedAppointment.type === "virtual" && (
                    <IonButton expand="block" color="tertiary">
                      <IonIcon icon={videocam} slot="start" />
                      Start Video Call
                    </IonButton>
                  )}
                </div>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default DoctorDashboard;
