import LoadingHelix from "../../components/LoadingHelix";
import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonList,
  IonAvatar,
  IonBadge,
  IonButtons,
  IonMenuButton,
  IonChip,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { useNotifications } from "../../context/NotificationContext";
import { useSettings } from "../../context/SettingsContext";
import {
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import {
  motion,
  AnimatePresence,
  Variants,
} from "framer-motion";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Title, Tooltip, Legend, Filler);
import "./Admin.scss";
import { DEFAULT_AVATAR, handleImageError, pickImageField } from "../../utils/profileImageStorage";
import {
  people,
  medkit,
  time,
  business,
  alertCircle,
  notificationsOutline,
  pulse,
  statsChart,
} from "ionicons/icons";
import {
  SoftKpiCard,
  SoftChartCard,
  SoftStatChips,
  SoftLegendRows,
  type KpiFooterItem,
} from "./SoftChartCards";
import {
  SOFT_COLORS,
  softChartPlugin,
  softCenterTextPlugin,
  softGaugeOptions,
  softLineFill,
  softLineOptions,
  buildSoftGauge,
  bucketByMonth,
  recentMonthKeys,
  seriesDelta,
} from "./softChartTheme";

// Types
interface Caregiver {
  id: number;
  name: string;
  avatar: string;
  status: "online" | "offline" | "busy";
  specialty: string;
  rating: number;
}

interface Patient {
  id: number;
  name: string;
  avatar: string;
  condition: string;
  status: "pending" | "confirmed" | "completed";
  lastCheckup: string;
  healthScore: number;
}

interface Appointment {
  id: number;
  patientName: string;
  caregiverName: string;
  date: string;
  time: string;
  status: string;
  type: string;
  /** Sort key: 0 when the appointment carries no usable date. */
  timestamp: number;
}

interface HealthUnit {
  id: number;
  name: string;
  location: string;
  patients: number;
  capacity: number;
  status: "optimal" | "busy" | "overcrowded";
}

// Define proper variant types
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

// ─── Chart helpers ────────────────────────────────────────────────────────────

/** Last 6 month buckets ("Sep 26" format) used by the KPI sparklines. */
const MONTH_KEYS = recentMonthKeys(6);
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekChip {
  current: number;
  delta: number | null;
}

/** Coerces Firestore Timestamp / Date / ISO string values to a Date. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === "function") {
    const d = v.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Percentage change of `current` against `previous`, or null if undefined. */
function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/** Monday 00:00 of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  return start;
}

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const { t } = useSettings();
  const { unreadCount } = useNotifications();
  const [stats, setStats] = useState({
    patients: 0,
    caregivers: 0,
    appointments: 0,
    healthUnits: 0,
    pending: 0,
    accepted: 0,
    completed: 0,
    cancelled: 0,
  });
  const [recentCaregivers, setRecentCaregivers] = useState<Caregiver[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [healthUnits, setHealthUnits] = useState<HealthUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Chart state — everything below is derived from the live Firestore data ──
  // Monthly activity per metric; feeds the KPI sparklines + delta pills.
  const [metaSeries, setMetaSeries] = useState<Record<string, number[]>>({});
  const [statusSeries, setStatusSeries] = useState<Record<string, number[]>>({});
  // Appointment counts per weekday (Mon → Sun) over the last 4 weeks.
  const [weekSeries, setWeekSeries] = useState<Record<
    "pending" | "accepted" | "completed",
    number[]
  > | null>(null);
  // This week vs last week counts shown as chips above the weekly chart.
  const [weekChips, setWeekChips] = useState<Record<
    "pending" | "accepted" | "completed",
    WeekChip
  > | null>(null);

  // Animation variants with proper typing
  const cardVariants: CustomVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        type: "spring" as AnimationType,
        stiffness: 100,
      },
    }),
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

  // Load data from Firebase
  useEffect(() => {
    let unsubscribeAppointments: (() => void) | null = null;

    const loadFirebaseData = async () => {
      try {
        // Fetch patient count
        const patientsSnapshot = await getDocs(collection(db, "patients"));
        const patientCount = patientsSnapshot.size;

        // Fetch doctor count
        const doctorsSnapshot = await getDocs(collection(db, "doctors"));
        const doctorCount = doctorsSnapshot.size;

        // Fetch health units count
        const unitsSnapshot = await getDocs(collection(db, "healthUnits"));
        const unitsCount = unitsSnapshot.size;

        // Monthly activity (registrations) feeding the KPI sparklines
        const metaDates: Record<string, Array<Date | null>> = {
          patients: [],
          caregivers: [],
          healthUnits: [],
        };

        // Fetch recent doctors with real data
        const doctorsData: Caregiver[] = [];
        doctorsSnapshot.forEach((doc) => {
          const data = doc.data();
          metaDates.caregivers.push(toDate(data.createdAt));
          doctorsData.push({
            id: parseInt(doc.id) || doctorsData.length + 1,
            name: data.name || "Unknown Doctor",
            // `profileImage` is never written; signup stores `profilePhoto`.
            avatar: pickImageField(data),
            status: data.status || "offline",
            specialty:
              data.specialization || data.specialty || "General Practice",
            rating: Number(data.rating) || 0,
          });
        });
        setRecentCaregivers(doctorsData.slice(0, 4));

        // Fetch recent patients with real data
        const patientsData: Patient[] = [];
        patientsSnapshot.forEach((doc) => {
          const data = doc.data();
          metaDates.patients.push(toDate(data.createdAt));
          const rawStatus = String(data.status || "").toLowerCase();
          const patientStatus: Patient["status"] =
            rawStatus === "pending" || rawStatus === "confirmed"
              ? rawStatus
              : data.lastCheckupDate
                ? "completed"
                : "pending";

          patientsData.push({
            id: parseInt(doc.id) || patientsData.length + 1,
            name: data.name || "Unknown Patient",
            avatar: pickImageField(data),
            condition: data.medicalCondition || "Not specified",
            status: patientStatus,
            lastCheckup: data.lastCheckupDate || "Not scheduled",
            healthScore: Number(data.healthScore) || 0,
          });
        });
        setRecentPatients(patientsData.slice(0, 4));

        // Fetch health units with real data
        const unitsData: HealthUnit[] = [];
        unitsSnapshot.forEach((doc) => {
          const data = doc.data();
          metaDates.healthUnits.push(toDate(data.createdAt));
          const patients = data.patientsCount || 0;
          const capacity = data.capacity || 50;
          let status: "optimal" | "busy" | "overcrowded" = "optimal";
          const percentage = (patients / capacity) * 100;
          if (percentage > 90) status = "overcrowded";
          else if (percentage > 70) status = "busy";

          unitsData.push({
            id: parseInt(doc.id) || unitsData.length + 1,
            name: data.name || "Unknown Unit",
            location: data.location || "Not specified",
            patients: patients,
            capacity: capacity,
            status: status,
          });
        });
        setHealthUnits(unitsData);

        // Monthly registrations per metric (last 6 months) for the KPI cards
        setMetaSeries({
          patients: bucketByMonth(metaDates.patients, MONTH_KEYS),
          caregivers: bucketByMonth(metaDates.caregivers, MONTH_KEYS),
          healthUnits: bucketByMonth(metaDates.healthUnits, MONTH_KEYS),
        });

        // Update stats
        setStats((prev) => ({
          ...prev,
          patients: patientCount,
          caregivers: doctorCount,
          appointments: 0, // Will be updated by real-time listener
          healthUnits: unitsCount,
        }));

        // Real-time listener for appointments
        const appointmentsRef = collection(db, "appointments");
        unsubscribeAppointments = onSnapshot(appointmentsRef, (snapshot) => {
          const appointmentsData: Appointment[] = [];
          let pendingCount = 0,
            confirmedCount = 0,
            completedCount = 0,
            cancelledCount = 0;

          // Appointment dates per status — drives the sparklines, gauge and
          // weekly chart below.
          const statusDates: Record<string, Date[]> = {
            pending: [],
            accepted: [],
            completed: [],
            cancelled: [],
          };

          snapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.status || "pending";
            const date = toDate(data.date) ?? toDate(data.createdAt);
            const hasDate = !!date;
            const dateStr = date
              ? date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—";

            let bucket: string | null = null;
            if (status === "pending") {
              pendingCount++;
              bucket = "pending";
            } else if (status === "confirmed" || status === "accepted") {
              confirmedCount++;
              bucket = "accepted";
            } else if (status === "completed") {
              completedCount++;
              bucket = "completed";
            } else if (status === "cancelled" || status === "rejected") {
              cancelledCount++;
              bucket = "cancelled";
            }
            if (bucket && hasDate) {
              statusDates[bucket].push(date as Date);
            }

            appointmentsData.push({
              id: parseInt(doc.id) || appointmentsData.length + 1,
              patientName: data.patientName || "Unknown",
              caregiverName: data.doctorName || "Unassigned",
              date: dateStr,
              time: data.time || "—",
              status: status,
              type: data.type || "General",
              timestamp: date ? date.getTime() : 0,
            });
          });

          // Nearest scheduled appointments first. When nothing lies in the
          // future the most recent dated appointments are shown instead so the
          // card never renders empty while there is data.
          const datedAppointments = appointmentsData
            .filter((appointment) => appointment.timestamp > 0)
            .sort((a, b) => a.timestamp - b.timestamp);
          const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const scheduled = datedAppointments.filter(
            (appointment) => appointment.timestamp >= dayAgo,
          );

          setUpcomingAppointments(
            (scheduled.length > 0 ? scheduled : datedAppointments).slice(0, 5),
          );

          // Update appointment stats for chart
          setStats((prev) => ({
            ...prev,
            appointments: snapshot.size,
            pending: pendingCount,
            accepted: confirmedCount,
            completed: completedCount,
            cancelled: cancelledCount,
          }));

          // Monthly activity per status (last 6 months) → KPI sparklines
          setStatusSeries({
            pending: bucketByMonth(statusDates.pending, MONTH_KEYS),
            accepted: bucketByMonth(statusDates.accepted, MONTH_KEYS),
            completed: bucketByMonth(statusDates.completed, MONTH_KEYS),
            cancelled: bucketByMonth(statusDates.cancelled, MONTH_KEYS),
          });

          // Weekly view: counts per weekday across the three past weeks and
          // the current one, plus this week vs last week for the stat chips.
          const weekStart = startOfWeek(new Date());
          const windowStart = new Date(weekStart);
          windowStart.setDate(windowStart.getDate() - 21);
          const windowEnd = new Date(weekStart);
          windowEnd.setDate(windowEnd.getDate() + 7);
          const previousWeekStart = new Date(weekStart);
          previousWeekStart.setDate(previousWeekStart.getDate() - 7);

          const weekly: Record<"pending" | "accepted" | "completed", number[]> = {
            pending: WEEKDAY_LABELS.map(() => 0),
            accepted: WEEKDAY_LABELS.map(() => 0),
            completed: WEEKDAY_LABELS.map(() => 0),
          };
          const thisWeek = { pending: 0, accepted: 0, completed: 0 };
          const lastWeek = { pending: 0, accepted: 0, completed: 0 };

          (Object.keys(weekly) as Array<keyof typeof weekly>).forEach((key) => {
            statusDates[key].forEach((when) => {
              if (when >= windowStart && when < windowEnd) {
                weekly[key][(when.getDay() + 6) % 7] += 1;
              }
              if (when >= weekStart) thisWeek[key] += 1;
              else if (when >= previousWeekStart) lastWeek[key] += 1;
            });
          });

          setWeekSeries(weekly);
          setWeekChips({
            pending: {
              current: thisWeek.pending,
              delta: pctChange(thisWeek.pending, lastWeek.pending),
            },
            accepted: {
              current: thisWeek.accepted,
              delta: pctChange(thisWeek.accepted, lastWeek.accepted),
            },
            completed: {
              current: thisWeek.completed,
              delta: pctChange(thisWeek.completed, lastWeek.completed),
            },
          });
        });

        setLoading(false);
      } catch (error) {
        console.error("Error loading Firebase data:", error);
        setLoading(false);
      }
    };

    loadFirebaseData();

    // Cleanup subscription
    return () => {
      if (unsubscribeAppointments) {
        unsubscribeAppointments();
      }
    };
  }, []);

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
      case "stable":
      case "confirmed":
      case "optimal":
        return "success";
      case "busy":
      case "recovering":
      case "pending":
        return "warning";
      case "offline":
      case "critical":
      case "overcrowded":
        return "danger";
      default:
        return "primary";
    }
  };

  // Health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 75) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  // Capacity percentage
  const getCapacityPercentage = (patients: number, capacity: number) => {
    return Math.min(100, Math.round((patients / capacity) * 100));
  };

  // ── Derived chart data (always reflects the live Firestore snapshots) ──────
  const weekZero = WEEKDAY_LABELS.map(() => 0);
  const weeklyData = weekSeries ?? {
    pending: weekZero,
    accepted: weekZero,
    completed: weekZero,
  };

  const lineChartData = {
    labels: WEEKDAY_LABELS,
    datasets: [
      {
        label: t("pending"),
        data: weeklyData.pending,
        borderColor: SOFT_COLORS.amber,
        backgroundColor: softLineFill(SOFT_COLORS.amber),
        pointBackgroundColor: SOFT_COLORS.amber,
        pointBorderColor: SOFT_COLORS.panel,
        fill: true,
      },
      {
        label: t("accepted"),
        data: weeklyData.accepted,
        borderColor: SOFT_COLORS.violet,
        backgroundColor: softLineFill(SOFT_COLORS.violet),
        pointBackgroundColor: SOFT_COLORS.violet,
        pointBorderColor: SOFT_COLORS.panel,
        fill: true,
      },
      {
        label: t("completed"),
        data: weeklyData.completed,
        borderColor: SOFT_COLORS.mint,
        backgroundColor: softLineFill(SOFT_COLORS.mint),
        pointBackgroundColor: SOFT_COLORS.mint,
        pointBorderColor: SOFT_COLORS.panel,
        fill: true,
      },
    ],
  };

  // The stat chips already name each series, so the built-in legend is hidden.
  const lineChartOptions = {
    ...softLineOptions,
    plugins: {
      ...softLineOptions.plugins,
      legend: { display: false },
    },
  };

  // Ring gauge: share of tracked appointments that reached "completed".
  const trackedTotal = stats.pending + stats.accepted + stats.completed;
  const completedShare =
    trackedTotal > 0 ? (stats.completed / trackedTotal) * 100 : 0;
  const gauge = buildSoftGauge(completedShare);
  const gaugeData = {
    labels: [t("completed"), t("pending")],
    datasets: [
      {
        data: gauge.data,
        backgroundColor: gauge.backgroundColor,
        spacing: 2,
        hoverOffset: 0,
      },
    ],
  };
  const gaugeOptions = {
    ...softGaugeOptions,
    plugins: {
      ...softGaugeOptions.plugins,
      softCenterText: {
        value: `${Math.round(completedShare)}%`,
        label: t("completed"),
      },
    },
  };

  const sharePct = (value: number) =>
    trackedTotal > 0 ? (value / trackedTotal) * 100 : 0;

  const statusRows = [
    {
      label: t("completed"),
      hint: `${Math.round(sharePct(stats.completed))}%`,
      value: stats.completed.toLocaleString(),
      color: SOFT_COLORS.mint,
      pct: sharePct(stats.completed),
    },
    {
      label: t("accepted"),
      hint: `${Math.round(sharePct(stats.accepted))}%`,
      value: stats.accepted.toLocaleString(),
      color: SOFT_COLORS.violet,
      pct: sharePct(stats.accepted),
    },
    {
      label: t("pending"),
      hint: `${Math.round(sharePct(stats.pending))}%`,
      value: stats.pending.toLocaleString(),
      color: SOFT_COLORS.amber,
      pct: sharePct(stats.pending),
    },
  ];

  // Health unit capacity rows
  const unitStatusColor = (status: string) =>
    status === "overcrowded"
      ? SOFT_COLORS.rose
      : status === "busy"
        ? SOFT_COLORS.amber
        : SOFT_COLORS.mint;

  // Dot colour for an appointment status in the upcoming list.
  const appointmentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return SOFT_COLORS.mint;
      case "confirmed":
      case "accepted":
        return SOFT_COLORS.violet;
      case "pending":
        return SOFT_COLORS.amber;
      case "cancelled":
      case "rejected":
        return SOFT_COLORS.rose;
      default:
        return SOFT_COLORS.lavender;
    }
  };

  // Localised label for an appointment-style status string stored in Firestore
  // (shared by the appointment list and the patient status chips).
  const bookingStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return t("pending");
      case "confirmed":
        return t("confirmed");
      case "accepted":
        return t("accepted");
      case "completed":
        return t("completed");
      case "cancelled":
      case "rejected":
        return t("cancelled");
      default:
        return status;
    }
  };

  // Nearest appointments — feeds the "Upcoming Appointments" card.
  const upcomingRows = upcomingAppointments.map((appointment) => ({
    label: appointment.patientName,
    hint: `${appointment.caregiverName} · ${appointment.type} · ${bookingStatusLabel(appointment.status)}`,
    value: `${appointment.date} · ${appointment.time}`,
    color: appointmentStatusColor(appointment.status),
  }));

  const unitRows = healthUnits.map((unit) => ({
    label: unit.name,
    hint: `${unit.location} · ${unit.status}`,
    value: `${unit.patients}/${unit.capacity}`,
    color: unitStatusColor(unit.status),
    pct: getCapacityPercentage(unit.patients, unit.capacity),
  }));

  // A sparkline is only drawn when the series really carries activity.
  const activeSeries = (series?: number[]) =>
    series && series.some((value) => value > 0) ? series : undefined;
  const monthValue = (series?: number[]) =>
    series && series.length > 0 ? series[series.length - 1] : 0;

  // Appointments created per month, all statuses combined.
  const appointmentsSeries = MONTH_KEYS.map((_, index) =>
    ["pending", "accepted", "completed", "cancelled"].reduce(
      (sum, key) => sum + (statusSeries[key]?.[index] ?? 0),
      0,
    ),
  );

  const kpiCards = [
    {
      key: "patients",
      icon: people,
      label: t("patients"),
      value: stats.patients.toLocaleString(),
      series: activeSeries(metaSeries.patients),
      delta: seriesDelta(metaSeries.patients ?? []),
      footers: [
        { label: t("thisMonth"), value: monthValue(metaSeries.patients) },
        { label: t("allTime"), value: stats.patients.toLocaleString() },
      ] as [KpiFooterItem, KpiFooterItem],
      url: "/admin/patient",
    },
    {
      key: "caregivers",
      icon: medkit,
      label: t("doctors"),
      value: stats.caregivers.toLocaleString(),
      series: activeSeries(metaSeries.caregivers),
      delta: seriesDelta(metaSeries.caregivers ?? []),
      footers: [
        { label: t("thisMonth"), value: monthValue(metaSeries.caregivers) },
        { label: t("allTime"), value: stats.caregivers.toLocaleString() },
      ] as [KpiFooterItem, KpiFooterItem],
      url: "/admin/doctor",
    },
    {
      key: "appointments",
      icon: time,
      label: t("appointments"),
      value: stats.appointments.toLocaleString(),
      series: activeSeries(appointmentsSeries),
      delta: seriesDelta(appointmentsSeries),
      footers: [
        { label: t("thisMonth"), value: monthValue(appointmentsSeries) },
        { label: t("allTime"), value: stats.appointments.toLocaleString() },
      ] as [KpiFooterItem, KpiFooterItem],
      url: "/admin/appointments",
    },
    {
      key: "healthUnits",
      icon: business,
      label: t("healthUnits"),
      value: stats.healthUnits.toLocaleString(),
      series: activeSeries(metaSeries.healthUnits),
      delta: seriesDelta(metaSeries.healthUnits ?? []),
      footers: [
        { label: t("thisMonth"), value: monthValue(metaSeries.healthUnits) },
        { label: t("allTime"), value: stats.healthUnits.toLocaleString() },
      ] as [KpiFooterItem, KpiFooterItem],
      url: "/admin/health_units",
    },
    {
      key: "alerts",
      icon: alertCircle,
      label: t("alerts"),
      value: unreadCount.toLocaleString(),
      series: undefined,
      delta: null,
      footers: undefined,
      url: "/admin/notifications",
    },
  ];

  return (
    <IonPage className="dashboard-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton>
              <FiMenu size={20} />{" "}
            </IonMenuButton>
          </IonButtons>
          <IonTitle>{t("adminDashboard")}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              aria-label={t("notifications_page")}
              onClick={() => history.push("/admin/notifications")}
              style={{ position: "relative" }}
            >
              <IonIcon slot="icon-only" icon={notificationsOutline} />
              {unreadCount > 0 && (
                <IonBadge color="danger" style={{ position: "absolute", top: 4, right: 4, fontSize: "0.6rem", minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px" }}>
                  {unreadCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="dashboard-content-a">
        {loading ? (
          <div className="loading-container">
            <LoadingHelix />
            <p>{t("loadingData")}</p>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* KPI cards */}
              <IonGrid className="stats-grid soft-kpi-grid">
                <IonRow>
                  {kpiCards.map((card, index) => (
                    <IonCol size="6" sizeMd="4" sizeLg="2" key={card.key}>
                      <motion.div
                        variants={cardVariants}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ y: -5 }}
                      >
                        <SoftKpiCard
                          icon={card.icon}
                          label={card.label}
                          value={card.value}
                          delta={card.delta}
                          series={card.series}
                          footers={card.footers}
                          onClick={() => history.push(card.url)}
                        />
                      </motion.div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>

              {/* Charts Row */}
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeLg="6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <SoftChartCard
                        icon={pulse}
                        title={t("patientStatus")}
                        subtitle={t("statusBreakdown")}
                        action={t("allTime")}
                      >
                        <div className="soft-gauge-area">
                          <Doughnut
                            data={gaugeData}
                            options={gaugeOptions}
                            plugins={[softCenterTextPlugin]}
                          />
                        </div>
                        <SoftLegendRows rows={statusRows} />
                      </SoftChartCard>
                    </motion.div>
                  </IonCol>

                  <IonCol size="12" sizeLg="6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <SoftChartCard
                        icon={statsChart}
                        title={t("weeklyAppointments")}
                        subtitle={t("weeklyActivity")}
                        action={t("last4Weeks")}
                      >
                        {weekChips && (
                          <SoftStatChips
                            chips={[
                              {
                                label: t("pending"),
                                value: weekChips.pending.current,
                                delta: weekChips.pending.delta,
                                color: SOFT_COLORS.amber,
                              },
                              {
                                label: t("accepted"),
                                value: weekChips.accepted.current,
                                delta: weekChips.accepted.delta,
                                color: SOFT_COLORS.violet,
                              },
                              {
                                label: t("completed"),
                                value: weekChips.completed.current,
                                delta: weekChips.completed.delta,
                                color: SOFT_COLORS.mint,
                              },
                            ]}
                          />
                        )}
                        <div className="soft-chart-area">
                          <Line
                            data={lineChartData}
                            options={lineChartOptions}
                            plugins={[softChartPlugin]}
                          />
                        </div>
                      </SoftChartCard>
                    </motion.div>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Health Units Section */}
              <IonGrid>
                <IonRow>
                  <IonCol size="12">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <SoftChartCard
                        icon={business}
                        title={t("healthUnitsStatus")}
                        subtitle={t("capacityUtilization")}
                      >
                        {unitRows.length > 0 ? (
                          <SoftLegendRows rows={unitRows} />
                        ) : (
                          <p className="soft-card-empty">{t("noHealthUnits")}</p>
                        )}
                      </SoftChartCard>
                    </motion.div>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Upcoming Appointments — fed by the live appointments listener */}
              <IonGrid>
                <IonRow>
                  <IonCol size="12">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                    >
                      <SoftChartCard
                        icon={time}
                        title={t("upcomingAppts")}
                        subtitle={t("upcomingApptsSubtitle")}
                        className="soft-chart-card--stacked-hints"
                      >
                        {upcomingRows.length > 0 ? (
                          <SoftLegendRows rows={upcomingRows} />
                        ) : (
                          <p className="soft-card-empty">
                            {t("noUpcomingAppts")}
                          </p>
                        )}
                      </SoftChartCard>
                    </motion.div>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Recent Activity Sections */}
              <IonGrid className="activity-grid">
                <IonRow>
                  <IonCol size="12" sizeLg="6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <SoftChartCard
                        icon={medkit}
                        title={t("recentCaregivers")}
                        subtitle={t("currentlyActive")}
                      >
                        {recentCaregivers.length > 0 ? (
                          <IonList lines="none" className="caregiver-list">
                            {recentCaregivers.map((caregiver, index) => (
                              <motion.div
                                key={caregiver.id}
                                custom={index}
                                initial="hidden"
                                animate="visible"
                                variants={listItemVariants}
                                whileHover={{ x: 5 }}
                              >
                                <IonItem
                                  className="caregiver-item"
                                  button
                                  detail
                                  routerLink="/admin/doctor_accounts"
                                >
                                  <IonAvatar slot="start">
                                    <img
                                      src={caregiver.avatar || DEFAULT_AVATAR}
                                      alt={caregiver.name}
                                      onError={handleImageError}
                                    />
                                    {/* Decorative status dot (see .status-badge in Admin.scss) */}
                                    <IonBadge
                                      aria-hidden="true"
                                      color={getStatusColor(caregiver.status)}
                                      className="status-badge"
                                    ></IonBadge>
                                  </IonAvatar>
                                  <IonLabel>
                                    <h2>{caregiver.name}</h2>
                                    <p>{caregiver.specialty}</p>
                                    {caregiver.rating > 0 && (
                                      <div className="rating">
                                        <span>★ {caregiver.rating}</span>
                                      </div>
                                    )}
                                  </IonLabel>
                                  <IonChip
                                    color={getStatusColor(caregiver.status)}
                                  >
                                    {caregiver.status}
                                  </IonChip>
                                </IonItem>
                              </motion.div>
                            ))}
                          </IonList>
                        ) : (
                          <p className="soft-card-empty">
                            {t("noRecentCaregivers")}
                          </p>
                        )}
                      </SoftChartCard>
                    </motion.div>
                  </IonCol>

                  <IonCol size="12" sizeLg="6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <SoftChartCard
                        icon={people}
                        title={t("recentPatients")}
                        subtitle={t("recentActivity")}
                      >
                        {recentPatients.length > 0 ? (
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
                                <IonItem
                                  className="patient-item"
                                  button
                                  detail
                                  routerLink="/admin/patient"
                                >
                                  <IonAvatar slot="start">
                                    <img
                                      src={patient.avatar || DEFAULT_AVATAR}
                                      alt={patient.name}
                                      onError={handleImageError}
                                    />
                                  </IonAvatar>
                                  <IonLabel>
                                    <h2>{patient.name}</h2>
                                    <p>{patient.condition}</p>
                                    <div className="health-score">
                                      <span>{t("healthScoreLabel")}: </span>
                                      <IonChip
                                        color={getHealthScoreColor(
                                          patient.healthScore,
                                        )}
                                      >
                                        {patient.healthScore > 0
                                          ? patient.healthScore
                                          : "—"}
                                      </IonChip>
                                    </div>
                                  </IonLabel>
                                  <div className="patient-status">
                                    <IonChip
                                      color={getStatusColor(patient.status)}
                                    >
                                      {bookingStatusLabel(patient.status)}
                                    </IonChip>
                                    <p className="last-checkup">{patient.lastCheckup}</p>
                                  </div>
                                </IonItem>
                              </motion.div>
                            ))}
                          </IonList>
                        ) : (
                          <p className="soft-card-empty">
                            {t("noRecentPatients")}
                          </p>
                        )}
                      </SoftChartCard>
                    </motion.div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </motion.div>
          </AnimatePresence>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;
