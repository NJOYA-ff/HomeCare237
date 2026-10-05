/**
 * useMedicalRecords.ts
 *
 * Custom hook for medical records management
 * Handles patient data, diagnoses, medications, and vitals
 */

import { useState, useCallback, useEffect } from "react";
import { db, auth } from "../firebaseconfig";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { errorHandler, ErrorType, ErrorSeverity } from "../utils/errorHandler";

export interface Diagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  description: string;
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  prescribedMedications: string[];
  followUpDate?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  active: boolean;
  notes?: string;
}

export interface Vitals {
  id: string;
  patientId: string;
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  glucose?: number;
  recordedAt: any;
  recordedBy?: string;
}

export const useMedicalRecords = (patientId?: string) => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.currentUser;
  const targetPatientId = patientId || currentUser?.uid;

  // Fetch diagnoses
  const fetchDiagnoses = useCallback(async () => {
    if (!targetPatientId) return;

    setLoading(true);
    setError(null);

    try {
      const diagnosesQuery = query(
        collection(db, "diagnoses"),
        where("patientId", "==", targetPatientId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(diagnosesQuery);
      const diagnosesList: Diagnosis[] = [];

      snapshot.forEach((doc) => {
        diagnosesList.push({ id: doc.id, ...doc.data() } as Diagnosis);
      });

      setDiagnoses(diagnosesList);
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to fetch diagnoses",
        ErrorSeverity.MEDIUM,
        { action: "fetchDiagnoses", patientId: targetPatientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "fetchDiagnoses" });
      setError("Failed to load diagnoses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [targetPatientId, currentUser]);

  // Add diagnosis
  const addDiagnosis = useCallback(async (
    diagnosisData: Omit<Diagnosis, "id" | "createdAt" | "patientId">
  ): Promise<string> => {
    if (!currentUser || !targetPatientId) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, "diagnoses"), {
        ...diagnosisData,
        patientId: targetPatientId,
        createdAt: Timestamp.now(),
      });
      await fetchDiagnoses();
      return docRef.id;
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to add diagnosis",
        ErrorSeverity.HIGH,
        { action: "addDiagnosis", patientId: targetPatientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "addDiagnosis" });
      setError("Failed to add diagnosis. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, targetPatientId, fetchDiagnoses]);

  // Fetch medications
  const fetchMedications = useCallback(async () => {
    if (!targetPatientId) return;

    setLoading(true);
    setError(null);

    try {
      const medicationsQuery = query(
        collection(db, "medications"),
        where("patientId", "==", targetPatientId),
        where("active", "==", true),
        orderBy("startDate", "desc")
      );

      const snapshot = await getDocs(medicationsQuery);
      const medicationsList: Medication[] = [];

      snapshot.forEach((doc) => {
        medicationsList.push({ id: doc.id, ...doc.data() } as Medication);
      });

      setMedications(medicationsList);
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to fetch medications",
        ErrorSeverity.MEDIUM,
        { action: "fetchMedications", patientId: targetPatientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "fetchMedications" });
      setError("Failed to load medications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [targetPatientId, currentUser]);

  // Add medication
  const addMedication = useCallback(async (
    medicationData: Omit<Medication, "id" | "patientId">
  ): Promise<string> => {
    if (!currentUser || !targetPatientId) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, "medications"), {
        ...medicationData,
        patientId: targetPatientId,
      });
      await fetchMedications();
      return docRef.id;
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to add medication",
        ErrorSeverity.HIGH,
        { action: "addMedication", patientId: targetPatientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "addMedication" });
      setError("Failed to add medication. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, targetPatientId, fetchMedications]);

  // Fetch vitals
  const fetchVitals = useCallback(async () => {
    if (!targetPatientId) return;

    setLoading(true);
    setError(null);

    try {
      const vitalsQuery = query(
        collection(db, "vitals"),
        where("patientId", "==", targetPatientId),
        orderBy("recordedAt", "desc")
      );

      const snapshot = await getDocs(vitalsQuery);
      const vitalsList: Vitals[] = [];

      snapshot.forEach((doc) => {
        vitalsList.push({ id: doc.id, ...doc.data() } as Vitals);
      });

      // Filter to last 30 days client-side
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const filteredVitals = vitalsList.filter(vital => {
        const vitalDate = vital.recordedAt?.toDate ? vital.recordedAt.toDate() : new Date(vital.recordedAt);
        return vitalDate > thirtyDaysAgo;
      });

      setVitals(filteredVitals);
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to fetch vitals",
        ErrorSeverity.MEDIUM,
        { action: "fetchVitals", patientId: targetPatientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "fetchVitals" });
      setError("Failed to load vitals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [targetPatientId, currentUser]);

  // Record vitals
  const recordVitals = useCallback(async (
    vitalsData: Omit<Vitals, "id" | "patientId" | "recordedAt">
  ): Promise<string> => {
    if (!currentUser || !targetPatientId) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, "vitals"), {
        ...vitalsData,
        patientId: targetPatientId,
        recordedAt: Timestamp.now(),
        recordedBy: currentUser.uid,
      });
      await fetchVitals();
      return docRef.id;
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to record vitals",
        ErrorSeverity.HIGH,
        { action: "recordVitals", patientId: targetPatientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "recordVitals" });
      setError("Failed to record vitals. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, targetPatientId, fetchVitals]);

  // Delete diagnosis
  const deleteDiagnosis = useCallback(async (diagnosisId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(db, "diagnoses", diagnosisId));
      await fetchDiagnoses();
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to delete diagnosis",
        ErrorSeverity.MEDIUM,
        { action: "deleteDiagnosis", diagnosisId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "deleteDiagnosis" });
      setError("Failed to delete diagnosis. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchDiagnoses]);

  // Load all data on mount
  useEffect(() => {
    if (targetPatientId) {
      fetchDiagnoses();
      fetchMedications();
      fetchVitals();
    }
  }, [targetPatientId, fetchDiagnoses, fetchMedications, fetchVitals]);

  return {
    diagnoses,
    medications,
    vitals,
    loading,
    error,
    addDiagnosis,
    addMedication,
    recordVitals,
    deleteDiagnosis,
    fetchDiagnoses,
    fetchMedications,
    fetchVitals,
  };
};