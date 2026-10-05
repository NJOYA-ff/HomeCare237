/**
 * patientClinicalService.ts
 *
 * Doctor-side read helpers for the **Patient Clinical Snapshot** shown in the
 * doctor's Patients page. Lets a doctor review, for one patient:
 *  - the latest self-recorded vitals (Firestore `healthMetrics` collection,
 *    same documents the patient Vitals page writes)
 *  - the patient's medication tracker entries (`patients/{uid}/medications`)
 *  - the prescriptions embedded in the patient's diagnosis documents
 *    (`diagnoses` collection) — flattened with the shared
 *    `prescriptionsToMedications` helper so both sides agree on the shape.
 *
 * All helpers are read-only and never throw — they resolve to empty arrays on
 * permission errors so the UI can degrade gracefully.
 */
import { db } from "../../firebaseconfig";
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  prescriptionsToMedications,
  type Medication,
} from "./medicationService";
import { toDate, type VitalStatus } from "./patientVitals";

export interface PatientVitalReading {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: VitalStatus;
  source: string;
  notes: string;
  date: Date | null;
}

export type PatientMedication = Medication;

export interface PatientPrescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string;
  status: string;
  date: string;
  doctorName: string;
  diagnosisId: string;
}

/** Latest self-recorded vitals for a patient (newest first). */
export const fetchPatientVitals = async (
  patientId: string,
  maxReadings = 20,
): Promise<PatientVitalReading[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, "healthMetrics"),
        where("patientId", "==", patientId),
        orderBy("timestamp", "desc"),
        fsLimit(maxReadings),
      ),
    );
    const readings: PatientVitalReading[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data || !data.name || data.value === undefined) return;
      readings.push({
        id: d.id,
        name: String(data.name),
        value: String(data.value),
        unit: String(data.unit || ""),
        status: (data.status || "info") as VitalStatus,
        source: String(data.source || "patient"),
        notes: String(data.notes || ""),
        date: toDate(data.timestamp),
      });
    });
    return readings;
  } catch (err) {
    console.warn("[patientClinicalService] vitals load failed:", err);
    return [];
  }
};

/** Medications the patient tracks in "My Medicines" (active first). */
export const fetchPatientMedications = async (
  patientId: string,
): Promise<PatientMedication[]> => {
  try {
    const snap = await getDocs(
      collection(db, "patients", patientId, "medications"),
    );
    const meds: PatientMedication[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data || !data.name) return;
      meds.push({
        id: d.id,
        name: String(data.name),
        dosage: String(data.dosage || ""),
        frequency: String(data.frequency || ""),
        times: Array.isArray(data.times) ? data.times : [],
        startDate: String(data.startDate || ""),
        endDate: data.endDate || undefined,
        notes: String(data.notes || ""),
        status: data.status === "active" ? "active" : data.status === "paused" ? "paused" : "completed",
        remindersEnabled: !!data.remindersEnabled,
        source: data.source === "prescription" ? "prescription" : "manual",
        diagnosisId: data.diagnosisId || undefined,
        prescribedBy: data.prescribedBy || undefined,
        doctorId: data.doctorId || undefined,
        refillRequested: !!data.refillRequested,
        createdAt: data.createdAt || null,
      });
    });
    // Active first, then by name for a stable list.
    meds.sort((a, b) => {
      if (a.status !== b.status) {
        const rank: Record<string, number> = { active: 0, paused: 1, completed: 2 };
        return (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
      }
      return a.name.localeCompare(b.name);
    });
    return meds;
  } catch (err) {
    console.warn("[patientClinicalService] medications load failed:", err);
    return [];
  }
};

/** Prescriptions embedded in the patient's diagnosis documents (newest first). */
export const fetchPatientPrescriptions = async (
  patientId: string,
): Promise<PatientPrescription[]> => {
  try {
    const snap = await getDocs(
      query(
        collection(db, "diagnoses"),
        where("patientId", "==", patientId),
        orderBy("date", "desc"),
      ),
    );
    const diagnoses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const flat = prescriptionsToMedications(diagnoses);
    const byId = new Map(snap.docs.map((d) => [d.id, d.data() as any]));
    return flat
      .filter((m) => m.diagnosisId && byId.has(m.diagnosisId))
      .map((m) => {
        const diag = byId.get(m.diagnosisId!) || {};
        const raw = (diag.prescriptions || []).find(
          (rx: any) => rx?.medication === m.name,
        );
        return {
          id: m.id,
          medication: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: String(raw?.instructions || m.notes || ""),
          status: String(raw?.status || m.status),
          date: String(diag.date || m.startDate || ""),
          doctorName: String(diag.doctor?.name || m.prescribedBy || ""),
          diagnosisId: m.diagnosisId!,
        };
      });
  } catch (err) {
    console.warn("[patientClinicalService] prescriptions load failed:", err);
    return [];
  }
};

/** Ionic chip color for a vital status value. */
export const vitalStatusColor = (status: string): string =>
  status === "normal"
    ? "success"
    : status === "warning"
      ? "warning"
      : status === "critical"
        ? "danger"
        : "medium";
