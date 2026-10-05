/**
 * patientVitals.ts
 *
 * Shared configuration + helpers for the patient **Vitals / Health Tracking**
 * feature. It centralises the vital types a patient can self-log, the accepted
 * range classification (normal / warning / critical) and the conversion into
 * the Firestore `healthMetrics` documents the dashboard already displays.
 */
import { Timestamp } from "firebase/firestore";

export type VitalStatus = "normal" | "warning" | "critical" | "info";

export interface VitalField {
  /** Identifier stored in the metric document (e.g. "systolic"). */
  key: string;
  label: string;
}

export interface VitalTypeConfig {
  /** Key used everywhere in code (also the default Firestore `name`). */
  key: string;
  label: string;
  unit: string;
  /** Ionic icon name shown in lists/charts. */
  icon: string;
  min: number;
  max: number;
  step: number;
  placeholder: string;
  /** Normal / warning boundaries. Values outside `warning` are critical. */
  normal: [number, number];
  warning: [number, number];
  /** Optional multi-field vitals (Blood Pressure = systolic/diastolic). */
  fields?: VitalField[];
}

export const VITAL_TYPES: VitalTypeConfig[] = [
  {
    key: "Blood Pressure",
    label: "Blood Pressure",
    unit: "mmHg",
    icon: "pulse",
    min: 40,
    max: 250,
    step: 1,
    placeholder: "120/80",
    normal: [90, 129],
    warning: [80, 139],
    fields: [
      { key: "systolic", label: "Systolic (top)" },
      { key: "diastolic", label: "Diastolic (bottom)" },
    ],
  },
  {
    key: "Heart Rate",
    label: "Heart Rate",
    unit: "bpm",
    icon: "heart",
    min: 20,
    max: 220,
    step: 1,
    placeholder: "72",
    normal: [60, 100],
    warning: [40, 120],
  },
  {
    key: "Temperature",
    label: "Temperature",
    unit: "°C",
    icon: "thermometer",
    min: 30,
    max: 45,
    step: 0.1,
    placeholder: "36.6",
    normal: [36.1, 37.4],
    warning: [35, 39],
  },
  {
    key: "Oxygen",
    label: "Oxygen Saturation",
    unit: "%",
    icon: "fitness",
    min: 50,
    max: 100,
    step: 1,
    placeholder: "98",
    normal: [95, 100],
    warning: [90, 99],
  },
  {
    key: "Glucose",
    label: "Blood Glucose",
    unit: "mmol/L",
    icon: "medical",
    min: 1,
    max: 30,
    step: 0.1,
    placeholder: "4.5",
    normal: [3.9, 5.6],
    warning: [3, 7.8],
  },
  {
    key: "Weight",
    label: "Weight",
    unit: "kg",
    icon: "scale",
    min: 20,
    max: 300,
    step: 0.5,
    placeholder: "70",
    normal: [30, 200],
    warning: [20, 250],
  },
];

export const getVitalType = (key: string): VitalTypeConfig =>
  VITAL_TYPES.find((v) => v.key === key) || VITAL_TYPES[0];

export const getVitalByLabel = (label: string): VitalTypeConfig =>
  VITAL_TYPES.find(
    (v) => v.label.toLowerCase() === label.toLowerCase(),
  ) || VITAL_TYPES[0];

/**
 * Classify a numeric value (or systolic BP reading) against WHO-inspired
 * ranges. Everything at or below `warning[0]` / at or above `warning[1]` is
 * considered critical; inside `normal` is normal; otherwise warning.
 */
export const classifyVital = (
  cfg: VitalTypeConfig,
  value: number,
): VitalStatus => {
  if (cfg.key === "Weight") return "info";
  if (value < cfg.normal[0] || value > cfg.normal[1]) {
    if (value < cfg.warning[0] || value > cfg.warning[1]) return "critical";
    return "warning";
  }
  return "normal";
};

/**
 * Build the object persisted in the `healthMetrics` collection — the exact
 * shape the patient dashboard already listens to & renders.
 */
export const buildHealthMetric = (params: {
  patientId: string;
  name: string;
  value: string;
  unit: string;
  status: VitalStatus;
  source?: string;
  notes?: string;
  timestamp?: Date;
}) => ({
  patientId: params.patientId,
  name: params.name,
  value: params.value,
  unit: params.unit,
  status: params.status,
  source: params.source || "patient",
  notes: params.notes || "",
  timestamp: params.timestamp ? Timestamp.fromDate(params.timestamp) : Timestamp.now(),
});

/** Utility: convert a Firestore Timestamp / Date / string/number to a Date. */
export const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};