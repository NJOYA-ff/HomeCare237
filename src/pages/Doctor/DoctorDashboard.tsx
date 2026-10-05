import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import LoadingHelix from "../../components/LoadingHelix";
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
  IonInput,
  IonTextarea,
  IonToggle,
} from "@ionic/react";
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
  videocam,
  call,
  add,
  closeCircleOutline,
  checkmarkCircleOutline,
  peopleOutline,
  calendarOutline,
} from "ionicons/icons";
import { appointmentDate, dashboardAnalytics, canUpdateAppointment } from "../../components/Services/doctorDashboardAnalytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useIonToast } from "@ionic/react";
import { runTransaction, addDoc } from "firebase/firestore";
import { useMessageBox } from "../../components/ui/useMessageBox";
import { EmptyState } from "../../components/ui";
import "./Doctor.scss";
import { DEFAULT_AVATAR, getDocumentImageUrl, handleImageError } from "../../utils/profileImageStorage";
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
import { motion, Variants } from "framer-motion";
import { FiMenu, FiClock, FiCalendar, FiMapPin, FiFileText, FiPhone, FiMessageSquare, FiVideo } from "react-icons/fi";
import { helix } from "ldrs";
import { FaStethoscope } from "react-icons/fa";
import { useNotifications } from "../../context/NotificationContext";
import { useSettings } from "../../context/SettingsContext";

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
  const { t } = useSettings();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    null,
  );
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const analytics = useMemo(() => dashboardAnalytics(appointments), [appointments]);
  const stats: Stats = { ...analytics, rating: doctorProfile?.rating || 0 };
  const presentMessage = useMessageBox();
  const [presentToast] = useIonToast();
  const updatingRef = useRef(false);
  const [updating, setUpdating] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [segment, setSegment] = useState<"today" | "upcoming">("today");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [searchText, setSearchText] = useState("");
  const contentRef = useRef<HTMLIonContentElement>(null);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const { unreadCount, markAsRead, clearAll, sendLocalNotification } =
    useNotifications();
  
  // Available slots modal state
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [tempSlots, setTempSlots] = useState<string[]>([]);
  const [slotInput, setSlotInput] = useState("");
  const slotInputRef = useRef<HTMLIonInputElement>(null);

  // Register the helix component
  useEffect(() => {
    helix.register();
  }, []);

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
        // Show profile banner on first visit
        const key = `hc_profile_banner_dismissed_${user.uid}`;
        if (!localStorage.getItem(key)) {
          setShowProfileBanner(true);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const dismissProfileBanner = () => {
    if (!currentUser) return;
    const key = `hc_profile_banner_dismissed_${currentUser.uid}`;
    localStorage.setItem(key, "1");
    setShowProfileBanner(false);
  };

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
      // Resolved from the patient document later; `data.patientImage` is never
      // written by the booking flow.
      patientImage: data.patientImage || "",
      date: safeValue(data.date) || safeValue(data.createdAt) || "N/A",
      time: data.time || "N/A",
      address: data.address || "No address provided",
      service: data.service || "General Checkup",
      status: (data.status || "pending") as any,
      phone: data.phone || "No phone provided",
      symptoms: data.symptoms || "No symptoms provided",
      duration: data.duration || "30 mins",
      consultationFee: data.consultationFee ?? "",
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
              // `profilePicture` is never written; signup stores `profilePhoto`.
              image: await getDocumentImageUrl(patientData),
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

    }, () => {
      setDashboardError("Live appointment updates are unavailable. Pull to refresh to retry.");
    });

    return () => unsubscribe();
  }, [currentUser, doctorProfile]);

  // Filter appointments based on search
  const filteredAppointments = useMemo(() => {
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

    console.log("Filtered appointments:", result.length);
    return result;
  }, [searchText, appointments]);

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
    if (!currentUser || updatingRef.current) return;
    updatingRef.current = true;
    setUpdating(true);
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      const saved = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(appointmentRef);
        const data = snapshot.data();
        if (!data || data.doctorId !== currentUser.uid ||
          !canUpdateAppointment(data.status, status)) {
          throw new Error("This appointment has changed or is no longer available. Refresh and try again.");
        }
        transaction.update(appointmentRef, { status, updatedAt: Timestamp.now() });
        return data;
      });
      setAppointments((items) => items.map((item) => item.id === appointmentId ? { ...item, status } : item));
      setSelectedAppointment((item) => item?.id === appointmentId ? { ...item, status } : item);
      let message = `Appointment ${status}.`;
      try {
        if (saved.patientId) {
          await addDoc(collection(db, "notifications"), {
            recipientId: saved.patientId,
            title: `Appointment ${status}`,
            body: `Your appointment on ${safeValue(saved.date)} at ${saved.time || "the scheduled time"} with Dr. ${doctorProfile?.name || "your doctor"} has been ${status}.`,
            timestamp: Timestamp.now(),
            read: false,
          });
        }
      } catch {
        message += " Saved, but the patient notification could not be delivered.";
      }
      void presentToast({ message, duration: 4000 });
    } catch (error) {
      void presentToast({ message: error instanceof Error ? error.message : "Could not update appointment. Please try again.", duration: 5000, color: "danger" });
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  const confirmStatusUpdate = (appointment: Appointment, status: Appointment["status"]) => {
    if (updatingRef.current) return;
    void presentMessage({
      header: status === "accepted" ? "Accept appointment?" : status === "rejected" ? "Reject appointment?" : "Complete appointment?",
      message: "Confirm this change to the selected appointment. The patient will be notified in the app.",
      /* Accepting is the expected path and stays primary; rejecting withdraws the
         appointment, so that action carries the danger colour. Cancel is quiet —
         leaving the appointment as it is is the safe default. */
      action: {
        text: "Confirm",
        color: status === "rejected" ? "danger" : "primary",
        handler: () => { void updateAppointmentStatus(appointment.id, status); },
      },
      cancel: { text: "Keep unchanged" },
    });
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t("goodMorning");
    if (hour < 18) return t("goodAfternoon");
    return t("goodEvening");
  };

  // Available slots management functions
  const openSlotsModal = () => {
    setTempSlots(doctorProfile?.availableSlots || []);
    setShowSlotsModal(true);
  };

  const closeSlotsModal = () => {
    setShowSlotsModal(false);
    setSlotInput("");
  };

  const addSlot = async () => {
    if (!slotInput.trim()) return;

    // Validate time format (HH:MM, 24-hour)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slotInput.trim())) {
      void presentToast({
        message: "Please enter time in HH:MM (24-hour) format (e.g., 09:00, 14:30)",
        duration: 3000,
        color: "danger",
      });
      return;
    }

    try {
      setSlotsLoading(true);
      const updatedSlots = [...tempSlots, slotInput.trim()];
      setTempSlots(updatedSlots);
      setSlotInput("");

      // Save to Firebase
      if (currentUser) {
        const doctorRef = doc(db, "doctors", currentUser.uid);
        await updateDoc(doctorRef, { availableSlots: updatedSlots });
        setDoctorProfile((prev) => prev ? { ...prev, availableSlots: updatedSlots } : null);
      }

      void presentToast({
        message: "Slot added successfully",
        duration: 2000,
        color: "success",
      });
    } catch (error) {
      console.error("Error adding slot:", error);
      void presentToast({
        message: "Failed to add slot. Please try again.",
        duration: 3000,
        color: "danger",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const removeSlot = async (index: number) => {
    try {
      setSlotsLoading(true);
      const updatedSlots = tempSlots.filter((_, i) => i !== index);
      setTempSlots(updatedSlots);

      // Save to Firebase
      if (currentUser) {
        const doctorRef = doc(db, "doctors", currentUser.uid);
        await updateDoc(doctorRef, { availableSlots: updatedSlots });
        setDoctorProfile((prev) => prev ? { ...prev, availableSlots: updatedSlots } : null);
      }

      void presentToast({
        message: "Slot removed successfully",
        duration: 2000,
        color: "success",
      });
    } catch (error) {
      console.error("Error removing slot:", error);
      void presentToast({
        message: "Failed to remove slot. Please try again.",
        duration: 3000,
        color: "danger",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSlotKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void addSlot();
    }
  };

  // Today's compact agenda: pending/accepted appointments for today, by time.
  const todayAgenda = useMemo(() => {
    const todayString = new Date().toDateString();
    return appointments
      .filter((appointment) => {
        try {
          const d = appointmentDate(appointment.date);
          if (!d || d.toDateString() !== todayString) return false;
          return (
            appointment.status === "pending" ||
            appointment.status === "accepted" ||
            appointment.status === "confirmed"
          );
        } catch {
          return false;
        }
      })
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
      .slice(0, 5);
  }, [appointments]);

  const getDayAppointments = useCallback((): Appointment[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return filteredAppointments.filter((appointment) => {
      const date = appointmentDate(appointment.date);
      if (!date) return false;
      return segment === "today" ? date.toDateString() === today.toDateString() : date >= today;
    }).sort((a, b) => (appointmentDate(a.date)!.getTime() - appointmentDate(b.date)!.getTime()) || a.time.localeCompare(b.time));
  }, [filteredAppointments, segment]);

  const handleSegmentChange = (e: CustomEvent) => {
    setSegment(e.detail.value as "today" | "upcoming");
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
    <IonPage className="doctor-dashboard-page">
      <IonHeader className="ion-no-border">
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
            <IonButton routerLink="/doc/notification" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
              <IonIcon icon={notifications} color="medium" />
              {unreadCount > 0 && (
                <IonBadge color="danger" style={{ marginLeft: "8px" }}>
                  {unreadCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen={false} className="dashboard-content-p" ref={contentRef}>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent
            pullingIcon={arrowDownCircle}
            pullingText={t("pullToRefresh")}
            refreshingSpinner="circles"
            refreshingText={t("refreshing")}
          ></IonRefresherContent>
        </IonRefresher>

        <div className="doctor-workspace">
        <section className="workspace-welcome" aria-label="Welcome">
          <div>
            <p className="workspace-eyebrow">YOUR PRACTICE AT A GLANCE</p>
            <h1>{getGreeting()}, {doctorProfile ? `Dr. ${doctorProfile.name}` : "Doctor"}</h1>
            <p className="workspace-subtitle">Your patients, your schedule, and the care that comes next.</p>
            {doctorProfile?.specialization && <span className="workspace-specialty">{doctorProfile.specialization}</span>}
          </div>
          <div className="workspace-date">
            
            <div><span>{new Date().toLocaleDateString(undefined, { weekday: "long" })}</span><strong>{new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</strong></div>
          </div>
        </section>
        {showProfileBanner && (
          <aside className="workspace-profile-nudge">
            <p>Help patients get to know you. Complete your professional profile.</p>
            <IonButton size="small" fill="clear" routerLink="/doc/profile">Update profile</IonButton>
            <IonButton fill="clear" size="small" aria-label="Dismiss profile reminder" onClick={dismissProfileBanner}><IonIcon slot="icon-only" icon={close} /></IonButton>
          </aside>
        )}

        {loading ? (
          <div className="loading-container">
            <LoadingHelix size={40} speed={2.5} />
            <IonText className="ion-text-center ion-padding">
              <p>{t("loadingDashboard")}</p>
            </IonText>
          </div>
        ) : (
          <>
            <section className="workspace-metrics" aria-label="Practice summary">
              {[
                { label: t("appointments"), value: stats.totalAppointments, note: `${stats.completedAppointments} completed`, icon: calendar, route: "/doc/appointments", tone: "teal" },
                { label: t("patients"), value: stats.totalPatients, note: "In loaded bookings", icon: person, route: "/doc/Patients", tone: "blue" },
                { label: "Pending requests", value: analytics.pendingAppointments, note: "Awaiting your review", icon: time, route: "/doc/appointments", tone: "amber" },
                { label: "Patient rating", value: stats.rating > 0 ? `${stats.rating}/5` : "—", note: stats.rating > 0 ? "Patient feedback" : "No ratings yet", icon: star, route: "/doc/profile", tone: "violet" },
              ].map((metric) => (
                <IonButton key={metric.label} routerLink={metric.route} className={`metric-card metric-${metric.tone}`}>
                  <span className="metric-icon"></span>
                  <span className="metric-copy"><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></span>
                </IonButton>
              ))}
            </section>
            <nav className="workspace-actions" aria-label="Quick actions">
              <h2>Quick actions</h2>
              <div className="quick-actions">
                <IonButton className="quick-action quick-action-primary" routerLink="/doc/consult"><span className="quick-action-label">{t("consult")}</span></IonButton>
                <IonButton className="quick-action" fill="outline" routerLink="/doc/diagnoses"><span className="quick-action-label">{t("diagnoses")}</span></IonButton>
                <IonButton className="quick-action" fill="outline" onClick={openSlotsModal}><span className="quick-action-label">Manage availability</span></IonButton>
                <IonButton className="quick-action" fill="outline" routerLink="/doc/refer_patients"><span className="quick-action-label">{t("referPatients")}</span><span className="quick-action-count" aria-label={`${receivedReferrals.length} received referrals`}>{receivedReferrals.length}</span></IonButton>
              </div>
            </nav>
            {dashboardError && <p className="workspace-error" role="alert">{dashboardError}</p>}

            <div className="workspace-grid">
            {/* Appointments Section */}
            <div className="appointments-section workspace-panel">
              <div className="section-header">
                <IonText color="dark">
                  <h2>{t("appointments")}</h2>
                  <p className="appointment-count">
                    {getDayAppointments().length}{" "}
                    {segment === "today" ? t("todayAppointments").toLowerCase() : t("upcomingAppointments").toLowerCase()}
                  </p>
                </IonText>

                <div className="controls-container">
                  <IonSegment color="primary" value={segment} onIonChange={handleSegmentChange}>
                    <IonSegmentButton value="today">
                      <IonLabel>{t("todayAppointments")}</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="upcoming">
                      <IonLabel>{t("upcomingAppointments")}</IonLabel>
                    </IonSegmentButton>
                  </IonSegment>
                </div>
              </div>

              <IonSearchbar
                placeholder="Search appointments..."
                value={searchText}
                onIonInput={(e) => setSearchText(e.detail.value!)}
                className="doctor-search"
              />

              <div className="status-filter-bar">
                <IonButton fill="clear" slot="start" size="small" routerLink="/doc/appointments">
                  Show All
                </IonButton>
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
                        src={appointment.patientImage || DEFAULT_AVATAR}
                        alt={appointment.patientName}
                        onError={handleImageError}
                      />
                    </IonAvatar>
                    <IonLabel>
                      <h2>{appointment.patientName}</h2>
                      <div className="appointment-meta">
                        <IonNote className="meta-item">
                          <FiClock size={16} style={{ marginRight: '4px' }} />
                          <span className="meta-text">{appointment.time}</span>
                        </IonNote>
                        {segment === "upcoming" && (
                          <IonNote className="meta-item">
                            <FiCalendar size={16} style={{ marginRight: '4px' }} />
                            <span className="meta-text">
                              {formatDisplayDate(appointment.date)}
                            </span>
                          </IonNote>
                        )}
                        {appointment.address && (
                          <IonNote className="meta-item">
                            <FiMapPin size={16} style={{ marginRight: '4px' }} />
                            <span className="meta-text">
                              {appointment.address}
                            </span>
                          </IonNote>
                        )}
                        {appointment.service && (
                          <IonNote className="meta-item">
                            <FiFileText size={16} style={{ marginRight: '4px' }} />
                            <span className="meta-text">
                              {appointment.service}
                            </span>
                          </IonNote>
                        )}
                      </div>
                    </IonLabel>
                    <IonChip style={{'fontSize': '0.5895rem'}}  color={getStatusColor(appointment.status)}>
                      {getStatusDisplay(appointment.status)}
                    </IonChip>
                  </IonItem>
                ))}
              </IonList>

{getDayAppointments().length === 0 && (
                <EmptyState
                  icon={calendarOutline}
                  title={
                    searchText.trim()
                      ? "No matching appointments"
                      : segment === "today"
                        ? t("noAppointmentsToday")
                        : t("noUpcomingAppts")
                  }
                  description={
                    searchText.trim()
                      ? `Nothing matches "${searchText.trim()}". Clear the search to see your full schedule.`
                      : "Appointments scheduled for this period will appear here."
                  }
                  actionLabel={searchText.trim() ? "Clear search" : undefined}
                  onAction={searchText.trim() ? () => setSearchText("") : undefined}
                />
              )}
            </div>

              <aside className="workspace-sidebar" aria-label="Requests and daily agenda">
              <section className="doc-dashboard-analytics workspace-panel" aria-label="Pending appointment requests">
              <h2>Pending requests ({analytics.pendingAppointments})</h2>
              <p className="analytics-note">Showing up to five pending requests from the loaded bookings, earliest date first.</p>
              {analytics.pendingAppointments === 0 && (
                <EmptyState
                  icon={notifications}
                  title="No pending requests"
                  description="New appointment requests from patients will appear here for you to accept or reject."
                />
              )}
              {appointments.filter((item) => item.status === "pending").sort((a, b) =>
                (appointmentDate(a.date)?.getTime() ?? Infinity) - (appointmentDate(b.date)?.getTime() ?? Infinity)
              ).slice(0, 5).map((appointment) => (
                <div className="request-card" key={appointment.id}>
                  <div><h3>{appointment.patientName}</h3><p>{formatDisplayDate(appointment.date)} · {appointment.time}</p><IonButton size="small" fill="clear" onClick={() => viewAppointmentDetails(appointment)}>View details</IonButton></div>
                  <div className="request-actions">
                    <IonButton size="small" color="success" disabled={updating} onClick={() => confirmStatusUpdate(appointment, "accepted")} aria-label={`Accept appointment with ${appointment.patientName}`}>Accept</IonButton>
                    <IonButton size="small" color="danger"  disabled={updating} onClick={() => confirmStatusUpdate(appointment, "rejected")} aria-label={`Reject appointment with ${appointment.patientName}`}>Reject</IonButton>
                  </div>
                </div>
              ))}
            </section>
            {/* Today's Agenda */}
            <div className="today-agenda ion-padding">
              <div className="agenda-head">
                <IonText color="dark">
                  <h2>{t("todayAgenda")}</h2>
                </IonText>
                <IonButton size="small" fill="clear" routerLink="/doc/appointments">
                  {t("appointments") || "Appointments"}
                </IonButton>
              </div>
              {todayAgenda.length === 0 ? (
                <EmptyState
                  icon={calendarOutline}
                  title={t("noAppointmentsToday")}
                  description="Your schedule for today is clear. New bookings show up here as soon as patients request them."
                />
              ) : (
                <div className="agenda-list">
                  {todayAgenda.map((appointment) => (
                    <button
                      type="button"
                      className="agenda-row"
                      key={appointment.id}
                      onClick={() => viewAppointmentDetails(appointment)}
                    >
                      <span className="agenda-time">{appointment.time}</span>
                      <div className="agenda-main">
                        <span className="agenda-patient">
                          {appointment.patientName}
                        </span>
                        <span className="agenda-service">
                          {appointment.service || appointment.symptoms || "Consultation"}
                        </span>
                      </div>
                      <IonChip
                        color={
                          appointment.status === "pending" ? "warning" : "success"
                        }
                      >
                        {appointment.status}
                      </IonChip>
                    </button>
                  ))}
                </div>
              )}
            </div>

              </aside>
            </div>

            <section className="doc-dashboard-analytics workspace-panel" aria-label="Consultation fee overview">
              <div className="workspace-panel-heading"><div><h2>Consultation fees</h2><p>A clear view of your practice activity</p></div><IonBadge color="medium">Estimates · FCFA</IonBadge></div>
              <div className="earnings-cards">
                <div className="earnings-card">Completed consultation fees<strong>{formatCurrency(analytics.earnings)}</strong></div>
                <div className="earnings-card">This month<strong>{formatCurrency(analytics.thisMonth)}</strong><small>Previous month: {formatCurrency(analytics.previousMonth)}</small></div>
                <div className="earnings-card">Upcoming confirmed fees<strong>{formatCurrency(analytics.projected)}</strong></div>
              </div>
              <h2>Six-month fee trend</h2>
              <p className="analytics-note">All dashboard totals and charts use the latest 50 bookings, not your full history. Fees are grouped by appointment month, not payment date. These are estimates, not collected payments.</p>
              {(analytics.missingFees > 0 || analytics.undatedCompleted > 0) && <p className="analytics-note">{analytics.missingFees} completed bookings have missing or invalid fees; {analytics.undatedCompleted} have invalid dates and are excluded from the chart.</p>}
              <div className="earnings-chart" role="img" aria-label="Completed consultation fees by month. Exact values are in the table below.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.months} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis width={70} />
                    <Tooltip />
                    <Bar dataKey="earnings" name="Completed fees (FCFA)" fill="var(--ion-color-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details>
                <summary>View monthly figures</summary>
                <table className="analytics-table">
                  <caption>Completed appointments by booking month (latest 50 bookings)</caption>
                  <thead><tr><th scope="col">Month</th><th scope="col">Completed</th><th scope="col">Fees</th></tr></thead>
                  <tbody>{analytics.months.map((month) => <tr key={month.key}><th scope="row">{month.label}</th><td>{month.completed}</td><td>{formatCurrency(month.earnings)}</td></tr>)}</tbody>
                </table>
              </details>
            </section>

            {/* Recent Patients Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.01 }}
            >
              <IonCard className="activity-card">
                <IonCardHeader>
                  <IonCardTitle>{t("myPatients")}</IonCardTitle>
                  <IonCardSubtitle>
                    {recentPatients.length} {t("patients")}
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
                        <IonItem className="patient-item" routerLink="/doc/Patients" button detail>
                          <IonAvatar slot="start">
                            <img
                              src={patient.image || DEFAULT_AVATAR}
                              alt={patient.name}
                              onError={handleImageError}
                            />
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
                         
                              {formatLastVisit(patient.lastVisit)}
                            </p>
                          </div>
                        </IonItem>
                      </motion.div>
                    ))}
                  </IonList>
                  {recentPatients.length === 0 && (
                    <EmptyState
                      icon={peopleOutline}
                      title={searchText.trim() ? "No matching patients" : t("noData")}
                      description={
                        searchText.trim()
                          ? `No patients match "${searchText.trim()}". Clear the search to see everyone.`
                          : "Patients you've seen recently will appear here."
                      }
                      actionLabel={searchText.trim() ? "Clear search" : undefined}
                      onAction={searchText.trim() ? () => setSearchText("") : undefined}
                    />
                  )}
                </IonCardContent>
              </IonCard>
            </motion.div>
          </>
        )}

        </div>

        {/* Appointment Detail Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t("viewDetails")}</IonTitle>
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
                      src={selectedAppointment.patientImage || DEFAULT_AVATAR}
                      alt={selectedAppointment.patientName}
                      onError={handleImageError}
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
                    <span slot="start">
                      <FiClock color="primary" size={20} />
                    </span>
                    <IonLabel>
                      <p>{t("tabAppt")}</p>
                      <h3>{selectedAppointment.time}</h3>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <span slot="start">
                      <FiCalendar color="primary" size={20} />
                    </span>
                    <IonLabel>
                      <p>{t("appointments")}</p>
                      <h3>{formatDisplayDate(selectedAppointment.date)}</h3>
                    </IonLabel>
                  </IonItem>
                  {selectedAppointment.address && (
                    <IonItem>
                      <span slot="start">
                        <FiMapPin color="primary" size={20} />
                      </span>
                      <IonLabel>
                        <p>{t("healthUnits")}</p>
                        <h3>{selectedAppointment.address}</h3>
                      </IonLabel>
                    </IonItem>
                  )}
                  <IonItem>
                    <span slot="start">
                      <FiFileText color="primary" size={20} />
                    </span>
                    <IonLabel>
                      <p>{t("consult")}</p>
                      <h3>
                        {selectedAppointment.type === "virtual"
                          ? t("virtualConsultation")
                          : "In-Person Visit"}
                      </h3>
                    </IonLabel>
                  </IonItem>
                    {selectedAppointment.service && (
                    <IonItem>
                      <span slot="start">
                        <FiFileText color="primary" size={20} />
                      </span>
                      <IonLabel>
                        <p>{t("diagnoses")}</p>
                        <h3>{selectedAppointment.service}</h3>
                      </IonLabel>
                    </IonItem>
                  )}
                  {selectedAppointment.symptoms && (
                    <IonItem>
                      <span slot="start">
                        <FiFileText color="primary" size={20} />
                      </span>
                      <IonLabel>
                        <p>{t("diagnoses")}</p>
                        <h3>{selectedAppointment.symptoms}</h3>
                      </IonLabel>
                    </IonItem>
                  )}
                  <IonItem>
                    <span slot="start">
                      <FiFileText color="primary" size={20} />
                    </span>
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
                        disabled={updating}
                        onClick={() => confirmStatusUpdate(selectedAppointment, "accepted")}
                      >
                        Accept
                      </IonButton>
                      <IonButton
                        expand="block"
                        color="danger"
                        fill="outline"
                        disabled={updating}
                        onClick={() => confirmStatusUpdate(selectedAppointment, "rejected")}
                      >
                        Reject
                      </IonButton>
                    </>
                  )}
                  {(selectedAppointment.status === "accepted" ||
                    selectedAppointment.status === "confirmed") && (
                    <IonButton
                      expand="block"
                      color="primary"
                      disabled={updating}
                      onClick={() => confirmStatusUpdate(selectedAppointment, "completed")}
                    >
                      {t("completed")}
                    </IonButton>
                  )}
                  <IonButton expand="block" color="primary">
                    <FiPhone size={20} />
                    {t("consult")}
                  </IonButton>
                  <IonButton expand="block" color="secondary" fill="outline">
                    <FiMessageSquare size={20} />
                    {t("smsPatient")}
                  </IonButton>
                  {selectedAppointment.type === "virtual" && (
                    <IonButton expand="block" color="tertiary">
                      <FiVideo size={20} />
                      {t("virtualConsultation")}
                    </IonButton>
                  )}
                </div>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>

      {/* Available Slots Modal */}
      <IonModal
        isOpen={showSlotsModal}
        onDidDismiss={closeSlotsModal}
        id="slots-modal"
        initialBreakpoint={0.6}
        breakpoints={[0, 0.6, 1]}
        style={{
          '--background': '--ion-color-background',
          '--border-radius': '16px 16px 0 0',
        }}
      >
        <IonHeader color="light">
          <IonToolbar>
            <IonTitle>Set Available Slots</IonTitle>
            <IonButtons slot="end">
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p>Set your available appointment slots (24-hour format, e.g., 09:00, 14:30)</p>
          </IonText>

          <IonItem className="ion-margin-top">
            <IonInput
              ref={slotInputRef}
              value={slotInput}
              onIonInput={(e) => setSlotInput(e.detail.value!)}
              placeholder="Add slot e.g. 09:00"
              onKeyPress={handleSlotKeyPress}
              clearInput
            >
              <IonButton
                slot="end"
                fill="solid"
                size="small"
                onClick={addSlot}
                disabled={slotsLoading}
              >
                <IonIcon icon={add} slot="start" />
                Add
              </IonButton>
            </IonInput>
          </IonItem>

          <div className="ion-margin-top">
            {tempSlots.length === 0 ? (
              <EmptyState
                icon={time}
                title="No available slots set"
                description="Add the times you're free to take consultations, for example 09:00 or 14:30."
              />
            ) : (
              <div className="slot-chips">
                {tempSlots.map((slot, index) => (
                  <IonChip key={`slot-${index}`} color="primary">
                    <IonLabel>{slot}</IonLabel>
                    <IonIcon
                      icon={closeCircleOutline}
                      onClick={() => removeSlot(index)}
                    />
                  </IonChip>
                ))}
              </div>
            )}
          </div>

          <IonText color="medium" className="ion-margin-top">
            <p className="ion-text-center">
              <small>Total slots: {tempSlots.length}</small>
            </p>
          </IonText>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default DoctorDashboard;
