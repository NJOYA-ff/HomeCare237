import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonAvatar,
  IonBadge,
  IonButtons,
  IonMenuButton,
  IonProgressBar,
  IonChip,
  IonButton,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import {
  person,
  notifications,
  calendar,
  people,
  alertCircle,
  location,
  time,
  heart,
  business,
} from "ionicons/icons";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import "./Admin.scss";
import { FiMenu } from "react-icons/fi";

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
  status: "pending" | "confirmed" | "completed";
  type: string;
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

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const { unreadCount } = useNotifications();
  const [stats, setStats] = useState({
    patients: 0,
    caregivers: 0,
    appointments: 0,
    alerts: 3,
    healthUnits: 0,
  });
  const [recentCaregivers, setRecentCaregivers] = useState<Caregiver[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [healthUnits, setHealthUnits] = useState<HealthUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart data with proper ApexOptions type
  const [patientStats, setPatientStats] = useState<{
    options: ApexOptions;
    series: number[];
  }>({
    options: {
      chart: {
        id: "patient-stats",
        toolbar: { show: false },
      },
      colors: ["#2dd36f", "#3880ff", "#ffc409"],
      labels: ["Completed", "Confirmed", "Pending"],
      legend: { position: "bottom" as const }, // Explicitly type as const
    },
    series: [0, 0, 0],
  });

  const [appointmentStats, setAppointmentStats] = useState<{
    options: ApexOptions;
    series: { name: string; data: number[] }[];
  }>({
    options: {
      chart: {
        id: "appointment-stats",
        toolbar: { show: false },
      },
      colors: ["#ffc409", "#3880ff", "#2dd36f"],
      labels: ["Pending", "Confirmed", "Completed"],
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
      legend: { position: "bottom" as const }, // Explicitly type as const
    },
    series: [
      { name: "Pending", data: [0, 0, 0, 0, 0, 0, 0] },
      { name: "Confirmed", data: [0, 0, 0, 0, 0, 0, 0] },
      { name: "Completed", data: [0, 0, 0, 0, 0, 0, 0] },
    ],
  });

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

        // Fetch recent doctors with real data
        const doctorsData: Caregiver[] = [];
        doctorsSnapshot.forEach((doc) => {
          const data = doc.data();
          doctorsData.push({
            id: parseInt(doc.id) || doctorsData.length + 1,
            name: data.name || "Unknown Doctor",
            avatar:
              data.profileImage ||
              "https://ionicframework.com/docs/img/demos/avatar.svg",
            status: data.status || "offline",
            specialty:
              data.specialization || data.specialty || "General Practice",
            rating: data.rating || 4.5,
          });
        });
        setRecentCaregivers(doctorsData.slice(0, 4));

        // Fetch recent patients with real data
        const patientsData: Patient[] = [];
        patientsSnapshot.forEach((doc) => {
          const data = doc.data();
          patientsData.push({
            id: parseInt(doc.id) || patientsData.length + 1,
            name: data.name || "Unknown Patient",
            condition: data.medicalCondition || "Not specified",
            status: "completed",
            lastCheckup: data.lastCheckupDate || "Not scheduled",
            healthScore: data.healthScore || 75,
          });
        });
        setRecentPatients(patientsData.slice(0, 4));

        // Fetch health units with real data
        const unitsData: HealthUnit[] = [];
        unitsSnapshot.forEach((doc) => {
          const data = doc.data();
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

        // Update stats
        setStats({
          patients: patientCount,
          caregivers: doctorCount,
          appointments: 0, // Will be updated by real-time listener
          alerts: 5,
          healthUnits: unitsCount,
        });

        // Real-time listener for appointments
        const appointmentsRef = collection(db, "appointments");
        unsubscribeAppointments = onSnapshot(appointmentsRef, (snapshot) => {
          const appointmentsData: Appointment[] = [];
          let pendingCount = 0,
            confirmedCount = 0,
            completedCount = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.status || "pending";
            const date =
              data.date instanceof Timestamp
                ? data.date.toDate()
                : new Date(data.date);
            const dateStr = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            if (status === "pending") pendingCount++;
            else if (status === "confirmed") confirmedCount++;
            else if (status === "completed") completedCount++;

            appointmentsData.push({
              id: parseInt(doc.id) || appointmentsData.length + 1,
              patientName: data.patientName || "Unknown",
              caregiverName: data.doctorName || "Unassigned",
              date: dateStr,
              time: data.time || "TBD",
              status: status,
              type: data.type || "General",
            });
          });

          setUpcomingAppointments(appointmentsData.slice(0, 4));

          // Update appointment stats for chart
          setStats((prev) => ({
            ...prev,
            appointments: snapshot.size,
          }));

          // Update patient stats chart
          setPatientStats((prev) => ({
            ...prev,
            series: [completedCount, confirmedCount, pendingCount],
          }));
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

  return (
    <IonPage className="dashboard-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton>
              <FiMenu size={20} />{" "}
            </IonMenuButton>
          </IonButtons>
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push("/admin/notifications")} style={{ position: "relative" }}>
              <IonIcon icon={notifications} className="header-icon" />
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats Cards */}
              <IonGrid className="stats-grid">
                <IonRow>
                  {[
                    {
                      icon: people,
                      title: "Patients",
                      value: stats.patients,
                      color: "primary",
                      trend: "up",
                      url: "/admin/patient",
                    },
                    {
                      icon: person,
                      title: "Doctors",
                      value: stats.caregivers,
                      color: "secondary",
                      trend: "up",
                      url: "/admin/doctor",
                    },
                    {
                      icon: calendar,
                      title: "Appointments",
                      value: stats.appointments,
                      color: "tertiary",
                      trend: "steady",
                      url: "/admin/appointments",
                    },
                    {
                      icon: business,
                      title: "Health Units",
                      value: stats.healthUnits,
                      color: "success",
                      trend: "steady",
                      url: "/admin/health_units",
                    },
                    {
                      icon: alertCircle,
                      title: "Alerts",
                      value: stats.alerts,
                      color: "danger",
                      trend: "down",
                      url: "/admin/#",
                    },
                  ].map((stat, index) => (
                    <IonCol size="6" sizeLg="2.4" key={stat.title}>
                      <motion.div
                        variants={cardVariants}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ y: -5 }}
                      >
                        <IonCard
                          className={`stats-card stats-${stat.color}`}
                          routerLink={stat.url}
                        >
                          <IonCardHeader>
                            <div className="stat-icon-wrap">
                              <IonIcon icon={stat.icon} />
                            </div>
                            <IonCardSubtitle>{stat.title}</IonCardSubtitle>
                            <IonCardTitle>{stat.value}</IonCardTitle>
                          </IonCardHeader>
                        </IonCard>
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
                      <IonCard className="chart-card">
                        <IonCardHeader>
                          <IonCardTitle>Patient Status</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <Chart
                            options={patientStats.options}
                            series={patientStats.series}
                            type="donut"
                            height="300"
                          />
                        </IonCardContent>
                      </IonCard>
                    </motion.div>
                  </IonCol>

                  <IonCol size="12" sizeLg="6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <IonCard className="chart-card">
                        <IonCardHeader>
                          <IonCardTitle>Weekly Appointments</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <Chart
                            options={appointmentStats.options}
                            series={appointmentStats.series}
                            type="bar"
                            height="300"
                          />
                        </IonCardContent>
                      </IonCard>
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
                      <IonCard>
                        <IonCardHeader>
                          <IonCardTitle>Health Units Status</IonCardTitle>
                          <IonCardSubtitle>
                            Capacity and Utilization
                          </IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <IonList lines="full" className="units-list">
                            {healthUnits.map((unit, index) => (
                              <motion.div
                                key={unit.id}
                                custom={index}
                                initial="hidden"
                                animate="visible"
                                variants={listItemVariants}
                                whileHover={{ x: 5 }}
                              >
                                <IonItem className="unit-item" detail>
                                  <IonAvatar slot="start">
                                    <IonIcon
                                      icon={location}
                                      color={getStatusColor(unit.status)}
                                    />
                                  </IonAvatar>
                                  <IonLabel>
                                    <h2>{unit.name}</h2>
                                    <p>{unit.location}</p>
                                    <IonProgressBar
                                      value={unit.patients / unit.capacity}
                                      color={getStatusColor(unit.status)}
                                    />
                                    <div className="capacity-info">
                                      <span>
                                        {unit.patients}/{unit.capacity} patients
                                      </span>
                                      <span>
                                        {getCapacityPercentage(
                                          unit.patients,
                                          unit.capacity,
                                        )}
                                        % capacity
                                      </span>
                                    </div>
                                  </IonLabel>
                                  <IonChip color={getStatusColor(unit.status)}>
                                    {unit.status}
                                  </IonChip>
                                </IonItem>
                              </motion.div>
                            ))}
                          </IonList>
                        </IonCardContent>
                      </IonCard>
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
                      <IonCard className="activity-card">
                        <IonCardHeader>
                          <IonCardTitle>Recent Caregivers</IonCardTitle>
                          <IonCardSubtitle>Currently Active</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
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
                                >
                                  <IonAvatar slot="start">
                                    <img
                                      src={caregiver.avatar}
                                      alt={caregiver.name}
                                    />
                                    <IonBadge
                                      color={getStatusColor(caregiver.status)}
                                      className="status-badge"
                                    ></IonBadge>
                                  </IonAvatar>
                                  <IonLabel>
                                    <h2>{caregiver.name}</h2>
                                    <p>{caregiver.specialty}</p>
                                    <div className="rating">
                                      {[...Array(5)].map((_, i) => (
                                        <IonIcon
                                          key={i}
                                          icon={
                                            i < Math.floor(caregiver.rating)
                                              ? "star"
                                              : "star-outline"
                                          }
                                          color="warning"
                                        />
                                      ))}
                                      <span>({caregiver.rating})</span>
                                    </div>
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
                        </IonCardContent>
                      </IonCard>
                    </motion.div>
                  </IonCol>

                  <IonCol size="12" sizeLg="6">
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
                            Health Status Overview
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
                                    <IonIcon
                                      icon={heart}
                                      color={getHealthScoreColor(
                                        patient.healthScore,
                                      )}
                                    />
                                  </IonAvatar>
                                  <IonLabel>
                                    <h2>{patient.name}</h2>
                                    <p>{patient.condition}</p>
                                    <div className="health-score">
                                      <span>Health Score: </span>
                                      <IonChip
                                        color={getHealthScoreColor(
                                          patient.healthScore,
                                        )}
                                      >
                                        {patient.healthScore}
                                      </IonChip>
                                    </div>
                                  </IonLabel>
                                  <div className="patient-status">
                                    <IonChip
                                      color={getStatusColor(patient.status)}
                                    >
                                      {patient.status}
                                    </IonChip>
                                    <p className="last-checkup">
                                      <IonIcon icon={time} />
                                      {patient.lastCheckup}
                                    </p>
                                  </div>
                                </IonItem>
                              </motion.div>
                            ))}
                          </IonList>
                        </IonCardContent>
                      </IonCard>
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
