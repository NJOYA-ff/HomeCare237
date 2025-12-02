import React, { useState, useEffect } from "react";
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
  IonChip,
  IonBackButton,
} from "@ionic/react";
import {
  barChartOutline,
  pulseOutline,
  peopleOutline,
  locationOutline,
  calendarOutline,
  refreshOutline,
  businessOutline,
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
import "./Analytics.scss";

// Define TypeScript interfaces
interface RegionData {
  name: string;
  patients: number;
  healthUnits: number;
  consultations: number;
  revenue: number;
}

interface HealthMetric {
  month: string;
  consultations: number;
  emergencies: number;
  revenue: number;
}

interface PatientDemographic {
  ageGroup: string;
  count: number;
}

interface ServiceType {
  name: string;
  value: number;
}

// Mock data for Cameroon's 10 regions
const regionsData: RegionData[] = [
  {
    name: "Adamawa",
    patients: 1250,
    healthUnits: 42,
    consultations: 5670,
    revenue: 42500000,
  },
  {
    name: "Centre",
    patients: 3850,
    healthUnits: 128,
    consultations: 18750,
    revenue: 142000000,
  },
  {
    name: "East",
    patients: 1950,
    healthUnits: 65,
    consultations: 8950,
    revenue: 67500000,
  },
  {
    name: "Far North",
    patients: 3150,
    healthUnits: 87,
    consultations: 14250,
    revenue: 98500000,
  },
  {
    name: "Littoral",
    patients: 4250,
    healthUnits: 145,
    consultations: 21500,
    revenue: 168000000,
  },
  {
    name: "North",
    patients: 2450,
    healthUnits: 72,
    consultations: 11250,
    revenue: 78500000,
  },
  {
    name: "Northwest",
    patients: 2750,
    healthUnits: 81,
    consultations: 12650,
    revenue: 89500000,
  },
  {
    name: "South",
    patients: 1650,
    healthUnits: 54,
    consultations: 7450,
    revenue: 55500000,
  },
  {
    name: "Southwest",
    patients: 2250,
    healthUnits: 68,
    consultations: 10250,
    revenue: 72500000,
  },
  {
    name: "West",
    patients: 2950,
    healthUnits: 92,
    consultations: 13500,
    revenue: 98500000,
  },
];

// Monthly metrics data
const monthlyMetrics: HealthMetric[] = [
  { month: "Jan", consultations: 12500, emergencies: 850, revenue: 95000000 },
  { month: "Feb", consultations: 13200, emergencies: 920, revenue: 102000000 },
  { month: "Mar", consultations: 11800, emergencies: 780, revenue: 89000000 },
  { month: "Apr", consultations: 14500, emergencies: 1050, revenue: 115000000 },
  { month: "May", consultations: 15200, emergencies: 1120, revenue: 125000000 },
  { month: "Jun", consultations: 14200, emergencies: 980, revenue: 112000000 },
  { month: "Jul", consultations: 13800, emergencies: 940, revenue: 108000000 },
  { month: "Aug", consultations: 16200, emergencies: 1250, revenue: 135000000 },
  { month: "Sep", consultations: 14800, emergencies: 1020, revenue: 118000000 },
  { month: "Oct", consultations: 15500, emergencies: 1150, revenue: 128000000 },
  { month: "Nov", consultations: 16200, emergencies: 1220, revenue: 135000000 },
  { month: "Dec", consultations: 17500, emergencies: 1350, revenue: 152000000 },
];

// Patient demographics data
const patientDemographics: PatientDemographic[] = [
  { ageGroup: "0-18", count: 3500 },
  { ageGroup: "19-30", count: 6200 },
  { ageGroup: "31-45", count: 8500 },
  { ageGroup: "46-60", count: 5200 },
  { ageGroup: "60+", count: 4100 },
];

// Service types data
const serviceTypes: ServiceType[] = [
  { name: "General Consultation", value: 45 },
  { name: "Home Nursing", value: 20 },
  { name: "Elderly Care", value: 15 },
  { name: "Post-Op Care", value: 10 },
  { name: "Maternal Care", value: 8 },
  { name: "Other", value: 2 },
];

// Colors for charts
const COLORS = [
  "#2a5ba7",
  "#c53b50",
  "#4ba77c",
  "#f5a623",
  "#9b59b6",
  "#34495e",
  "#16a085",
  "#e67e22",
  "#2980b9",
  "#8e44ad",
];

const Analytics: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>("6months");
  const [patients, setPatients] = useState(27500);

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = (event: any) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      event.detail.complete();
    }, 2000);
  };

  // Filter data based on selected region
  const filteredRegionData =
    selectedRegion === "all"
      ? regionsData
      : regionsData.filter((region) => region.name === selectedRegion);

  // Fixed function to handle the pie chart label with proper Recharts typing
  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;

    if (
      !cx ||
      !cy ||
      !midAngle ||
      !innerRadius ||
      !outerRadius ||
      percent === undefined
    ) {
      return null;
    }

    // Convert all values to numbers to fix the TypeScript error
    const numCx = Number(cx);
    const numCy = Number(cy);
    const numMidAngle = Number(midAngle);
    const numInnerRadius = Number(innerRadius);
    const numOuterRadius = Number(outerRadius);
    const numPercent = Number(percent);

    const RADIAN = Math.PI / 180;
    const radius = numInnerRadius + (numOuterRadius - numInnerRadius) * 0.5;
    const x = numCx + radius * Math.cos(-numMidAngle * RADIAN);
    const y = numCy + radius * Math.sin(-numMidAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > numCx ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${name} ${(numPercent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />{" "}
          </IonButtons>
          <IonTitle>Healthcare Analytics</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => handleRefresh({ detail: { complete: () => {} } })}
            >
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Filters */}
        <IonCard>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <IonItem>
                    <IonLabel>Select Region:</IonLabel>
                    <IonSelect
                      value={selectedRegion}
                      onIonChange={(e) => setSelectedRegion(e.detail.value)}
                      interface="popover"
                    >
                      <IonSelectOption value="all">All Regions</IonSelectOption>
                      {regionsData.map((region) => (
                        <IonSelectOption key={region.name} value={region.name}>
                          {region.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonItem>
                    <IonLabel>Time Range:</IonLabel>
                    <IonSelect
                      value={timeRange}
                      onIonChange={(e) => setTimeRange(e.detail.value)}
                      interface="popover"
                    >
                      <IonSelectOption value="1month">
                        Last Month
                      </IonSelectOption>
                      <IonSelectOption value="3months">
                        Last 3 Months
                      </IonSelectOption>
                      <IonSelectOption value="6months">
                        Last 6 Months
                      </IonSelectOption>
                      <IonSelectOption value="1year">Last Year</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {isLoading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading healthcare data...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={peopleOutline} /> Total Patients
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <h2>{patients}</h2>
                      <p>+12% from last month</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={pulseOutline} /> Consultations
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <h2>165,750</h2>
                      <p>+8% from last month</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={businessOutline} /> Health Units
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <h2>834</h2>
                      <p>Across 10 regions</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard className="summary-card">
                    <IonCardHeader>
                      <IonCardTitle>
                        <IonIcon icon={locationOutline} /> Regional Coverage
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <h2>100%</h2>
                      <p>All regions covered</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Charts and Visualizations */}
            <IonGrid>
              <IonRow>
                {/* Regional Performance Chart */}
                <IonCol size="12" sizeLg="8">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Regional Performance</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={filteredRegionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="patients"
                              fill={COLORS[0]}
                              name="Patients"
                            />
                            <Bar
                              dataKey="consultations"
                              fill={COLORS[1]}
                              name="Consultations"
                            />
                            <Bar
                              dataKey="healthUnits"
                              fill={COLORS[2]}
                              name="Health Units"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* Service Distribution Pie Chart */}
                <IonCol size="12" sizeLg="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Service Distribution</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={serviceTypes}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={renderCustomizedLabel}
                              legendType="rect"
                            >
                              {serviceTypes.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              <IonRow>
                {/* Monthly Trends Line Chart */}
                <IonCol size="12" sizeLg="8">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Monthly Trends</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={monthlyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="consultations"
                              stroke={COLORS[0]}
                              name="Consultations"
                              activeDot={{ r: 8 }}
                            />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="emergencies"
                              stroke={COLORS[1]}
                              name="Emergencies"
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="revenue"
                              stroke={COLORS[2]}
                              name="Revenue (XAF)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* Patient Demographics */}
                <IonCol size="12" sizeLg="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Patient Demographics</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={patientDemographics}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                              dataKey="ageGroup"
                              type="category"
                              width={80}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="count"
                              fill={COLORS[3]}
                              name="Patients by Age Group"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>

              {/* Regional Health Units Map (simplified) */}
              <IonRow>
                <IonCol size="12">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        Health Units Distribution by Region
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div className="region-distribution">
                        {regionsData.map((region) => (
                          <div key={region.name} className="region-item">
                            <IonChip color="primary">
                              {region.name}: {region.healthUnits} units
                            </IonChip>
                            <div className="distribution-bar">
                              <div
                                className="distribution-fill"
                                style={{
                                  width: `${(region.healthUnits / 145) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
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
