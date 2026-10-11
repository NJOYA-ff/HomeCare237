import React, { useEffect, useState, useMemo, useRef } from "react";
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
  IonModal,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { DashboardProfileCard } from "../../components/ui";
import { DEFAULT_AVATAR, getDocumentImageUrl, handleImageError } from "../../utils/profileImageStorage";
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
  close,
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
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useWeather } from "../../hooks/useWeather";
import { useTypingPlaceholder } from "../../hooks/useTypingPlaceholder";
import { WeatherWidget } from "../../components/WeatherWidget";

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
import { calcPatientProgress } from "../../utils/profileCompleteness";
import { motion } from "framer-motion";
declare global {
  interface Window {
    voiceflow?: any;
  }
}
import { FiMenu, FiPhone, FiMessageSquare, FiMessageCircle, FiPlay, FiThumbsUp, FiThumbsDown, FiShare2, FiEye, FiSearch, FiX, FiChevronDown, FiExternalLink, FiSend } from "react-icons/fi";
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

  const dismissProfileBanner = () => {
    if (!firebaseUser) return;
    const bannerKey = `hc_patient_banner_dismissed_${firebaseUser.uid}`;
    localStorage.setItem(bannerKey, "1");
    setShowProfileBanner(false);
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
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const profileProgress = useMemo(() => calcPatientProgress(userData), [userData]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [doctorQuery, setDoctorQuery] = useState("");
  const searchPlaceholder = useTypingPlaceholder({
    phrases: [
      "Cardiologist…",
      "General Practitioner…",
      "Pediatrician…",
      "Dermatologist…",
      "Gynecologist…",
      "Orthopedic Surgeon…",
      "Neurologist…",
      "Ophthalmologist…",
      "ENT Specialist…",
      "Psychiatrist…",
    ],
    typeSpeed: 55,
    deleteSpeed: 30,
    pauseAfterType: 1400,
    pauseAfterDelete: 320,
  });
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

  // ── Location tracking state ───────────────────────────────────────────────
  const {
    town,
    division,
    subdivision,
    isTracking: locationTracking,
    position: ownPosition,
    permissionState: locationPermission,
    error: locationError,
  } = useLocationTracking({
    uid: firebaseUser?.uid ?? null,
    role: "patient",
    name: userData.name || "Patient",
    avatar: userData.profileImage,
  });

  // ── Weather state ─────────────────────────────────────────────────────────
  const { weather, weatherLoading, refreshWeather } = useWeather(ownPosition);

  const history = useHistory();

  // ── YouTube health videos state ──────────────────────────────────────────
  interface YTVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    viewCount: string;
    likeCount: string;
    commentCount: string;
    duration: string;
  }
  const [ytVideos, setYtVideos] = useState<YTVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [ytQuery, setYtQuery] = useState("healthcare africa");
  const [ytQueryInput, setYtQueryInput] = useState("");
  const [ytNextPage, setYtNextPage] = useState<string | null>(null);
  const [ytLoadingMore, setYtLoadingMore] = useState(false);
  const [ytExpanded, setYtExpanded] = useState<string | null>(null);
  const [ytLiked, setYtLiked] = useState<Set<string>>(new Set());
  const [ytDisliked, setYtDisliked] = useState<Set<string>>(new Set());
  const [ytActiveVideo, setYtActiveVideo] = useState<YTVideo | null>(null);
  const ytInfiniteScrollRef = useRef<HTMLIonInfiniteScrollElement>(null);

  // ── Live count state ───────────────────────────────────────────────────────
  const [ytLikeDelta, setYtLikeDelta] = useState<Record<string, number>>({});
  const [ytDislikeDelta, setYtDislikeDelta] = useState<Record<string, number>>({});

  /** Returns the live like count = API count + local delta */
  const getLiveLikeCount = (video: YTVideo) => {
    const base = parseInt(video.likeCount, 10) || 0;
    const delta = ytLikeDelta[video.id] ?? 0;
    return formatCount(String(Math.max(0, base + delta)));
  };

  /** Returns the live dislike count = local delta only (YouTube API hides dislike counts) */
  const getLiveDislikeCount = (videoId: string) => {
    const delta = ytDislikeDelta[videoId] ?? 0;
    return formatCount(String(delta));
  };

  /** Returns the live comment count = API count + local comments added */
  const getLiveCommentCount = (videoId: string, apiCommentCount: string) => {
    const base = parseInt(apiCommentCount, 10) || 0;
    const local = ytComments[videoId]?.length || 0;
    return formatCount(String(base + local));
  };

  // ── Comment state ──────────────────────────────────────────────────────────
  interface YTComment { id: string; text: string; author: string; timestamp: number; }
  const [ytComments, setYtComments] = useState<Record<string, YTComment[]>>({});
  const [ytCommentInput, setYtCommentInput] = useState("");
  const [ytShowComments, setYtShowComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const addComment = (videoId: string) => {
    const text = ytCommentInput.trim();
    if (!text) return;
    const comment: YTComment = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      author: userData?.name || "You",
      timestamp: Date.now(),
    };
    setYtComments(prev => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), comment],
    }));
    setYtCommentInput("");
  };
  // ──────────────────────────────────────────────────────────────────────────

  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";
  const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

  const fetchYtVideos = async (query: string, pageToken?: string) => {
    const isLoadMore = !!pageToken;
    isLoadMore ? setYtLoadingMore(true) : setYtLoading(true);
    setYtError("");
    try {
      if (!YOUTUBE_API_KEY) throw new Error("No API key");

      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const searchUrl =
        `${YOUTUBE_API_BASE}/search?part=snippet&type=video` +
        `&q=${encodeURIComponent(query)}&maxResults=8${pageParam}&key=${YOUTUBE_API_KEY}`;

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) throw new Error(`YouTube error: ${searchRes.status}`);
      const searchData = await searchRes.json();

      if (!searchData.items?.length) {
        setYtVideos(prev => isLoadMore ? prev : []);
        setYtNextPage(null);
        return;
      }

      const videoIds = searchData.items.map((i: any) => i.id.videoId).join(",");
      const statsUrl =
        `${YOUTUBE_API_BASE}/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const statsRes = await fetch(statsUrl);
      const statsData = statsRes.ok ? await statsRes.json() : { items: [] };
      const statsMap: Record<string, any> = {};
      (statsData.items || []).forEach((v: any) => { statsMap[v.id] = v; });

      const items: YTVideo[] = searchData.items.map((item: any) => {
        const id = item.id.videoId;
        const s = statsMap[id];
        return {
          id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          publishedAt: item.snippet.publishedAt,
          viewCount: s?.statistics?.viewCount || "0",
          likeCount: s?.statistics?.likeCount || "0",
          commentCount: s?.statistics?.commentCount || "0",
          duration: s?.contentDetails?.duration || "",
        };
      });

      setYtVideos(prev => isLoadMore ? [...prev, ...items] : items);
      setYtNextPage(searchData.nextPageToken || null);
    } catch (err: any) {
      setYtError("Could not load videos. Please try again.");
    } finally {
      isLoadMore ? setYtLoadingMore(false) : setYtLoading(false);
    }
  };

  // Load default YouTube videos on mount
  useEffect(() => { fetchYtVideos("healthcare africa"); }, []);

  const handleYtInfiniteScroll = async (ev: CustomEvent) => {
    if (ytNextPage && !ytLoadingMore) {
      await fetchYtVideos(ytQuery, ytNextPage);
    }
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  const handleYtSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = ytQueryInput.trim() || "healthcare africa";
    setYtQuery(q);
    setYtVideos([]);
    setYtNextPage(null);
    fetchYtVideos(q);
  };

  const formatCount = (n: string) => {
    const num = parseInt(n, 10);
    if (isNaN(num)) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return String(num);
  };

  const formatDuration = (iso: string) => {
    if (!iso) return "";
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const h = parseInt(match[1] || "0");
    const m = parseInt(match[2] || "0");
    const s = parseInt(match[3] || "0");
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const toggleLike = (id: string) => {
    setYtLiked(prev => {
      const next = new Set(prev);
      const wasLiked = next.has(id);
      wasLiked ? next.delete(id) : next.add(id);
      // like delta: +1 when liking, 0 when un-liking
      setYtLikeDelta(d => ({ ...d, [id]: wasLiked ? 0 : 1 }));
      return next;
    });
    // if was disliked, undo the dislike delta
    setYtDisliked(prev => {
      if (prev.has(id)) {
        setYtDislikeDelta(d => ({ ...d, [id]: Math.max(0, (d[id] ?? 0) - 1) }));
        const next = new Set(prev); next.delete(id); return next;
      }
      return prev;
    });
  };

  const toggleDislike = (id: string) => {
    setYtDisliked(prev => {
      const next = new Set(prev);
      const wasDisliked = next.has(id);
      wasDisliked ? next.delete(id) : next.add(id);
      // dislike delta: +1 when disliking, back down when un-disliking
      setYtDislikeDelta(d => ({ ...d, [id]: wasDisliked ? Math.max(0, (d[id] ?? 0) - 1) : (d[id] ?? 0) + 1 }));
      return next;
    });
    // if was liked, undo the like delta
    setYtLiked(prev => {
      if (prev.has(id)) {
        setYtLikeDelta(d => ({ ...d, [id]: 0 }));
        const next = new Set(prev); next.delete(id); return next;
      }
      return prev;
    });
  };

  const shareVideo = async (video: YTVideo) => {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    if (navigator.share) {
      await navigator.share({ title: video.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

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

        // Show profile banner if not yet dismissed and profile is incomplete
        const bannerKey = `hc_patient_banner_dismissed_${user.uid}`;
        if (!localStorage.getItem(bannerKey)) {
          setShowProfileBanner(true);
        }

        // Resolve profile photo — checks every historical field name in priority
        // order (`profilePhoto`, `photoURL`, `avatar`, …) and resolves bare
        // Storage paths to download URLs.  The old code only looked at
        // `profileImage` (a Storage path field), which no write path populates,
        // so Google profile pictures and photos uploaded at signup were never
        // shown in the dashboard.
        try {
          const imageUrl = await getDocumentImageUrl(userDataFromFirestore);
          if (imageUrl) {
            setUserData((prev) => ({ ...prev, profileImage: imageUrl }));
          }
        } catch {
          // Non-critical — avatar falls back to DEFAULT_AVATAR in the JSX.
        }
      } else {
        // Create user document if it doesn't exist - FIXED: Use the user parameter directly
        const userDataToSave = {
          name: user.displayName || "User",
          email: user.email || "", // Ensure email is never undefined
          currentStatus: "healthy",
          // Persist Google profile photo for new sign-ups so the dashboard
          // shows it immediately without a separate profile page visit.
          ...(user.photoURL ? { profilePhoto: user.photoURL } : {}),
          createdAt: Timestamp.now(),
        };

        await setDoc(doc(db, "patients", user.uid), userDataToSave);

        setUserData({
          id: user.uid,
          name: userDataToSave.name,
          email: userDataToSave.email,
          profileImage: user.photoURL || undefined,
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
            // Skip doctors disabled by admin, unavailable, unverified, or inactive.
            if (
              doctorData.isEnabled === false ||
              doctorData.isVerified === false ||
              doctorData.isAvailable === false ||
              doctorData.status === "inactive" ||
              doctorData.status === "pending"
            ) {
              return;
            }
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
        (doctor.name || "").toLowerCase().includes(queryText) ||
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
            {/* ── Profile summary card ──────────────────────────────────── */}
            <DashboardProfileCard
              name={userData.name || firebaseUser?.displayName || "Patient"}
              roleLabel="Patient"
              subtitle={userData.email || firebaseUser?.email || undefined}
              avatar={userData.profileImage}
            />

            {/* ── Profile completion banner ─────────────────────────────── */}
            {showProfileBanner && profileProgress.percent < 100 && (
              <aside className="pd-profile-nudge" aria-label="Profile completion">
                <div className="pd-profile-nudge-header">
                  <p>
                    <strong>Complete your profile</strong> — help doctors provide you with better care.
                  </p>
                  <IonButton
                    fill="clear"
                    size="small"
                    aria-label="Dismiss profile reminder"
                    onClick={dismissProfileBanner}
                  >
                    <IonIcon slot="icon-only" icon={close} />
                  </IonButton>
                </div>

                {/* Progress bar */}
                <div
                  className="pd-profile-nudge-progress"
                  role="progressbar"
                  aria-valuenow={profileProgress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Profile ${profileProgress.percent}% complete`}
                >
                  <div className="pd-profile-nudge-track">
                    <div
                      className="pd-profile-nudge-fill"
                      style={{ width: `${profileProgress.percent}%` }}
                    />
                  </div>
                  <span className="pd-profile-nudge-pct">{profileProgress.percent}%</span>
                </div>

                {/* Missing fields */}
                {profileProgress.missing.length > 0 && (
                  <p className="pd-profile-nudge-missing">
                    Missing: {profileProgress.missing.slice(0, 4).join(", ")}
                    {profileProgress.missing.length > 4 && ` +${profileProgress.missing.length - 4} more`}
                  </p>
                )}

                <IonButton
                  size="small"
                  fill="clear"
                  className="pd-profile-nudge-cta"
                  routerLink="/patient/profile"
                >
                  Update profile →
                </IonButton>
              </aside>
            )}

            <div className="patient-home-shell">
              <IonCard className="patient-home-intro">
                <IonCardContent>
                  <p className="tiny-greeting">{t("helloGreeting")} {userData.name || ""}!</p>
                  <h2 className="home-title">{t("findSpecialist")}</h2>
                  <br />
                  <div className={`home-search-wrap${!doctorQuery ? " home-search-wrap--typing" : ""}`}>
                    <IonIcon icon={searchOutline} />
                    <input
                      value={doctorQuery}
                      onChange={(e) => setDoctorQuery(e.target.value)}
                      placeholder={doctorQuery ? t("searchSpecialist") : searchPlaceholder}
                    />
                    <IonButton
                      fill="solid"
                      size="small"
                      className="home-search-dropdown-btn"
                      onClick={(e) => {
                        setCategoryPopoverEvent(e.nativeEvent);
                        setShowCategoryPopover(true);
                      }}
                      aria-label="Browse specialist categories"
                    >
                      <span className="material-symbols-outlined">page_info</span>
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
                              <FiPhone size={15} color="#ffffff" />
                              <span>Call</span>
                            </button>
                            <button
                              className="dash-doc-btn dash-doc-btn--msg"
                              aria-label={`Message Dr. ${doctor.name}`}
                              onClick={() =>
                                history.push(`/patient/consult?doctorId=${doctor.id}`)
                              }
                            >
                              <FiMessageSquare size={15} color="var(--ion-color-primary)" />
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

              {/* ── YouTube Health Videos Section ───────────────────────── */}
              <IonCard className="yt-section-card">
                <IonCardContent>
                  {/* Header */}
                  <div className="yt-section-head">
                    <div className="yt-section-title-row">
                      <div className="yt-title-icon">
                        <FiPlay size={16} color="#ffffff" />
                      </div>
                      <h3 className="yt-section-title">Health Videos</h3>
                    </div>
                    <IonChip className="yt-africa-chip" outline>Africa</IonChip>
                  </div>

                  {/* Search bar */}
                  <form className="yt-search-form" onSubmit={handleYtSearch}>
                    <div className="yt-search-wrap">
                      <FiSearch className="yt-search-icon" size={15} color="var(--ion-color-primary)" />
                      <input
                        className="yt-search-input"
                        type="text"
                        placeholder="Search health videos…"
                        value={ytQueryInput}
                        onChange={e => setYtQueryInput((e.target as HTMLInputElement).value)}
                      />
                      {ytQueryInput.length > 0 && (
                        <button type="button" className="yt-search-clear" onClick={() => setYtQueryInput("")}>
                          <FiX size={13} color="var(--ion-color-primary)" />
                        </button>
                      )}
                      <IonButton type="submit" size="small" className="yt-search-btn">Search</IonButton>
                    </div>
                  </form>

                  {/* Loading skeleton */}
                  {ytLoading && (
                    <div className="yt-skeleton-list">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="yt-skeleton-item">
                          <IonSkeletonText animated className="yt-skeleton-thumb" />
                          <div className="yt-skeleton-body">
                            <IonSkeletonText animated style={{ width: "90%", height: "14px", borderRadius: "4px" }} />
                            <IonSkeletonText animated style={{ width: "60%", height: "12px", borderRadius: "4px" }} />
                            <IonSkeletonText animated style={{ width: "40%", height: "11px", borderRadius: "4px" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error state */}
                  {ytError && !ytLoading && (
                    <div className="yt-error">
                      <p>{ytError}</p>
                      <IonButton size="small" fill="outline" onClick={() => fetchYtVideos(ytQuery)}>Retry</IonButton>
                    </div>
                  )}

                  {/* Video list */}
                  {!ytLoading && !ytError && (
                    <div className="yt-video-list">
                      {ytVideos.map(video => {
                        const isExpanded = ytExpanded === video.id;
                        const isLiked = ytLiked.has(video.id);
                        const isDisliked = ytDisliked.has(video.id);
                        return (
                          <div key={video.id} className="yt-video-item">
                            {/* Thumbnail + play button → opens modal player */}
                            <div
                              className="yt-player-wrap"
                              onClick={() => setYtActiveVideo(video)}
                              role="button"
                              aria-label={`Play ${video.title}`}
                            >
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="yt-player"
                                loading="lazy"
                              />
                              <div className="yt-play-overlay">
                                <div className="yt-play-btn-circle">
                                  <FiPlay size={22} color="var(--ion-color-primary)" />
                                </div>
                              </div>
                              {formatDuration(video.duration) && (
                                <span className="yt-duration">{formatDuration(video.duration)}</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="yt-info">
                              <div className="yt-info-top">
                                <p className="yt-channel">{video.channelTitle}</p>
                                <a
                                  href={`https://www.youtube.com/watch?v=${video.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="yt-ext-link"
                                  aria-label="Open video"
                                >
                                  <FiExternalLink size={13} color="var(--ion-color-primary)" />
                                </a>
                              </div>

                              <h4 className="yt-title">{video.title}</h4>

                              {/* Stats row */}
                              <div className="yt-stats-row">
                                <span className="yt-stat">
                                  <FiEye size={12} color="var(--ion-color-primary)" />
                                  {formatCount(video.viewCount)}
                                </span>
                                <span className="yt-stat">
                                  <FiThumbsUp size={12} color="var(--ion-color-primary)" />
                                  {getLiveLikeCount(video)}
                                </span>
                                {formatDuration(video.duration) && (
                                  <span className="yt-stat">
                                    <FiPlay size={12} color="var(--ion-color-primary)" />
                                    {formatDuration(video.duration)}
                                  </span>
                                )}
                              </div>

                              {/* Description toggle */}
                              {video.description && (
                                <>
                                  {isExpanded && (
                                    <p className="yt-description">{video.description}</p>
                                  )}
                                  <button
                                    className="yt-expand-btn"
                                    onClick={() => setYtExpanded(isExpanded ? null : video.id)}
                                  >
                                    <FiChevronDown
                                      size={13}
                                      color="var(--ion-color-primary)"
                                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                                    />
                                    {isExpanded ? "Less" : "More"}
                                  </button>
                                </>
                              )}

                              {/* Action buttons */}
                              <div className="yt-actions">
                                <button
                                  className={`yt-action-btn${isLiked ? " yt-action-btn--active" : ""}`}
                                  onClick={() => toggleLike(video.id)}
                                  aria-label="Like"
                                >
                                  <FiThumbsUp size={14} color="var(--ion-color-primary)" />
                                  <span>{getLiveLikeCount(video)}</span>
                                </button>
                                <button
                                  className={`yt-action-btn${isDisliked ? " yt-action-btn--active" : ""}`}
                                  onClick={() => toggleDislike(video.id)}
                                  aria-label="Dislike"
                                >
                                  <FiThumbsDown size={14} color="var(--ion-color-primary)" />
                                  <span>{getLiveDislikeCount(video.id)}</span>
                                </button>
                                <button
                                  className="yt-action-btn"
                                  onClick={() => shareVideo(video)}
                                  aria-label="Share"
                                >
                                  <FiShare2 size={14} color="var(--ion-color-primary)" />
                                  <span>Share</span>
                                </button>
                                <button
                                  className="yt-action-btn"
                                  onClick={() => { setYtActiveVideo(video); setYtShowComments(true); }}
                                  aria-label="Comment"
                                >
                                  <FiMessageCircle size={14} color="var(--ion-color-primary)" />
                                  <span>{getLiveCommentCount(video.id, video.commentCount)}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Horizontal infinite-scroll trigger — sits at the trailing edge of the flex row */}
                      <IonInfiniteScroll
                        ref={ytInfiniteScrollRef}
                        threshold="80px"
                        position="bottom"
                        disabled={!ytNextPage || ytLoading}
                        onIonInfinite={handleYtInfiniteScroll}
                        className="yt-infinite-scroll"
                      >
                        <IonInfiniteScrollContent
                          loadingSpinner="dots"
                          loadingText=""
                        />
                      </IonInfiniteScroll>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
              {/* ── End YouTube Health Videos Section ───────────────────── */}

              {/* ── YouTube Video Player Modal ───────────────────────────── */}
              <IonModal
                isOpen={!!ytActiveVideo}
                onDidDismiss={() => { setYtActiveVideo(null); setYtShowComments(false); setYtCommentInput(""); }}
                className="yt-modal"
              >
                <IonHeader>
                  <IonToolbar>
                    <IonButtons slot="end">
                      <IonButton onClick={() => setYtActiveVideo(null)}>
                        <FiX size={20} color="var(--ion-color-primary)" />
                      </IonButton>
                    </IonButtons>
                    <IonTitle className="yt-modal-title">
                      {ytActiveVideo?.channelTitle}
                    </IonTitle>
                  </IonToolbar>
                </IonHeader>
                <IonContent className="yt-modal-content">
                  {ytActiveVideo && (
                    <>
                      <div className="yt-modal-player-wrap">
                        <iframe
                          className="yt-modal-player"
                          src={`https://www.youtube.com/embed/${ytActiveVideo.id}?autoplay=1&controls=1&rel=0&fs=1&playsinline=1&modestbranding=1`}
                          title={ytActiveVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      </div>
                      <div className="yt-modal-info">
                        <h3 className="yt-modal-video-title">{ytActiveVideo.title}</h3>
                        <div className="yt-stats-row" style={{ marginBottom: 8 }}>
                          <span className="yt-stat"><FiEye size={13} color="var(--ion-color-primary)" />{formatCount(ytActiveVideo.viewCount)} views</span>
                          <span className="yt-stat"><FiThumbsUp size={13} color="var(--ion-color-primary)" />{getLiveLikeCount(ytActiveVideo)}</span>
                          <span className="yt-stat"><FiMessageCircle size={13} color="var(--ion-color-primary)" />{getLiveCommentCount(ytActiveVideo.id, ytActiveVideo.commentCount)}</span>
                          {formatDuration(ytActiveVideo.duration) && (
                            <span className="yt-stat"><FiPlay size={13} color="var(--ion-color-primary)" />{formatDuration(ytActiveVideo.duration)}</span>
                          )}
                        </div>
                        <div className="yt-actions">
                          <button
                            className={`yt-action-btn${ytLiked.has(ytActiveVideo.id) ? " yt-action-btn--active" : ""}`}
                            onClick={() => toggleLike(ytActiveVideo.id)}
                          >
                            <FiThumbsUp size={14} color="var(--ion-color-primary)" /><span>{getLiveLikeCount(ytActiveVideo)}</span>
                          </button>
                          <button
                            className={`yt-action-btn${ytDisliked.has(ytActiveVideo.id) ? " yt-action-btn--active" : ""}`}
                            onClick={() => toggleDislike(ytActiveVideo.id)}
                          >
                            <FiThumbsDown size={14} color="var(--ion-color-primary)" /><span>{getLiveDislikeCount(ytActiveVideo.id)}</span>
                          </button>
                          <button className="yt-action-btn" onClick={() => shareVideo(ytActiveVideo)}>
                            <FiShare2 size={14} color="var(--ion-color-primary)" /><span>Share</span>
                          </button>
                          <button
                            className={`yt-action-btn${ytShowComments ? " yt-action-btn--active" : ""}`}
                            onClick={() => {
                              setYtShowComments(v => !v);
                              setTimeout(() => commentInputRef.current?.focus(), 120);
                            }}
                            aria-label="Toggle comments"
                          >
                            <FiMessageCircle size={14} color="var(--ion-color-primary)" />
                            <span>{getLiveCommentCount(ytActiveVideo.id, ytActiveVideo.commentCount)}</span>
                          </button>
                          <a
                            className="yt-action-btn"
                            href={`https://www.youtube.com/watch?v=${ytActiveVideo.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FiExternalLink size={14} color="var(--ion-color-primary)" /><span>Open</span>
                          </a>
                        </div>

                        {ytActiveVideo.description && (
                          <p className="yt-description" style={{ marginTop: 12 }}>
                            {ytActiveVideo.description}
                          </p>
                        )}

                        {/* ── Comment panel ── */}
                        {ytShowComments && (
                          <div className="yt-comment-panel">
                            <h4 className="yt-comment-panel-title">
                              <FiMessageCircle size={15} color="var(--ion-color-primary)" />
                              Comments
                            </h4>

                            {/* Existing + user comments */}
                            <div className="yt-comment-list">
                              {(ytComments[ytActiveVideo.id] || []).length === 0 ? (
                                <p className="yt-comment-empty">Be the first to comment!</p>
                              ) : (
                                (ytComments[ytActiveVideo.id] || []).map(c => (
                                  <div key={c.id} className="yt-comment-item">
                                    <div className="yt-comment-avatar">
                                      {c.author.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="yt-comment-body">
                                      <span className="yt-comment-author">{c.author}</span>
                                      <p className="yt-comment-text">{c.text}</p>
                                      <span className="yt-comment-time">
                                        {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Input row */}
                            <div className="yt-comment-input-row">
                              <input
                                ref={commentInputRef}
                                className="yt-comment-input"
                                placeholder="Add a comment…"
                                value={ytCommentInput}
                                onChange={e => setYtCommentInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addComment(ytActiveVideo.id)}
                                maxLength={300}
                              />
                              <button
                                className="yt-comment-send-btn"
                                onClick={() => addComment(ytActiveVideo.id)}
                                disabled={!ytCommentInput.trim()}
                                aria-label="Send comment"
                              >
                                <FiSend size={15} color="#ffffff" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </IonContent>
              </IonModal>
              {/* ── End YouTube Video Player Modal ───────────────────────── */}

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

              {/* ── Location + Weather Widget ────────────────────────────── */}
              <IonCard className="location-tracking-card">
                <IonCardContent>
                  <div className="location-tracking-header">
                    <h3 className="location-tracking-title">
                      <IonIcon icon={locationOutline} />
                      My Location
                    </h3>
                    <span className={`location-status-chip ${locationTracking ? "active" : "inactive"}`}>
                      {locationTracking ? "Active" : "Locating…"}
                    </span>
                  </div>

                  {locationError && (
                    <div className="location-error-banner" role="alert">
                      {locationError}
                    </div>
                  )}

                  <div className="location-town-display">
                    <IonIcon icon={locationOutline} className="location-town-pin" />
                    <div className="location-town-details">
                      <span className="location-town-name">
                        {town ?? (locationPermission === "denied" ? "Permission denied" : "Detecting…")}
                      </span>
                      {division && (
                        <span className="location-division">{division}</span>
                      )}
                      {subdivision && (
                        <span className="location-subdivision">{subdivision}</span>
                      )}
                      {ownPosition && (
                        <span className="location-coords">
                          {ownPosition.coords.latitude.toFixed(4)}°, {ownPosition.coords.longitude.toFixed(4)}° · ±{Math.round(ownPosition.coords.accuracy)}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Weather Widget ── */}
                  {ownPosition && (
                    <div className="weather-section">
                      <div className="weather-divider" />
                      <WeatherWidget
                        weather={weather}
                        loading={weatherLoading}
                        onRefresh={refreshWeather}
                      />
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
              {/* ── End Location + Weather Widget ─────────────────────────── */}

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
