import LoadingHelix from "../../components/LoadingHelix";
import React, { useState, useEffect, useCallback } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
} from "@ionic/react";
import {
  calendar,
  cash,
  checkmarkDoneCircle,
  closeCircle,
  hourglass,
  medkit,
  people,
  pieChart,
  pulse,
  refresh,
  star,
  statsChart,
} from "ionicons/icons";
import {
  SoftChartCard,
  SoftKpiCard,
  SoftLegendRows,
} from "./SoftChartCards";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  Line as ChartJsLine,
  Bar as ChartJsBar,
  Doughnut as ChartJsDoughnut,
} from 'react-chartjs-2';
import {
  SOFT_COLORS,
  softBarOptions,
  softChartPlugin,
  softCenterTextPlugin,
  softDoughnutOptions,
  softHorizontalBarOptions,
  softLineFill,
  softLineOptions,
  softPalette,
  softTooltip,
  seriesDelta,
} from "./softChartTheme";
import {
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import "./Analytics.scss";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement,
  BarElement, Title, Tooltip, Legend, Filler
);

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

const COLORS = softPalette;

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

  // ── Chart Data Preparation ──────────────────────────────────────────────────
  // Every chart below reads directly from the state populated by fetchData():
  // monthlyData, statusData, apptTypeData, ageData and specializationData.

  // ── Modern Chart Options ────────────────────────────────────────────────────
  
  // Doughnut chart options (for status, types, age, specializations)
  const doughnutOptions = softDoughnutOptions;

  // Bar chart options (for age groups, specializations)
  const barOptions = softBarOptions;

  // Line chart options (for monthly trends)
  const lineOptions = softLineOptions;

  // ── Sparkline series, deltas and legend rows for the soft cards ─────────
  const appointmentSeries = monthlyData.map((d) => d.appointments);
  const completedSeries = monthlyData.map((d) => d.completed);
  const revenueSeries = monthlyData.map((d) => d.revenue);
  const latestOfMonth = (series: number[]) =>
    series.length > 0 ? series[series.length - 1] : 0;
  const periodLabel = `Last ${timeRange} months`;
  const shareOfTotal = (value: number) =>
    summary.totalAppointments > 0
      ? `${Math.round((value / summary.totalAppointments) * 100)}%`
      : "—";
  const patientsPerDoctor =
    summary.totalDoctors > 0
      ? (summary.totalPatients / summary.totalDoctors).toFixed(1)
      : "—";

  const legendFrom = (points: { name: string; value: number }[]) => {
    const total = points.reduce((sum, d) => sum + d.value, 0);
    return points.map((d, i) => ({
      label: d.name,
      hint: total > 0 ? `${Math.round((d.value / total) * 100)}%` : undefined,
      value: d.value.toLocaleString(),
      color: COLORS[i % COLORS.length],
      pct: total > 0 ? (d.value / total) * 100 : 0,
    }));
  };
  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);
  const statusLegend = legendFrom(statusData);
  const apptTypeTotal = apptTypeData.reduce((sum, d) => sum + d.value, 0);
  const apptTypeLegend = legendFrom(apptTypeData);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Analytics</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => handleRefresh(null)}
              aria-label="Refresh analytics data"
            >
              <IonIcon slot="icon-only" icon={refresh} />
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
              <IonIcon slot="start" icon={calendar} />
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
            <LoadingHelix />
            <p>Loading analytics data...</p>
          </div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <IonGrid className="soft-kpi-grid">
              <IonRow>
                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={people}
                    label="Total Patients"
                    value={summary.totalPatients.toLocaleString()}
                    footers={[
                      { label: "Doctors", value: summary.totalDoctors.toLocaleString() },
                      { label: "Reviews", value: summary.totalRatings.toLocaleString() },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={medkit}
                    label="Caregivers"
                    value={summary.totalDoctors.toLocaleString()}
                    footers={[
                      { label: "Patients / caregiver", value: patientsPerDoctor },
                      { label: "Specialities", value: specializationData.length.toLocaleString() },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={calendar}
                    label="Appointments"
                    value={summary.totalAppointments.toLocaleString()}
                    series={appointmentSeries}
                    delta={seriesDelta(appointmentSeries)}
                    footers={[
                      { label: "This Month", value: latestOfMonth(appointmentSeries).toLocaleString() },
                      { label: "Period", value: periodLabel },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={cash}
                    label="Revenue (XAF)"
                    value={formatXAF(summary.totalRevenue)}
                    series={revenueSeries}
                    delta={seriesDelta(revenueSeries)}
                    footers={[
                      { label: "This Month", value: formatXAF(latestOfMonth(revenueSeries)) },
                      { label: "Completed", value: summary.completedAppointments.toLocaleString() },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={star}
                    label="Avg Doctor Rating"
                    value={summary.avgRating > 0 ? summary.avgRating : "—"}
                    footers={[
                      { label: "Reviews", value: summary.totalRatings.toLocaleString() },
                      { label: "Scale", value: "5.0" },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={hourglass}
                    label="Pending"
                    value={summary.pendingAppointments.toLocaleString()}
                    footers={[
                      { label: "Share", value: shareOfTotal(summary.pendingAppointments) },
                      { label: "Period", value: periodLabel },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={checkmarkDoneCircle}
                    label="Completed"
                    value={summary.completedAppointments.toLocaleString()}
                    series={completedSeries}
                    delta={seriesDelta(completedSeries)}
                    footers={[
                      { label: "Share", value: shareOfTotal(summary.completedAppointments) },
                      { label: "This Month", value: latestOfMonth(completedSeries).toLocaleString() },
                    ]}
                  />
                </IonCol>

                <IonCol size="6" sizeMd="3">
                  <SoftKpiCard
                    icon={closeCircle}
                    label="Cancelled"
                    value={summary.cancelledAppointments.toLocaleString()}
                    footers={[
                      { label: "Share", value: shareOfTotal(summary.cancelledAppointments) },
                      { label: "Period", value: periodLabel },
                    ]}
                  />
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* ── Monthly Trends ── */}
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeLg="8">
                  <SoftChartCard
                    icon={statsChart}
                    title="Monthly Appointment Trends"
                    subtitle={'Bookings, completed and revenue (XAF) per month'}
                    action={periodLabel}
                  >
                      {monthlyData.length === 0 ? (
                        <p className="soft-card-empty">No data for this period</p>
                      ) : (
                        <div className="chart-container">
                          <ChartJsLine
                            data={{
                              labels: monthlyData.map(d => d.month),
                              datasets: [
                                {
                                  label: "Total Appointments",
                                  data: monthlyData.map(d => d.appointments),
                                  borderColor: SOFT_COLORS.violet,
                                  backgroundColor: softLineFill(SOFT_COLORS.violet),
                                  pointBackgroundColor: SOFT_COLORS.violet,
                                  pointBorderColor: SOFT_COLORS.violet,
                                  fill: true,
                                  tension: 0.4,
                                },
                                {
                                  label: "Completed",
                                  data: monthlyData.map(d => d.completed),
                                  borderColor: SOFT_COLORS.mint,
                                  backgroundColor: softLineFill(SOFT_COLORS.mint),
                                  pointBackgroundColor: SOFT_COLORS.mint,
                                  pointBorderColor: SOFT_COLORS.mint,
                                  fill: true,
                                  tension: 0.4,
                                },
                                {
                                  label: "Revenue (XAF)",
                                  data: monthlyData.map(d => d.revenue),
                                  borderColor: SOFT_COLORS.sky,
                                  backgroundColor: softLineFill(SOFT_COLORS.sky),
                                  pointBackgroundColor: SOFT_COLORS.sky,
                                  pointBorderColor: SOFT_COLORS.sky,
                                  fill: true,
                                  tension: 0.4,
                                  borderDash: [6, 5],
                                  yAxisID: "y1",
                                },
                              ],
                            }}
                            options={{
                              ...lineOptions,
                              plugins: {
                                ...lineOptions.plugins,
                                tooltip: {
                                  ...softTooltip,
                                  callbacks: {
                                    label: (context) => {
                                      const val = context.parsed.y;
                                      if (context.dataset.label === "Revenue (XAF)") {
                                        return `${Number(val).toLocaleString()} XAF`;
                                      }
                                      return `${val}`;
                                    },
                                  },
                                },
                              },
                              scales: {
                                ...lineOptions.scales,
                                y: {
                                  ...lineOptions.scales?.y,
                                  beginAtZero: true,
                                },
                                y1: {
                                  position: "right",
                                  beginAtZero: true,
                                  border: { display: false },
                                  grid: { color: "rgba(96, 165, 250, 0.12)" },
                                  ticks: {
                                    color: SOFT_COLORS.sky,
                                    font: { size: 11, family: "Inter, system-ui, sans-serif" },
                                    callback: (value) => Number(value).toLocaleString() + " XAF",
                                  },
                                },
                              },
                            }}
                            plugins={[softChartPlugin]}
                          />
                        </div>
                      )}
                  </SoftChartCard>
                </IonCol>

                {/* ── Appointment Status ── */}
                <IonCol size="12" sizeLg="4">
                  <SoftChartCard
                    icon={pulse}
                    title="Appointment Status"
                    subtitle={`Outcome split · ${statusTotal.toLocaleString()} appointments`}
                  >
                      {statusData.length === 0 ? (
                        <p className="soft-card-empty">No appointments yet</p>
                      ) : (
                        <div className="chart-container">
                          <ChartJsDoughnut
                            data={{
                              labels: statusData.map(d => d.name),
                              datasets: [{
                                data: statusData.map(d => d.value),
                                backgroundColor: [
                                  SOFT_COLORS.mint,
                                  SOFT_COLORS.amber,
                                  SOFT_COLORS.rose,
                                ],
                                borderColor: SOFT_COLORS.panel,
                                borderWidth: 2,
                                hoverBorderColor: SOFT_COLORS.violet,
                                hoverOffset: 10,
                                spacing: 3,
                              }],
                            }}
                            options={{
                              ...doughnutOptions,
                              plugins: {
                                ...doughnutOptions.plugins,
                                softCenterText: {
                                  value: statusData
                                    .reduce((sum, d) => sum + d.value, 0)
                                    .toLocaleString(),
                                  label: "Total",
                                },
                                tooltip: {
                                  ...softTooltip,
                                  callbacks: {
                                    label: (context) => {
                                      const total = context.dataset.data.reduce((a, b) => a + Number(b), 0);
                                      const pct = ((context.parsed / total) * 100).toFixed(0);
                                      return `${context.label}: ${context.parsed} (${pct}%)`;
                                    },
                                  },
                                },
                              },
                            }}
                            plugins={[softChartPlugin, softCenterTextPlugin]}
                          />
                        </div>
                      )}

                    {statusLegend.length > 0 && (
                      <div className="soft-chart-card__legend">
                        <SoftLegendRows rows={statusLegend} />
                      </div>
                    )}
                  </SoftChartCard>
                </IonCol>
              </IonRow>

              {/* ── Appointment Type Distribution ── */}
              <IonRow>
                <IonCol size="12" sizeLg="5">
                  <SoftChartCard
                    icon={pieChart}
                    title="Appointment Types"
                    subtitle={`Distribution of care types · ${apptTypeTotal.toLocaleString()}`}
                  >
                      {apptTypeData.length === 0 ? (
                        <p className="soft-card-empty">No data</p>
                      ) : (
                        <div className="chart-container">
                          <ChartJsDoughnut
                            data={{
                              labels: apptTypeData.map(d => d.name),
                              datasets: [{
                                data: apptTypeData.map(d => d.value),
                                backgroundColor: COLORS,
                                borderColor: SOFT_COLORS.panel,
                                borderWidth: 2,
                                hoverBorderColor: SOFT_COLORS.violet,
                                hoverOffset: 10,
                                spacing: 3,
                              }],
                            }}
                            options={{
                              ...doughnutOptions,
                              plugins: {
                                ...doughnutOptions.plugins,
                                softCenterText: {
                                  value: apptTypeData
                                    .reduce((sum, d) => sum + d.value, 0)
                                    .toLocaleString(),
                                  label: "Total",
                                },
                              },
                            }}
                            plugins={[softChartPlugin, softCenterTextPlugin]}
                          />
                        </div>
                      )}

                    {apptTypeLegend.length > 0 && (
                      <div className="soft-chart-card__legend">
                        <SoftLegendRows rows={apptTypeLegend} />
                      </div>
                    )}
                  </SoftChartCard>
                </IonCol>

                {/* ── Patient Age Demographics ── */}
                <IonCol size="12" sizeLg="7">
                  <SoftChartCard
                    icon={people}
                    title="Patient Age Groups"
                    subtitle={'Patients bucketed by age bracket'}
                  >
                      {ageData.length === 0 ? (
                        <p className="soft-card-empty">No data</p>
                      ) : (
                        <div className="chart-container">
                          <ChartJsBar
                            data={{
                              labels: ageData.map(d => d.ageGroup),
                              datasets: [{
                                data: ageData.map(d => d.count),
                                backgroundColor: "rgba(124, 92, 255, 0.75)",
                                borderColor: SOFT_COLORS.violet,
                                borderWidth: 2,
                                borderRadius: 999,
                                hoverBackgroundColor: "rgba(109, 58, 245, 0.9)",
                                hoverBorderColor: SOFT_COLORS.indigo,
                              }],
                            }}
                            options={softHorizontalBarOptions}
                            plugins={[softChartPlugin]}
                        />
                      </div>
                      )}
                  </SoftChartCard>
                </IonCol>
              </IonRow>

              {/* ── Top Specializations ── */}
              <IonRow>
                <IonCol size="12">
                  <SoftChartCard
                    icon={medkit}
                    title="Top Specializations by Appointments"
                    subtitle={'Most requested specialities in the selected period'}
                  >
                      {specializationData.length === 0 ? (
                        <p className="soft-card-empty">No data</p>
                      ) : (
                        <div className="chart-container">
                        <ChartJsBar
                          data={{
                            labels: specializationData.map(d => d.name),
                            datasets: [{
                              data: specializationData.map(d => d.appointments),
                              backgroundColor: specializationData.map((_, index) => `${COLORS[index % COLORS.length]}b3`),
                              borderColor: specializationData.map((_, index) => COLORS[index % COLORS.length]),
                              borderWidth: 2,
                              borderRadius: 8,
                              hoverBackgroundColor: "rgba(124, 92, 255, 0.55)",
                              hoverBorderColor: SOFT_COLORS.violet,
                            }],
                          }}
                          options={barOptions}
                          plugins={[softChartPlugin]}
                        />
                      </div>
                      )}
                  </SoftChartCard>
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
