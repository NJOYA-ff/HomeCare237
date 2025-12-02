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
} from "@ionic/react";
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

  // Load data
  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setStats({
        patients: 187,
        caregivers: 42,
        appointments: 23,
        alerts: 5,
        healthUnits: 8,
      });

      setRecentCaregivers([
        {
          id: 1,
          name: "Dr. Sarah Johnson",
          avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
          status: "online",
          specialty: "Geriatrics",
          rating: 4.8,
        },
        {
          id: 2,
          name: "Dr. Michael Chen",
          avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
          status: "busy",
          specialty: "Physical Therapy",
          rating: 4.6,
        },
        {
          id: 3,
          name: "Nurse David Wilson",
          avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
          status: "offline",
          specialty: "Post-Op Care",
          rating: 4.9,
        },
        {
          id: 4,
          name: "Nurse Emily Davis",
          avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
          status: "online",
          specialty: "Palliative Care",
          rating: 4.7,
        },
      ]);

      setRecentPatients([
        {
          id: 1,
          name: "Robert Smith",
          condition: "Post-op recovery",
          status: "completed",
          lastCheckup: "Today, 9:30 AM",
          healthScore: 82,
        },
        {
          id: 2,
          name: "Emma Davis",
          condition: "Chronic pain management",
          status: "confirmed",
          lastCheckup: "Yesterday",
          healthScore: 65,
        },
        {
          id: 3,
          name: "James Brown",
          condition: "Palliative care",
          status: "pending",
          lastCheckup: "Today, 11:15 AM",
          healthScore: 32,
        },
        {
          id: 4,
          name: "Maria Garcia",
          condition: "Physical therapy",
          status: "completed",
          lastCheckup: "Today, 2:45 PM",
          healthScore: 78,
        },
      ]);

      setUpcomingAppointments([
        {
          id: 1,
          patientName: "Robert Smith",
          caregiverName: "Dr. Sarah Johnson",
          date: "Today",
          time: "2:00 PM",
          status: "confirmed",
          type: "Follow-up",
        },
        {
          id: 2,
          patientName: "Emma Davis",
          caregiverName: "Dr. Michael Chen",
          date: "Tomorrow",
          time: "10:30 AM",
          status: "confirmed",
          type: "Therapy",
        },
        {
          id: 3,
          patientName: "New Patient",
          caregiverName: "Unassigned",
          date: "Tomorrow",
          time: "3:45 PM",
          status: "pending",
          type: "Initial",
        },
        {
          id: 4,
          patientName: "James Brown",
          caregiverName: "Nurse Emily Davis",
          date: "Today",
          time: "4:30 PM",
          status: "confirmed",
          type: "Medication",
        },
      ]);

      setHealthUnits([
        {
          id: 1,
          name: "Main Care Center",
          location: "Downtown",
          patients: 42,
          capacity: 50,
          status: "busy",
        },
        {
          id: 2,
          name: "Northside Clinic",
          location: "North District",
          patients: 28,
          capacity: 40,
          status: "optimal",
        },
        {
          id: 3,
          name: "Westend Facility",
          location: "West District",
          patients: 65,
          capacity: 60,
          status: "overcrowded",
        },
        {
          id: 4,
          name: "Eastside Hospice",
          location: "East District",
          patients: 18,
          capacity: 25,
          status: "optimal",
        },
      ]);

      setPatientStats({
        ...patientStats,
        series: [124, 42, 21],
      });

      setAppointmentStats({
        ...appointmentStats,
        series: [
          { name: "Pending", data: [4, 5, 6, 3, 7, 2, 0] },
          { name: "Confirmed", data: [12, 15, 10, 14, 16, 8, 3] },
          { name: "Completed", data: [18, 20, 15, 22, 19, 12, 5] },
        ],
      });

      setLoading(false);
    }, 1500);
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
      <IonHeader className="dashboard-header-a" class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton>
              <FiMenu size={20} />{" "}
            </IonMenuButton>
          </IonButtons>
          <IonTitle className="header-title">Admin Dashboard</IonTitle>
          <IonButtons slot="end">
            <IonBadge color="danger">{stats.alerts}</IonBadge>
            <IonIcon icon={notifications} className="header-icon" />
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
                    <IonCol size="12" sizeSm="6" sizeLg="2.4" key={stat.title}>
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
                            <IonCardSubtitle>
                              <IonIcon icon={stat.icon} />
                              <span>{stat.title}</span>
                            </IonCardSubtitle>
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
                                          unit.capacity
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
                                        patient.healthScore
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
                                          patient.healthScore
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
