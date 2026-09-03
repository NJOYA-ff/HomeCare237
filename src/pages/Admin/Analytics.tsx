import React, { useState, useEffect, useCallback } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonButton,
  IonSpinner,
  IonBadge,
  IonBackButton,
} from "@ionic/react";
import {
  barChartOutline,
  pulseOutline,
  peopleOutline,
  calendarOutline,
  refreshOutline,
  medkitOutline,
  starOutline,
  cashOutline,
  personOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeCircleOutline,
} from "ionicons/icons";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import "./Analytics.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  avgRating: number;
  totalRatings: number;
  pendingAppointments: number;
  cancelledAppointments: number;
}

interface MonthlyPoint {
  month: string;
  appointments: number;
  completed: number;
  revenue: number;
}

interface AppointmentTypePoint {
  name: string;
  value: number;
}

interface SpecializationPoint {
  name: string;
  doctors: number;
  appointments: number;
}

interface AgeGroupPoint {
  ageGroup: string;
  count: number;
}

interface StatusPoint {
  name: string;
  value: number;
}

const COLORS = [
  "#2a5ba7", "#c53b50", "#4ba77c", "#f5a623",
  "#9b59b6", "#34495e", "#16a085", "#e67e22",
  "#2980b9", "#8e44ad",
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val?.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ageGroup(age: number): string {
  if (age <= 18) return "0-18";
  if (age <= 30) return "19-30";
  if (age <= 45) return "31-45";
  if (age <= 60) return "46-60";
  return "60+";
}

function formatXAF(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<number>(6); // months
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<SummaryStats>({
    totalPatients: 0, totalDoctors: 0, totalAppointments: 0,
    completedAppointments: 0, totalRevenue: 0, avgRating: 0,
    totalRatings: 0, pendingAppointments: 0, cancelledAppointments: 0,
  });

  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [apptTypeData, setApptTypeData] = useState<AppointmentTypePoint[]>([]);
  const [specializationData, setSpecializationData] = useState<SpecializationPoint[]>([]);
  const [ageData, setAgeData] = useState<AgeGroupPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cutoff = monthsAgo(timeRange);

      // ── Parallel fetches ────────────────────────────────────────────────
      const [
        patientsSnap,
        doctorsSnap,
        appointmentsSnap,
        ratingsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "patients")),
        getDocs(collection(db, "doctors")),
        getDocs(collection(db, "appointments")),
        getDocs(collection(db, "ratings")),
      ]);

      // ── Patients ────────────────────────────────────────────────────────
      const totalPatients = patientsSnap.size;

      // Age demographics
      const ageCounts: Record<string, number> = {
        "0-18": 0, "19-30": 0, "31-45": 0, "46-60": 0, "60+": 0,
      };
      patientsSnap.forEach((d) => {
        const age = Number(d.data().age);
        if (!isNaN(age)) ageCounts[ageGroup(age)] = (ageCounts[ageGroup(age)] || 0) + 1;
      });
      setAgeData(
        Object.entries(ageCounts).map(([ageGroup, count]) => ({ ageGroup, count }))
      );

      // ── Doctors ─────────────────────────────────────────────────────────
      const totalDoctors = doctorsSnap.size;

      // Specialization map
      const specMap: Record<string, { doctors: number; appointments: number }> = {};
      doctorsSnap.forEach((d) => {
        const spec = d.data().specialization || "General";
        if (!specMap[spec]) specMap[spec] = { doctors: 0, appointments: 0 };
        specMap[spec].doctors++;
      });

      // ── Appointments ────────────────────────────────────────────────────
      let totalRevenue = 0;
      let completed = 0;
      let pending = 0;
      let cancelled = 0;
      const typeMap: Record<string, number> = {};
      const monthMap: Record<string, { appointments: number; completed: number; revenue: number }> = {};

      // Init last N months
      for (let i = timeRange - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
        monthMap[key] = { appointments: 0, completed: 0, revenue: 0 };
      }

      appointmentsSnap.forEach((d) => {
        const data = d.data();
        const date = toDate(data.createdAt || data.date);
        const status: string = data.status || "pending";
        const fee = Number(data.consultationFee) || 0;
        const type: string = data.type || "Online";
        const spec: string = data.doctorSpecialization || "General";

        // Count statuses
        if (status === "completed") { completed++; totalRevenue += fee; }
        else if (status === "pending") pending++;
        else if (status === "cancelled") cancelled++;

        // Appointment type distribution
        typeMap[type] = (typeMap[type] || 0) + 1;

        // Specialization appointments
        if (specMap[spec]) specMap[spec].appointments++;
        else specMap[spec] = { doctors: 0, appointments: 1 };

        // Monthly trend (filter by cutoff)
        if (date && date >= cutoff) {
          const key = `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
          if (monthMap[key]) {
            monthMap[key].appointments++;
            if (status === "completed") {
              monthMap[key].completed++;
              monthMap[key].revenue += fee;
            }
          }
        }
      });

      const totalAppointments = appointmentsSnap.size;

      setMonthlyData(
        Object.entries(monthMap).map(([month, v]) => ({ month, ...v }))
      );

      setApptTypeData(
        Object.entries(typeMap).map(([name, value]) => ({ name, value }))
      );

      setSpecializationData(
        Object.entries(specMap)
          .sort((a, b) => b[1].appointments - a[1].appointments)
          .slice(0, 8)
          .map(([name, v]) => ({ name, ...v }))
      );

      setStatusData([
        { name: "Completed", value: completed },
        { name: "Pending", value: pending },
        { name: "Cancelled", value: cancelled },
        { name: "Other", value: totalAppointments - completed - pending - cancelled },
      ].filter((s) => s.value > 0));

      // ── Ratings ─────────────────────────────────────────────────────────
      const totalRatings = ratingsSnap.size;
      let starSum = 0;
      ratingsSnap.forEach((d) => { starSum += Number(d.data().stars) || 0; });
      const avgRating = totalRatings > 0 ? Math.round((starSum / totalRatings) * 10) / 10 : 0;

      setSummary({
        totalPatients,
        totalDoctors,
        totalAppointments,
        completedAppointments: completed,
        totalRevenue,
        avgRating,
        totalRatings,
        pendingAppointments: pending,
        cancelledAppointments: cancelled,
      });

    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async (event: any) => {
    await fetchData();
    event?.detail?.complete?.();
  };

  // Pie label
  const renderPieLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || percent === undefined) return null;
    const RADIAN = Math.PI / 180;
    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
        {`${(Number(percent) * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Analytics</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => handleRefresh(null)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Time Range Filter */}
        <IonCard>
          <IonCardContent style={{ paddingTop: 8, paddingBottom: 8 }}>
            <IonItem lines="none">
              <IonIcon icon={calendarOutline} slot="start" color="primary" />
              <IonLabel>Time Range</IonLabel>
              <IonSelect
                value={timeRange}
                onIonChange={(e) => setTimeRange(Number(e.detail.value))}
                interface="popover"
                slot="end"
              >
                <IonSelectOption value={1}>Last Month</IonSelectOption>
                <IonSelectOption value={3}>Last 3 Months</IonSelectOption>
                <IonSelectOption value={6}>Last 6 Months</IonSelectOption>
                <IonSelectOption value={12}>Last Year</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonCardContent>
        </IonCard>

        {loading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading analytics data...</p>
          </div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <IonGrid>
              <IonRow>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={peopleOutline} color="primary" style={{ fontSize: 24 }} />
                      <h2>{summary.totalPatients.toLocaleString()}</h2>
                      <p>Total Patients</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={medkitOutline} color="secondary" style={{ fontSize: 24 }} />
                      <h2>{summary.totalDoctors.toLocaleString()}</h2>
                      <p>Total Doctors</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={calendarOutline} color="tertiary" style={{ fontSize: 24 }} />
                      <h2>{summary.totalAppointments.toLocaleString()}</h2>
                      <p>Appointments</p>
                      <IonBadge color="success" style={{ fontSize: 10 }}>
                        {summary.completedAppointments} done
                      </IonBadge>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={cashOutline} color="success" style={{ fontSize: 24 }} />
                      <h2>{formatXAF(summary.totalRevenue)}</h2>
                      <p>Revenue (XAF)</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={starOutline} color="warning" style={{ fontSize: 24 }} />
                      <h2>{summary.avgRating > 0 ? summary.avgRating : "—"}</h2>
                      <p>Avg Doctor Rating</p>
                      <IonBadge color="medium" style={{ fontSize: 10 }}>
                        {summary.totalRatings} reviews
                      </IonBadge>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={timeOutline} color="warning" style={{ fontSize: 24 }} />
                      <h2>{summary.pendingAppointments.toLocaleString()}</h2>
                      <p>Pending</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={checkmarkCircleOutline} color="success" style={{ fontSize: 24 }} />
                      <h2>{summary.completedAppointments.toLocaleString()}</h2>
                      <p>Completed</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardContent>
                      <IonIcon icon={closeCircleOutline} color="danger" style={{ fontSize: 24 }} />
                      <h2>{summary.cancelledAppointments.toLocaleString()}</h2>
                      <p>Cancelled</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* ── Monthly Trends ── */}
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeLg="8">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={barChartOutline} /> Monthly Appointment Trends
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {monthlyData.length === 0 ? (
                        <p style={{ color: "var(--ion-color-medium)", textAlign: "center" }}>No data for this period</p>
                      ) : (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={monthlyData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={formatXAF} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(val: any, name: string) =>
                                name === "Revenue (XAF)" ? [`${Number(val).toLocaleString()} XAF`, name] : [val, name]
                              } />
                              <Legend />
                              <Line yAxisId="left" type="monotone" dataKey="appointments" stroke={COLORS[0]} name="Total" dot={false} />
                              <Line yAxisId="left" type="monotone" dataKey="completed" stroke={COLORS[2]} name="Completed" dot={false} />
                              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={COLORS[3]} name="Revenue (XAF)" dot={false} strokeDasharray="4 2" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* ── Appointment Status ── */}
                <IonCol size="12" sizeLg="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={pulseOutline} /> Appointment Status
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {statusData.length === 0 ? (
                        <p style={{ color: "var(--ion-color-medium)", textAlign: "center" }}>No appointments yet</p>
                      ) : (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                label={renderPieLabel}
                                labelLine={false}
                              >
                                {statusData.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {/* ── Appointment Type Distribution ── */}
              <IonRow>
                <IonCol size="12" sizeLg="5">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={medkitOutline} /> Appointment Types
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {apptTypeData.length === 0 ? (
                        <p style={{ color: "var(--ion-color-medium)", textAlign: "center" }}>No data</p>
                      ) : (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie data={apptTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={renderPieLabel} labelLine={false}>
                                {apptTypeData.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* ── Patient Age Demographics ── */}
                <IonCol size="12" sizeLg="7">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={personOutline} /> Patient Age Groups
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={ageData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="ageGroup" type="category" width={45} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Patients" fill={COLORS[3]} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {/* ── Top Specializations ── */}
              <IonRow>
                <IonCol size="12">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={medkitOutline} /> Top Specializations by Appointments
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {specializationData.length === 0 ? (
                        <p style={{ color: "var(--ion-color-medium)", textAlign: "center" }}>No data</p>
                      ) : (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={specializationData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="appointments" name="Appointments" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="doctors" name="Doctors" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Analytics;
