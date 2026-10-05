import LoadingHelix from "../../components/LoadingHelix";
import { EmptyState, ErrorState, SkeletonCard, SkeletonGroup } from "../../components/ui";
import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonButton,
  IonIcon,
  IonChip,
  IonText,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { motion } from "framer-motion";
import {
  pulseOutline,
  trashOutline,
  addOutline,
  timeOutline,
  checkmarkCircleOutline,
  warningOutline,
  alertCircleOutline,
} from "ionicons/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  VITAL_TYPES,
  VitalTypeConfig,
  classifyVital,
  buildHealthMetric,
  getVitalType,
  toDate,
} from "../../components/Services/patientVitals";
import "./Vitals.scss";

interface Metric {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: string;
  source?: string;
  notes?: string;
  timestamp: any;
}

const STATUS_META: Record<string, { chip: string; icon: any }> = {
  normal: { chip: "success", icon: checkmarkCircleOutline },
  warning: { chip: "warning", icon: warningOutline },
  critical: { chip: "danger", icon: alertCircleOutline },
  info: { chip: "primary", icon: timeOutline },
};

const Vitals: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  /** Set when the Firestore subscription fails, so the page can offer a retry. */
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bumped by the error state's "Try again" action to re-open the subscription. */
  const [reloadKey, setReloadKey] = useState(0);
  const [segment, setSegment] = useState<"log" | "history">("log");

  // Log form state
  const [selectedType, setSelectedType] = useState(VITAL_TYPES[0].key);
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [chartType, setChartType] = useState(VITAL_TYPES[1].key);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const q = query(
      collection(db, "healthMetrics"),
      where("patientId", "==", uid),
      orderBy("timestamp", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Metric[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data && data.name && data.value !== undefined) {
            list.push({ id: d.id, ...data } as Metric);
          }
        });
        setMetrics(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading vitals:", err);
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : "Lost connection while loading your readings.",
        );
        setLoading(false);
      },
    );
    return unsub;
  }, [uid, reloadKey]);

  const cfg = getVitalType(selectedType);

  const numeric1 = parseFloat(value1.replace(",", "."));
  const numeric2 = parseFloat(value2.replace(",", "."));
  const classification = useMemo(() => {
    if (value1 === "") return null;
    if (cfg.fields && cfg.fields.length > 1) {
      if (isNaN(numeric1) || isNaN(numeric2)) return null;
      // Blood pressure: classify using systolic
      return classifyVital(cfg, numeric1);
    }
    if (isNaN(numeric1)) return null;
    if (cfg.key === "Weight") return "info";
    return classifyVital(cfg, numeric1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value1, value2, cfg]);

  const handleSave = async () => {
    if (!uid) return;
    if (value1 === "") {
      setAlertMessage("Please enter a value before saving.");
      setShowAlert(true);
      return;
    }
    setSaving(true);
    try {
      let displayValue: string;
      if (cfg.fields && cfg.fields.length > 1) {
        if (isNaN(numeric1) || isNaN(numeric2)) {
          setAlertMessage(
            "Please enter both systolic and diastolic values (e.g. 120 / 80).",
          );
          setShowAlert(true);
          setSaving(false);
          return;
        }
        displayValue = `${Math.round(numeric1)}/${Math.round(numeric2)}`;
      } else {
        if (isNaN(numeric1)) {
          setAlertMessage(`Please enter a valid number for ${cfg.label}.`);
          setShowAlert(true);
          setSaving(false);
          return;
        }
        displayValue = String(numeric1);
      }

      const status = classification || "info";
      await addDoc(
        collection(db, "healthMetrics"),
        buildHealthMetric({
          patientId: uid,
          name: cfg.label,
          value: displayValue,
          unit: cfg.unit,
          status,
          source: "patient",
          notes,
        }),
      );

      setValue1("");
      setValue2("");
      setNotes("");
      setSegment("history");
    } catch (err) {
      console.error("Error saving vital:", err);
      setAlertMessage("Failed to save your reading. Please try again.");
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "healthMetrics", id));
    } catch (err) {
      console.error("Error deleting vital:", err);
      setAlertMessage("Could not delete this reading.");
      setShowAlert(true);
    }
  };

  // ── Chart data (per type, oldest → newest, last 30) ─────────────────────
  const chartData = useMemo(() => {
    const cfgForChart = getVitalByLabelCfg(chartType);
    const rows = metrics
      .filter((m) => m.name === cfgForChart.label || m.name === cfgForChart.key)
      .slice()
      .sort(
        (a, b) =>
          (toDate(a.timestamp)?.getTime() || 0) -
          (toDate(b.timestamp)?.getTime() || 0),
      )
      .slice(-30);

    return rows.map((m, idx) => {
      const firstNum = parseFloat(String(m.value).split("/")[0]);
      return {
        index: idx + 1,
        label: toDate(m.timestamp)
          ? toDate(m.timestamp)!.toLocaleDateString([], {
              day: "2-digit",
              month: "short",
            })
          : "",
        value: isNaN(firstNum) ? 0 : firstNum,
      };
    });
  }, [metrics, chartType]);

  const historyForType = useMemo(() => {
    const cfgForChart = getVitalByLabelCfg(chartType);
    return metrics
      .filter((m) => m.name === cfgForChart.label || m.name === cfgForChart.key)
      .slice(0, 15);
  }, [metrics, chartType]);

  const selectTypeCfg = (key: string) => {
    setSelectedType(key);
    setValue1("");
    setValue2("");
    setNotes("");
  };

  // Loading and error states reuse the real toolbar so the header never jumps
  // when the content swaps in, and both are skeletons/states rather than a
  // full-page spinner.
  if (loading && metrics.length === 0) {
    return (
      <IonPage className="vitals-page">
        <IonHeader class="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/patient/dashboard" />
            </IonButtons>
            <IonTitle>Vitals & Health Tracking</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="vitals-log-shell">
            <SkeletonGroup label="Loading your vitals">
              <SkeletonCard metric />
              <SkeletonCard lines={2} />
              <SkeletonCard lines={4} />
            </SkeletonGroup>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (loadError && metrics.length === 0) {
    return (
      <IonPage className="vitals-page">
        <IonHeader class="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/patient/dashboard" />
            </IonButtons>
            <IonTitle>Vitals & Health Tracking</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="vitals-log-shell">
            <ErrorState
              title="We couldn't load your vitals"
              description="Your readings are safe. Check your connection and try again."
              detail={loadError}
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="vitals-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Vitals & Health Tracking</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            setTimeout(() => e.detail.complete(), 600);
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <IonSegment
          className="vitals-segment"
          color="primary"
          value={segment}
          onIonChange={(e) => setSegment(e.detail.value as any)}
        >
          <IonSegmentButton value="log">Log Reading</IonSegmentButton>
          <IonSegmentButton value="history">History & Charts</IonSegmentButton>
        </IonSegment>

        {segment === "log" && (
          <div className="vitals-log-shell">
            <IonCard className="vitals-form-card">
              <IonCardContent>
                <IonItem lines="none" className="vitals-type-item">
                  <IonLabel position="stacked">What are you measuring?</IonLabel>
                  <IonSelect
                    value={selectedType}
                    onIonChange={(e) => selectTypeCfg(e.detail.value)}
                  >
                    {VITAL_TYPES.map((vt) => (
                      <IonSelectOption key={vt.key} value={vt.key}>
                        {vt.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                {cfg.fields && cfg.fields.length > 1 ? (
                  <div className="bp-input-row">
                    <IonItem className="form-item" lines="none">
                      <IonLabel position="stacked">
                        {cfg.fields[0].label}
                      </IonLabel>
                      <IonInput
                        type="number"
                        value={value1}
                        onIonInput={(e) => setValue1(e.detail.value || "")}
                        placeholder="120"
                      />
                    </IonItem>
                    <span className="bp-slash">/</span>
                    <IonItem className="form-item" lines="none">
                      <IonLabel position="stacked">
                        {cfg.fields[1].label}
                      </IonLabel>
                      <IonInput
                        type="number"
                        value={value2}
                        onIonInput={(e) => setValue2(e.detail.value || "")}
                        placeholder="80"
                      />
                    </IonItem>
                  </div>
                ) : (
                  <IonItem className="form-item" lines="none">
                    <IonLabel position="stacked">{cfg.label}</IonLabel>
                    <IonInput
                      type="number"
                      step={String(cfg.step)}
                      min={String(cfg.min)}
                      max={String(cfg.max)}
                      value={value1}
                      onIonInput={(e) => setValue1(e.detail.value || "")}
                      placeholder={cfg.placeholder}
                    />
                    <IonText slot="end" className="unit-text">
                      {cfg.unit}
                    </IonText>
                  </IonItem>
                )}

                <IonItem className="form-item" lines="none">
                  <IonLabel position="stacked">Notes (optional)</IonLabel>
                  <IonTextarea
                    rows={2}
                    value={notes}
                    onIonInput={(e) => setNotes(e.detail.value || "")}
                    placeholder="Feeling, time of day, before/after meal…"
                  />
                </IonItem>

                {classification && (
                  <div className={`classify-banner class-${classification}`}>
                    <IonIcon icon={STATUS_META[classification].icon} />
                    <IonText>
                      {classification === "normal" &&
                        "This reading is within the normal range."}
                      {classification === "warning" &&
                        "This reading is outside the normal range. Keep monitoring and consult if it persists."}
                      {classification === "critical" &&
                        "This reading requires attention. Contact a health professional as soon as possible."}
                      {classification === "info" &&
                        "Weight logged — no upper health limit applies."}
                    </IonText>
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            <IonButton
              expand="block"
              className="vitals-save-btn"
              onClick={handleSave}
              disabled={saving || value1 === ""}
            >
              {saving ? (
                <LoadingHelix color="white" size={18} />
              ) : (
                <>
                  <IonIcon slot="start" icon={addOutline} />
                  Save Reading
                </>
              )}
            </IonButton>
          </div>
        )}

        {segment === "history" && (
          <div className="vitals-history-shell">
            <IonItem lines="none" className="vitals-type-item">
              <IonLabel>Show trends for</IonLabel>
              <IonSelect
                value={chartType}
                onIonChange={(e) => setChartType(e.detail.value)}
              >
                {VITAL_TYPES.map((vt) => (
                  <IonSelectOption key={vt.key} value={vt.key}>
                    {vt.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonCard className="chart-card">
              <IonCardContent>
                <div className="chart-section-head">
                  <h3>
                    <IonIcon icon={pulseOutline} />{" "}
                    {getVitalByLabelCfg(chartType).label} — last{" "}
                    {chartData.length} readings
                  </h3>
                </div>
                {chartData.length > 1 ? (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" />
                        <XAxis dataKey="label" fontSize={10} tickMargin={6} />
                        <YAxis
                          fontSize={10}
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => String(v)}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={getVitalByLabelCfg(chartType).unit}
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={pulseOutline}
                    title="Not enough readings yet"
                    description="Log at least two readings to see how this trend is moving."
                    actionLabel="Log a reading"
                    onAction={() => setSegment("log")}
                  />
                )}
              </IonCardContent>
            </IonCard>

            <IonCard className="recent-card">
              <IonCardContent>
                <div className="chart-section-head">
                  <h3>Recent {getVitalByLabelCfg(chartType).label} readings</h3>
                </div>
                {historyForType.length === 0 ? (
                  <EmptyState
                    icon={timeOutline}
                    title="No readings yet"
                    description={`Nothing recorded for ${getVitalByLabelCfg(chartType).label} so far.`}
                    actionLabel="Log a reading"
                    onAction={() => setSegment("log")}
                  />
                ) : (
                  historyForType.map((m) => {
                    const meta = STATUS_META[m.status] || STATUS_META.info;
                    return (
                      <div className="vital-row" key={m.id}>
                        <div className="vital-row-main">
                          <p className="vital-row-value">
                            {m.value} {m.unit}
                          </p>
                          <p className="vital-row-meta">
                            {toDate(m.timestamp)?.toLocaleString([], {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {m.notes && (
                            <p className="vital-row-notes">{m.notes}</p>
                          )}
                        </div>
                        <IonChip color={meta.chip} outline>
                          <IonIcon icon={meta.icon} />
                          <IonLabel>{m.status}</IonLabel>
                        </IonChip>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="medium"
                          onClick={() => handleDelete(m.id)}
                          aria-label="Delete reading"
                        >
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      </div>
                    );
                  })
                )}
              </IonCardContent>
            </IonCard>
          </div>
        )}

                <MessageBox
          isOpen={showAlert}
          title="Vitals"
          message={alertMessage}
          tone="danger"
          actions={[
            {
              label: "OK",
              color: "primary",
              onClick: () => setShowAlert(false),
            },
          ]}
          onDismiss={() => setShowAlert(false)}
        />
      </IonContent>
    </IonPage>
  );
};

/** Resolve a chart vital config from either the key or label of the stored metric. */
const getVitalByLabelCfg = (chartType: string): VitalTypeConfig => {
  const byKey = VITAL_TYPES.find((v) => v.key === chartType);
  if (byKey) return byKey;
  return VITAL_TYPES.find((v) => v.label === chartType) || VITAL_TYPES[0];
};

export default Vitals;