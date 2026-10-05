/**
 * useAppointmentBooking.ts
 *
 * Custom hook for appointment booking logic
 * Extracted from Book_Appointment.tsx for better code organization
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
} from "firebase/firestore";
import { sendPushNotification } from "../utils/pushNotification";
import { MomoTransaction } from "../components/Services/momoPaymentService";
import { errorHandler, ErrorType, ErrorSeverity } from "../utils/errorHandler";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  consultationFee: number;
  availability: string[];
  rating: number;
  experience: string;
  location: string;
  image?: string;
}

export interface AppointmentData {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  consultationFee: number;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: any;
  triageData?: any;
  bookingFor?: "self" | "someoneElse";
  recipientName?: string;
  recipientAge?: string;
  recipientGender?: string;
}

export const useAppointmentBooking = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  // Fetch available doctors
  const fetchDoctors = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const doctorsQuery = query(
        collection(db, "doctors"),
        where("isEnabled", "==", true),
        where("isVerified", "==", true)
      );
      
      const snapshot = await getDocs(doctorsQuery);
      const doctorsList: Doctor[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        doctorsList.push({
          id: doc.id,
          name: data.name || "",
          specialty: data.specialty || "",
          consultationFee: data.consultationFee || 5000,
          availability: data.availability || [],
          rating: data.rating || 0,
          experience: data.experience || "",
          location: data.location || "",
          image: data.image || "",
        });
      });
      
      setDoctors(doctorsList);
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to fetch doctors",
        ErrorSeverity.MEDIUM,
        { action: "fetchDoctors" }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "fetchDoctors" });
      setError("Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Book appointment
  const bookAppointment = useCallback(async (
    appointmentData: Omit<AppointmentData, "status" | "paymentStatus" | "createdAt">,
    momoTransaction?: MomoTransaction
  ): Promise<string> => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      const appointment: AppointmentData = {
        ...appointmentData,
        status: "pending",
        paymentStatus: momoTransaction ? "paid" : "pending",
        paymentMethod: momoTransaction?.paymentMethod,
        paymentReference: momoTransaction?.reference,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "appointments"), appointment);
      
      // Send notification to doctor
      await sendPushNotification({
        recipientId: appointmentData.doctorId,
        title: "New Appointment Request",
        body: `${appointmentData.patientName} has requested an appointment with you.`,
        data: {
          type: "new_appointment",
          appointmentId: docRef.id,
          patientId: appointmentData.patientId,
        },
      });

      return docRef.id;
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to book appointment",
        ErrorSeverity.HIGH,
        { action: "bookAppointment", appointmentData }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "bookAppointment" });
      setError("Failed to book appointment. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Cancel appointment
  const cancelAppointment = useCallback(async (appointmentId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "cancelled",
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to cancel appointment",
        ErrorSeverity.MEDIUM,
        { action: "cancelAppointment", appointmentId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "cancelAppointment" });
      setError("Failed to cancel appointment. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get user's appointments
  const getUserAppointments = useCallback(async (): Promise<any[]> => {
    if (!currentUser) return [];

    setLoading(true);
    setError(null);

    try {
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("patientId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(appointmentsQuery);
      const appointments: any[] = [];

      snapshot.forEach((doc) => {
        appointments.push({ id: doc.id, ...doc.data() });
      });

      return appointments;
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to fetch appointments",
        ErrorSeverity.MEDIUM,
        { action: "getUserAppointments" }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "getUserAppointments" });
      setError("Failed to load appointments. Please try again.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    selectedDoctor,
    setSelectedDoctor,
    loading,
    error,
    bookAppointment,
    cancelAppointment,
    getUserAppointments,
    fetchDoctors,
  };
};