import React, { useState, useEffect } from "react";
import { db, auth, storage } from "../../firebaseconfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonAvatar,
  IonBadge,
  IonSearchbar,
  IonChip,
  IonAlert,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonNote,
  IonAccordion,
  IonAccordionGroup,
  IonInput,
  IonFooter,
  IonTextarea,
  IonButtons,
  IonBackButton,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from "@ionic/react";
import {
  calendar,
  location,
  time,
  people,
  star,
  call,
  chatbubble,
  closeCircle,
  checkmarkCircle,
  medical,
  wallet,
  informationCircle,
  map,
  filter,
  search,
  navigate,
  timeOutline,
  cashOutline,
  personCircle,
  arrowBack,
  checkmark,
  createOutline,
  heartOutline,
  eyeOutline,
  bodyOutline,
  fitnessOutline,
  bandageOutline,
  person,
  shareOutline,
  documentTextOutline,
  clipboardOutline,
  downloadOutline,
  arrowUpOutline,
  arrowDownOutline,
} from "ionicons/icons";
import brainOutline from "@material-design-icons/svg/two-tone/healing.svg";
import "./Refer_patients.scss";
import { motion } from "framer-motion";

import {
  FaStethoscope,
  FaHeartbeat,
  FaChild,
  FaUserMd,
  FaVenus,
  FaBrain,
  FaTooth,
  FaEye,
  FaAmbulance,
  FaHospital,
  FaPills,
  FaSyringe,
  FaBone,
} from "react-icons/fa";

// Types
interface Doctor {
  id: string;
  name: string;
  specialization: string;
  avatar: string;
  rating: number;
  reviews: number;
  region: string;
  city: string;
  address: string;
  consultationFee: number;
  languages: string[];
  availableSlots: string[];
  isAvailable: boolean;
  experience: number;
  email?: string;
  phone?: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  emergencyContact?: string;
}

interface Referral {
  id: string;
  referringDoctorId: string;
  referringDoctorName: string;
  receivingDoctorId: string;
  receivingDoctorName: string;
  receivingDoctorSpecialization: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  referralDate: string;
  reason: string;
  clinicalNotes: string;
  urgency: "routine" | "urgent" | "emergency";
  status: "pending" | "accepted" | "rejected" | "completed";
  additionalInstructions: string;
  createdAt: any;
  updatedAt: any;
  receivingDoctor?: Doctor;
  patient?: Patient;
  referringDoctor?: Doctor;
}

// Regions of Cameroon
const cameroonRegions = [
  "Adamawa",
  "Centre",
  "East",
  "Far North",
  "Littoral",
  "North",
  "Northwest",
  "West",
  "South",
  "Southwest",
];

// Medical specialties
const medicalSpecialties = [
  "General Practitioner",
  "Cardiologist",
  "Pediatrician",
  "Dermatologist",
  "Gynecologist",
  "Orthopedic Surgeon",
  "Neurologist",
  "Psychiatrist",
  "Dentist",
  "Ophthalmologist",
  "ENT Specialist",
  "Urologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Oncologist",
  "Rheumatologist",
  "Pulmonologist",
  "Nephrologist",
  "Allergist",
  "Physiotherapist",
];

// Specialty icons mapping (react-icons)
const specialtyIcons: { [key: string]: React.ReactNode } = {
  "General Practitioner": <FaStethoscope />,
  Cardiologist: <FaHeartbeat />,
  Pediatrician: <FaChild />,
  Dermatologist: <FaUserMd />,
  Gynecologist: <FaVenus />,
  "Orthopedic Surgeon": <FaBone />,
  Neurologist: <FaBrain />,
  Psychiatrist: <FaBrain />,
  Dentist: <FaTooth />,
  Ophthalmologist: <FaEye />,
  "ENT Specialist": <FaHospital />,
  Urologist: <FaHospital />,
  Endocrinologist: <FaPills />,
  Gastroenterologist: <FaPills />,
  Oncologist: <FaHospital />,
  Rheumatologist: <FaBone />,
  Pulmonologist: <FaAmbulance />,
  Nephrologist: <FaHospital />,
  Allergist: <FaSyringe />,
  Physiotherapist: <FaStethoscope />,
};

// Urgency levels
const urgencyLevels = [
  { value: "routine", label: "Routine", color: "primary" },
  { value: "urgent", label: "Urgent", color: "warning" },
  { value: "emergency", label: "Emergency", color: "danger" },
];

const Refer_patient: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<
    "refer" | "sent" | "received"
  >("refer");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [referralDate, setReferralDate] = useState<string>(
    new Date().toISOString(),
  );
  const [reason, setReason] = useState<string>("");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">(
    "routine",
  );
  const [additionalInstructions, setAdditionalInstructions] =
    useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showCancelAlert, setShowCancelAlert] = useState<boolean>(false);
  const [referralToCancel, setReferralToCancel] = useState<string>("");
  const [showAcceptAlert, setShowAcceptAlert] = useState<boolean>(false);
  const [referralToAccept, setReferralToAccept] = useState<string>("");
  const [showRejectAlert, setShowRejectAlert] = useState<boolean>(false);
  const [referralToReject, setReferralToReject] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"list" | "detail" | "refer">("list");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(
    null,
  );
  const [unsubscribeSentReferrals, setUnsubscribeSentReferrals] = useState<
    (() => void) | null
  >(null);
  const [unsubscribeReceivedReferrals, setUnsubscribeReceivedReferrals] =
    useState<(() => void) | null>(null);
  const [referralStep, setReferralStep] = useState<
    "patient" | "doctor" | "review"
  >("patient");

  useEffect(() => {
    if (activeSegment !== "refer") {
      setReferralStep("patient");
      setSelectedPatient(null);
      setSelectedDoctor(null);
    }
  }, [activeSegment]);

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserReferrals(user.uid);
        loadPatients(user.uid);
      } else {
        if (unsubscribeSentReferrals) {
          unsubscribeSentReferrals();
          setUnsubscribeSentReferrals(null);
        }
        if (unsubscribeReceivedReferrals) {
          unsubscribeReceivedReferrals();
          setUnsubscribeReceivedReferrals(null);
        }
        setSentReferrals([]);
        setReceivedReferrals([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Clean up subscriptions on component unmount
  useEffect(() => {
    return () => {
      if (unsubscribeSentReferrals) {
        unsubscribeSentReferrals();
      }
      if (unsubscribeReceivedReferrals) {
        unsubscribeReceivedReferrals();
      }
    };
  }, [unsubscribeSentReferrals, unsubscribeReceivedReferrals]);

  // Load doctors from Firebase with deduplication
  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      const doctorsCollection = collection(db, "doctors");
      const doctorSnapshot = await getDocs(doctorsCollection);
      const doctorsList: Doctor[] = [];

      // Use a Set to track unique doctor IDs
      const uniqueDoctorIds = new Set<string>();

      doctorSnapshot.forEach((doc) => {
        if (uniqueDoctorIds.has(doc.id)) {
          return; // Skip if already added
        }
        uniqueDoctorIds.add(doc.id);

        const doctorData = doc.data();
        doctorsList.push({
          id: doc.id,
          name: doctorData.name || "Unknown Doctor",
          specialization: doctorData.specialization || "General Practitioner",
          avatar:
            doctorData.avatar ||
            "https://ionicframework.com/docs/img/demos/avatar.svg",
          rating: doctorData.rating || 4.0,
          reviews: doctorData.reviews || 0,
          region: doctorData.region || "Centre",
          city: doctorData.city || "Unknown City",
          address: doctorData.address || "Unknown Address",
          consultationFee: doctorData.consultationFee || 5000,
          languages: doctorData.languages || ["English", "French"],
          availableSlots: doctorData.availableSlots || [
            "09:00",
            "10:00",
            "11:00",
            "14:00",
            "15:00",
            "16:00",
          ],
          isAvailable:
            doctorData.isAvailable !== undefined
              ? doctorData.isAvailable
              : true,
          experience: doctorData.experience || 5,
          email: doctorData.email,
          phone: doctorData.phone,
        } as Doctor);
      });

      setDoctors(doctorsList);
      setFilteredDoctors(doctorsList);
    } catch (error) {
      console.error("Error loading doctors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load patients who have booked an appointment with this doctor
  const loadPatients = async (doctorId?: string) => {
    try {
      const uid = doctorId || currentUser?.uid;
      if (!uid) return;

      const appointmentsSnap = await getDocs(
        query(collection(db, "appointments"), where("doctorId", "==", uid))
      );
      const patientIds = [...new Set(appointmentsSnap.docs.map((d) => d.data().patientId as string))];
      if (patientIds.length === 0) { setPatients([]); setFilteredPatients([]); return; }

      const patientsList: Patient[] = [];
      await Promise.all(
        patientIds.map(async (pid) => {
          const patientDoc = await getDoc(doc(db, "patients", pid));
          if (patientDoc.exists()) {
            const data = patientDoc.data();
            patientsList.push({
              id: patientDoc.id,
              name: data.name || "Unknown Patient",
              email: data.email || "",
              phone: data.phone,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              medicalHistory: data.medicalHistory,
              allergies: data.allergies,
              currentMedications: data.currentMedications,
              emergencyContact: data.emergencyContact,
            } as Patient);
          }
        })
      );
      setPatients(patientsList);
      setFilteredPatients(patientsList);
    } catch (error) {
      console.error("Error loading patients:", error);
    }
  };

  // Get doctor by ID with deduplication
  const getDoctorById = async (id: string): Promise<Doctor | undefined> => {
    const localDoctor = doctors.find((doctor) => doctor.id === id);
    if (localDoctor) {
      return localDoctor;
    }

    try {
      const doctorDoc = await getDoc(doc(db, "doctors", id));
      if (doctorDoc.exists()) {
        const doctorData = doctorDoc.data();
        const fetchedDoctor: Doctor = {
          id: doctorDoc.id,
          name: doctorData.name || "Unknown Doctor",
          specialization: doctorData.specialization || "General Practitioner",
          avatar:
            doctorData.avatar ||
            "https://ionicframework.com/docs/img/demos/avatar.svg",
          rating: doctorData.rating || 4.0,
          reviews: doctorData.reviews || 0,
          region: doctorData.region || "Centre",
          city: doctorData.city || "Unknown City",
          address: doctorData.address || "Unknown Address",
          consultationFee: doctorData.consultationFee || 5000,
          languages: doctorData.languages || ["English", "French"],
          availableSlots: doctorData.availableSlots || [
            "09:00",
            "10:00",
            "11:00",
            "14:00",
            "15:00",
            "16:00",
          ],
          isAvailable:
            doctorData.isAvailable !== undefined
              ? doctorData.isAvailable
              : true,
          experience: doctorData.experience || 5,
          email: doctorData.email,
          phone: doctorData.phone,
        };

        // Check if doctor already exists before adding
        setDoctors((prev) => {
          const exists = prev.some((doc) => doc.id === fetchedDoctor.id);
          if (exists) {
            return prev;
          }
          return [...prev, fetchedDoctor];
        });
        return fetchedDoctor;
      }
    } catch (error) {
      console.error("Error fetching doctor:", error);
    }

    return undefined;
  };

  // Get patient by ID with deduplication
  const getPatientById = async (id: string): Promise<Patient | undefined> => {
    const localPatient = patients.find((patient) => patient.id === id);
    if (localPatient) {
      return localPatient;
    }

    try {
      const patientDoc = await getDoc(doc(db, "patients", id));
      if (patientDoc.exists()) {
        const patientData = patientDoc.data();
        const fetchedPatient: Patient = {
          id: patientDoc.id,
          name: patientData.name || "Unknown Patient",
          email: patientData.email || "",
          phone: patientData.phone,
          dateOfBirth: patientData.dateOfBirth,
          gender: patientData.gender,
          medicalHistory: patientData.medicalHistory,
          allergies: patientData.allergies,
          currentMedications: patientData.currentMedications,
          emergencyContact: patientData.emergencyContact,
        };

        // Check if patient already exists before adding
        setPatients((prev) => {
          const exists = prev.some((pat) => pat.id === fetchedPatient.id);
          if (exists) {
            return prev;
          }
          return [...prev, fetchedPatient];
        });
        return fetchedPatient;
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
    }

    return undefined;
  };

  // Load user referrals from Firebase with real-time updates
  const loadUserReferrals = async (userId: string) => {
    try {
      // Clean up existing subscriptions
      if (unsubscribeSentReferrals) unsubscribeSentReferrals();
      if (unsubscribeReceivedReferrals) unsubscribeReceivedReferrals();

      // Query for sent referrals (where current user is referring doctor)
      const sentReferralsQuery = query(
        collection(db, "referrals"),
        where("referringDoctorId", "==", userId),
        orderBy("createdAt", "desc"),
      );

      // Query for received referrals (where current user is receiving doctor)
      const receivedReferralsQuery = query(
        collection(db, "referrals"),
        where("receivingDoctorId", "==", userId),
        orderBy("createdAt", "desc"),
      );

      // Set up real-time listener for sent referrals
      const sentUnsubscribe = onSnapshot(
        sentReferralsQuery,
        async (snapshot) => {
          const referralsList: Referral[] = [];
          const seenReferralIds = new Set<string>();

          for (const doc of snapshot.docs) {
            if (seenReferralIds.has(doc.id)) continue;
            seenReferralIds.add(doc.id);

            const data = doc.data();
            const referral: Referral = {
              id: doc.id,
              referringDoctorId: data.referringDoctorId,
              referringDoctorName: data.referringDoctorName || "Unknown Doctor",
              receivingDoctorId: data.receivingDoctorId,
              receivingDoctorName: data.receivingDoctorName || "Unknown Doctor",
              receivingDoctorSpecialization:
                data.receivingDoctorSpecialization || "General Practitioner",
              patientId: data.patientId,
              patientName: data.patientName || "Patient",
              patientEmail: data.patientEmail || "",
              referralDate: data.referralDate?.toDate
                ? data.referralDate.toDate().toISOString()
                : data.referralDate,
              reason: data.reason || "",
              clinicalNotes: data.clinicalNotes || "",
              urgency: data.urgency || "routine",
              status: data.status || "pending",
              additionalInstructions: data.additionalInstructions || "",
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            } as Referral;

            // Get receiving doctor data
            const doctor = await getDoctorById(data.receivingDoctorId);
            if (doctor) {
              referral.receivingDoctor = doctor;
            }

            // Get patient data
            const patient = await getPatientById(data.patientId);
            if (patient) {
              referral.patient = patient;
            }

            referralsList.push(referral);
          }

          console.log("Sent referrals loaded:", referralsList.length);
          setSentReferrals(referralsList);
        },
        (error) => {
          console.error("Error in sent referrals listener:", error);
        },
      );

      // Set up real-time listener for received referrals
      const receivedUnsubscribe = onSnapshot(
        receivedReferralsQuery,
        async (snapshot) => {
          const referralsList: Referral[] = [];
          const seenReferralIds = new Set<string>();

          for (const doc of snapshot.docs) {
            if (seenReferralIds.has(doc.id)) continue;
            seenReferralIds.add(doc.id);

            const data = doc.data();
            const referral: Referral = {
              id: doc.id,
              referringDoctorId: data.referringDoctorId,
              referringDoctorName: data.referringDoctorName || "Unknown Doctor",
              receivingDoctorId: data.receivingDoctorId,
              receivingDoctorName: data.receivingDoctorName || "Unknown Doctor",
              receivingDoctorSpecialization:
                data.receivingDoctorSpecialization || "General Practitioner",
              patientId: data.patientId,
              patientName: data.patientName || "Patient",
              patientEmail: data.patientEmail || "",
              referralDate: data.referralDate?.toDate
                ? data.referralDate.toDate().toISOString()
                : data.referralDate,
              reason: data.reason || "",
              clinicalNotes: data.clinicalNotes || "",
              urgency: data.urgency || "routine",
              status: data.status || "pending",
              additionalInstructions: data.additionalInstructions || "",
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            } as Referral;

            // Get referring doctor data
            const doctor = await getDoctorById(data.referringDoctorId);
            if (doctor) {
              referral.referringDoctor = doctor;
            }

            // Get patient data
            const patient = await getPatientById(data.patientId);
            if (patient) {
              referral.patient = patient;
            }

            referralsList.push(referral);
          }

          console.log("Received referrals loaded:", referralsList.length);
          setReceivedReferrals(referralsList);
        },
        (error) => {
          console.error("Error in received referrals listener:", error);
        },
      );

      setUnsubscribeSentReferrals(() => sentUnsubscribe);
      setUnsubscribeReceivedReferrals(() => receivedUnsubscribe);

      return () => {
        sentUnsubscribe();
        receivedUnsubscribe();
      };
    } catch (error) {
      console.error("Error loading referrals:", error);
      return null;
    }
  };

  // Handle referral submission
  const handleReferPatient = async () => {
    if (!selectedDoctor || !selectedPatient || !currentUser) {
      return;
    }

    setIsLoading(true);

    try {
      const newReferral = {
        referringDoctorId: currentUser.uid,
        referringDoctorName: currentUser.displayName || "Doctor",
        receivingDoctorId: selectedDoctor.id,
        receivingDoctorName: selectedDoctor.name,
        receivingDoctorSpecialization: selectedDoctor.specialization,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientEmail: selectedPatient.email,
        referralDate: Timestamp.fromDate(new Date(referralDate)),
        reason: reason,
        clinicalNotes: clinicalNotes,
        urgency: urgency,
        status: "pending" as const,
        additionalInstructions: additionalInstructions,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log("Creating referral:", newReferral);

      await addDoc(collection(db, "referrals"), newReferral);

      setShowConfirmation(true);
      resetSelection();
      setViewMode("list");
      setActiveSegment("sent");
    } catch (error) {
      console.error("Error creating referral:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReferral = (referralId: string) => {
    setReferralToCancel(referralId);
    setShowCancelAlert(true);
  };

  const handleAcceptReferral = (referralId: string) => {
    setReferralToAccept(referralId);
    setShowAcceptAlert(true);
  };

  const handleRejectReferral = (referralId: string) => {
    setReferralToReject(referralId);
    setShowRejectAlert(true);
  };

  const confirmCancelReferral = async () => {
    if (!referralToCancel) return;

    setIsLoading(true);

    try {
      const referralRef = doc(db, "referrals", referralToCancel);

      await updateDoc(referralRef, {
        status: "rejected",
        updatedAt: Timestamp.now(),
      });

      setShowCancelAlert(false);
    } catch (error) {
      console.error("Error cancelling referral:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAcceptReferral = async () => {
    if (!referralToAccept) return;

    setIsLoading(true);

    try {
      const referralRef = doc(db, "referrals", referralToAccept);

      await updateDoc(referralRef, {
        status: "accepted",
        updatedAt: Timestamp.now(),
      });

      setShowAcceptAlert(false);
    } catch (error) {
      console.error("Error accepting referral:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRejectReferral = async () => {
    if (!referralToReject) return;

    setIsLoading(true);

    try {
      const referralRef = doc(db, "referrals", referralToReject);

      await updateDoc(referralRef, {
        status: "rejected",
        updatedAt: Timestamp.now(),
      });

      setShowRejectAlert(false);
    } catch (error) {
      console.error("Error rejecting referral:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReferral = (referral: Referral) => {
    setSelectedReferral(referral);
    setViewMode("detail");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "accepted":
        return "success";
      case "rejected":
        return "danger";
      case "completed":
        return "primary";
      default:
        return "medium";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "routine":
        return "primary";
      case "urgent":
        return "warning";
      case "emergency":
        return "danger";
      default:
        return "medium";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Invalid Date";

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";

      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      return date.toLocaleDateString("en-US", options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const resetSelection = () => {
    setSelectedDoctor(null);
    setSelectedPatient(null);
    setReferralDate(new Date().toISOString());
    setReason("");
    setClinicalNotes("");
    setUrgency("routine");
    setAdditionalInstructions("");
    setSelectedReferral(null);
  };

  const getSpecialtyIcon = (specialty: string): React.ReactNode => {
    return specialtyIcons[specialty] || <IonIcon icon={medical} />;
  };

  // Initialize with some sample data if collections are empty
  const initializeSampleData = async () => {
    try {
      const patientsCollection = collection(db, "patients");
      const patientsSnapshot = await getDocs(patientsCollection);
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  };

  // Load doctors and initialize sample data on component mount
  useEffect(() => {
    loadDoctors();
    initializeSampleData();
  }, []);

  // Filter doctors based on region, specialty and search query with deduplication
  useEffect(() => {
    let result = doctors;

    if (selectedRegion) {
      result = result.filter((doctor) => doctor.region === selectedRegion);
    }

    if (selectedSpecialty) {
      result = result.filter(
        (doctor) => doctor.specialization === selectedSpecialty,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(query) ||
          doctor.specialization.toLowerCase().includes(query) ||
          doctor.city.toLowerCase().includes(query),
      );
    }

    // Remove duplicates by ID
    const uniqueDoctors = result.filter(
      (doctor, index, self) =>
        index === self.findIndex((d) => d.id === doctor.id),
    );

    setFilteredDoctors(uniqueDoctors);
  }, [selectedRegion, selectedSpecialty, searchQuery, doctors]);

  // Filter patients based on search query with deduplication
  useEffect(() => {
    let result = patients;

    if (patientSearchQuery) {
      const query = patientSearchQuery.toLowerCase();
      result = result.filter(
        (patient) =>
          patient.name.toLowerCase().includes(query) ||
          patient.email.toLowerCase().includes(query),
      );
    }

    // Remove duplicates by ID
    const uniquePatients = result.filter(
      (patient, index, self) =>
        index === self.findIndex((p) => p.id === patient.id),
    );

    setFilteredPatients(uniquePatients);
  }, [patientSearchQuery, patients]);

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle>Patient Referrals</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="referral-content">
        {isLoading && (
          <div className="loading-container">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="loading-spinner"
            />
            <IonText className="ion-text-center ion-padding">
              <p>Processing...</p>
            </IonText>
          </div>
        )}

        <IonAlert
          isOpen={showCancelAlert}
          onDidDismiss={() => setShowCancelAlert(false)}
          header={"Cancel Referral"}
          message={"Are you sure you want to cancel this referral?"}
          buttons={[
            {
              text: "No",
              role: "cancel",
              cssClass: "secondary",
            },
            {
              text: "Yes",
              handler: confirmCancelReferral,
            },
          ]}
        />

        <IonAlert
          isOpen={showAcceptAlert}
          onDidDismiss={() => setShowAcceptAlert(false)}
          header={"Accept Referral"}
          message={"Are you sure you want to accept this referral?"}
          buttons={[
            {
              text: "No",
              role: "cancel",
              cssClass: "secondary",
            },
            {
              text: "Yes",
              handler: confirmAcceptReferral,
            },
          ]}
        />

        <IonAlert
          isOpen={showRejectAlert}
          onDidDismiss={() => setShowRejectAlert(false)}
          header={"Reject Referral"}
          message={"Are you sure you want to reject this referral?"}
          buttons={[
            {
              text: "No",
              role: "cancel",
              cssClass: "secondary",
            },
            {
              text: "Yes",
              handler: confirmRejectReferral,
            },
          ]}
        />

        <IonAlert
          isOpen={showConfirmation}
          onDidDismiss={() => setShowConfirmation(false)}
          header={"Success!"}
          message={"Patient referral has been successfully sent."}
          buttons={["OK"]}
        />

        {!currentUser ? (
          <IonCard>
            <IonCardContent className="auth-required">
              <IonText color="medium">
                <h2>Please sign in to manage referrals</h2>
                <p>
                  You need to be signed in to view and create patient referrals.
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : viewMode === "list" ? (
          <>
            <IonSegment
              value={activeSegment}
              onIonChange={(e) => setActiveSegment(e.detail.value as any)}
            >
              <IonSegmentButton value="refer">
                <IonLabel>Refer Patient</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="sent">
                <IonLabel>
                  Sent ({sentReferrals.length})
                  <IonIcon
                    icon={arrowUpOutline}
                    style={{ marginLeft: "5px" }}
                  />
                </IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="received">
                <IonLabel>
                  Received ({receivedReferrals.length})
                  <IonIcon
                    icon={arrowDownOutline}
                    style={{ marginLeft: "5px" }}
                  />
                </IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {activeSegment === "refer" ? (
              <div className="referral-section">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Refer a Patient</IonCardTitle>
                    <IonCardSubtitle>
                      Refer your patient to another healthcare specialist
                    </IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {/* Patient Selection */}
                    {referralStep === "patient" && (
                      <div className="selection-section">
                        <h3>Select Patient</h3>
                        <IonSearchbar
                          value={patientSearchQuery}
                          onIonInput={(e) =>
                            setPatientSearchQuery(e.detail.value!)
                          }
                          placeholder="Search patients by name or email"
                          className="doctor-search"
                        />

                        <div className="patients-list-r">
                          {filteredPatients.map((patient) => (
                            <IonCard
                              key={patient.id}
                              className={`patient-card-r ${
                                selectedPatient?.id === patient.id
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedPatient(patient);
                                setReferralStep("doctor");
                              }}
                            >
                              <IonCardContent>
                                <div className="patient-header">
                                  <IonAvatar className="patient-avatar">
                                    <img
                                      src="https://ionicframework.com/docs/img/demos/avatar.svg"
                                      alt={patient.name}
                                    />
                                  </IonAvatar>
                                  <div className="patient-info-r">
                                    <IonText>
                                      <h3 className="patient-name">
                                        {patient.name}
                                      </h3>
                                    </IonText>
                                    <IonText color="medium">
                                      <p className="patient-email">
                                        {patient.email}
                                      </p>
                                      {patient.phone && (
                                        <p className="patient-phone">
                                          {patient.phone}
                                        </p>
                                      )}
                                    </IonText>
                                  </div>
                                  {selectedPatient?.id === patient.id && (
                                    <IonIcon
                                      icon={checkmarkCircle}
                                      color="success"
                                    />
                                  )}
                                </div>
                              </IonCardContent>
                            </IonCard>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Doctor Selection */}
                    {referralStep === "doctor" && (
                      <div className="selection-section">
                        <h3>Select Specialist</h3>
                        <div className="filters-container">
                          <IonItem className="filter-item">
                            <IonIcon icon={location} slot="start" />
                            <IonLabel>Region</IonLabel>
                            <IonSelect
                              value={selectedRegion}
                              placeholder="All Regions"
                              onIonChange={(e) =>
                                setSelectedRegion(e.detail.value)
                              }
                              interface="popover"
                            >
                              <IonSelectOption value="">
                                All Regions
                              </IonSelectOption>
                              {cameroonRegions.map((region) => (
                                <IonSelectOption key={region} value={region}>
                                  {region}
                                </IonSelectOption>
                              ))}
                            </IonSelect>
                          </IonItem>

                          <IonItem className="filter-item">
                            <IonIcon icon={medical} slot="start" />
                            <IonLabel>Specialty</IonLabel>
                            <IonSelect
                              value={selectedSpecialty}
                              placeholder="All Specialties"
                              onIonChange={(e) =>
                                setSelectedSpecialty(e.detail.value)
                              }
                              interface="popover"
                            >
                              <IonSelectOption value="">
                                All Specialties
                              </IonSelectOption>
                              {medicalSpecialties.map((specialty) => (
                                <IonSelectOption
                                  key={specialty}
                                  value={specialty}
                                >
                                  {specialty}
                                </IonSelectOption>
                              ))}
                            </IonSelect>
                          </IonItem>
                        </div>

                        <IonSearchbar
                          value={searchQuery}
                          onIonInput={(e) => setSearchQuery(e.detail.value!)}
                          placeholder="Search doctors by name, specialty, or city"
                          className="doctor-search"
                        />

                        <div className="doctors-list-r">
                          <h4 className="section-title">
                            Available Specialists ({filteredDoctors.length})
                          </h4>

                          {filteredDoctors.length === 0 ? (
                            <IonText color="medium" className="no-results">
                              <p>
                                No specialists found matching your criteria.
                              </p>
                              <IonButton
                                fill="clear"
                                onClick={() => {
                                  setSelectedRegion("");
                                  setSelectedSpecialty("");
                                  setSearchQuery("");
                                }}
                              >
                                Clear Filters
                              </IonButton>
                            </IonText>
                          ) : (
                            <div className="doctors-grid-r">
                              {filteredDoctors.map((doctor) => (
                                <IonCard
                                  key={doctor.id}
                                  className={`doctor-card-r ${
                                    selectedDoctor?.id === doctor.id
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setSelectedDoctor(doctor);
                                    setReferralStep("review");
                                  }}
                                >
                                  <IonCardContent>
                                    <div className="doctor-header-r">
                                      <IonAvatar className="doctor-avatar-r">
                                        <img
                                          src={doctor.avatar}
                                          alt={doctor.name}
                                        />
                                      </IonAvatar>
                                      <div className="doctor-info-r">
                                        <IonText>
                                          <h3 className="doctor-name-r">
                                            {doctor.name}
                                          </h3>
                                        </IonText>
                                        <IonText color="medium">
                                          <p className="doctor-specialty-r">
                                            {getSpecialtyIcon(
                                              doctor.specialization,
                                            )}
                                            {doctor.specialization}
                                          </p>
                                        </IonText>
                                      </div>
                                      {selectedDoctor?.id === doctor.id && (
                                        <IonIcon
                                          icon={checkmarkCircle}
                                          color="success"
                                        />
                                      )}
                                    </div>

                                    <div className="doctor-details-r">
                                      <div className="detail-item-r">
                                        <IonIcon icon={location} />
                                        <span>
                                          {doctor.city}, {doctor.region}
                                        </span>
                                      </div>
                                      <div className="detail-item-r">
                                        <IonIcon icon={star} color="warning" />
                                        <span>
                                          {doctor.rating} ({doctor.reviews}{" "}
                                          reviews)
                                        </span>
                                      </div>
                                      <div className="detail-item-r">
                                        <IonIcon
                                          icon={timeOutline}
                                          color="primary"
                                        />
                                        <span>
                                          {doctor.experience} years experience
                                        </span>
                                      </div>
                                    </div>
                                  </IonCardContent>
                                </IonCard>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Referral Details Button */}
                    {referralStep === "review" && (
                      <div className="referral-actions">
                        <IonButton
                          expand="block"
                          onClick={() => setViewMode("refer")}
                        >
                          <IonIcon icon={documentTextOutline} slot="start" />
                          Continue to Referral Details
                        </IonButton>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              </div>
            ) : activeSegment === "sent" ? (
              <div className="referrals-section">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Sent Referrals</IonCardTitle>
                    <IonCardSubtitle>
                      Referrals you have sent to other specialists
                    </IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {sentReferrals.length === 0 ? (
                      <IonText color="medium" className="no-referrals">
                        <p>You haven't sent any referrals yet.</p>
                        <IonButton onClick={() => setActiveSegment("refer")}>
                          Make Your First Referral
                        </IonButton>
                      </IonText>
                    ) : (
                      <div className="referrals-list">
                        {sentReferrals.map((referral) => (
                          <IonCard key={referral.id} className="referral-card">
                            <IonCardContent>
                              <div className="referral-header">
                                <IonAvatar className="doctor-avatar">
                                  <img
                                    src={
                                      referral.receivingDoctor?.avatar ||
                                      "https://ionicframework.com/docs/img/demos/avatar.svg"
                                    }
                                    alt={referral.receivingDoctorName}
                                  />
                                </IonAvatar>
                                <div className="referral-info">
                                  <IonText>
                                    <h3
                                      className="doctor-name-r"
                                      onClick={() =>
                                        handleViewReferral(referral)
                                      }
                                      style={{
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {referral.receivingDoctorName}
                                    </h3>
                                  </IonText>
                                  <IonText color="medium">
                                    <p className="doctor-specialty-r">
                                      {getSpecialtyIcon(
                                        referral.receivingDoctorSpecialization,
                                      )}
                                      {referral.receivingDoctorSpecialization}
                                    </p>
                                    <p className="referral-direction">
                                      <IonIcon icon={arrowUpOutline} /> Sent to
                                    </p>
                                  </IonText>
                                  <div className="referral-meta">
                                    <IonChip
                                      color={getStatusColor(referral.status)}
                                    >
                                      {getStatusText(referral.status)}
                                    </IonChip>
                                    <IonChip
                                      color={getUrgencyColor(referral.urgency)}
                                    >
                                      {referral.urgency
                                        .charAt(0)
                                        .toUpperCase() +
                                        referral.urgency.slice(1)}
                                    </IonChip>
                                  </div>
                                </div>
                              </div>

                              <div className="referral-details">
                                <div className="detail-item-r">
                                  <IonIcon icon={person} />
                                  <span>Patient: {referral.patientName}</span>
                                </div>
                                <div className="detail-item-r">
                                  <IonIcon icon={calendar} />
                                  <span>
                                    Referral Date:{" "}
                                    {formatDate(referral.referralDate)}
                                  </span>
                                </div>
                                <div className="detail-item-r">
                                  <IonIcon icon={informationCircle} />
                                  <span>Reason: {referral.reason}</span>
                                </div>
                              </div>

                              <div className="referral-actions">
                                <IonButton
                                  fill="outline"
                                  color="primary"
                                  size="small"
                                  onClick={() => handleViewReferral(referral)}
                                >
                                  <IonIcon icon={eyeOutline} slot="start" />
                                  View Details
                                </IonButton>

                                {referral.status === "pending" && (
                                  <IonButton
                                    fill="outline"
                                    color="danger"
                                    size="small"
                                    onClick={() =>
                                      handleCancelReferral(referral.id)
                                    }
                                  >
                                    <IonIcon icon={closeCircle} slot="start" />
                                    Cancel
                                  </IonButton>
                                )}
                              </div>
                            </IonCardContent>
                          </IonCard>
                        ))}
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              </div>
            ) : (
              <div className="referrals-section">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Received Referrals</IonCardTitle>
                    <IonCardSubtitle>
                      Referrals sent to you by other doctors
                    </IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {receivedReferrals.length === 0 ? (
                      <IonText color="medium" className="no-referrals">
                        <p>You haven't received any referrals yet.</p>
                      </IonText>
                    ) : (
                      <div className="referrals-list">
                        {receivedReferrals.map((referral) => (
                          <IonCard key={referral.id} className="referral-card">
                            <IonCardContent>
                              <div className="referral-header">
                                <IonAvatar className="doctor-avatar">
                                  <img
                                    src={
                                      referral.referringDoctor?.avatar ||
                                      "https://ionicframework.com/docs/img/demos/avatar.svg"
                                    }
                                    alt={referral.referringDoctorName}
                                  />
                                </IonAvatar>
                                <div className="referral-info">
                                  <IonText>
                                    <h3
                                      className="doctor-name-r"
                                      onClick={() =>
                                        handleViewReferral(referral)
                                      }
                                      style={{
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {referral.referringDoctorName}
                                    </h3>
                                  </IonText>
                                  <IonText color="medium">
                                    <p className="doctor-specialty-r">
                                      {getSpecialtyIcon(
                                        referral.receivingDoctorSpecialization,
                                      )}
                                      {referral.receivingDoctorSpecialization}
                                    </p>
                                    <p className="referral-direction">
                                      <IonIcon icon={arrowDownOutline} />{" "}
                                      Received from
                                    </p>
                                  </IonText>
                                  <div className="referral-meta">
                                    <IonChip
                                      color={getStatusColor(referral.status)}
                                    >
                                      {getStatusText(referral.status)}
                                    </IonChip>
                                    <IonChip
                                      color={getUrgencyColor(referral.urgency)}
                                    >
                                      {referral.urgency
                                        .charAt(0)
                                        .toUpperCase() +
                                        referral.urgency.slice(1)}
                                    </IonChip>
                                  </div>
                                </div>
                              </div>

                              <div className="referral-details">
                                <div className="detail-item-r">
                                  <IonIcon icon={person} />
                                  <span>Patient: {referral.patientName}</span>
                                </div>
                                <div className="detail-item-r">
                                  <IonIcon icon={calendar} />
                                  <span>
                                    Referral Date:{" "}
                                    {formatDate(referral.referralDate)}
                                  </span>
                                </div>
                                <div className="detail-item-r">
                                  <IonIcon icon={informationCircle} />
                                  <span>Reason: {referral.reason}</span>
                                </div>
                              </div>

                              <div className="referral-actions">
                                <IonButton
                                  fill="outline"
                                  color="primary"
                                  size="small"
                                  onClick={() => handleViewReferral(referral)}
                                >
                                  <IonIcon icon={eyeOutline} slot="start" />
                                  View Details
                                </IonButton>

                                {referral.status === "pending" && (
                                  <>
                                    <IonButton
                                      fill="outline"
                                      color="success"
                                      size="small"
                                      onClick={() =>
                                        handleAcceptReferral(referral.id)
                                      }
                                    >
                                      <IonIcon
                                        icon={checkmarkCircle}
                                        slot="start"
                                      />
                                      Accept
                                    </IonButton>
                                    <IonButton
                                      fill="outline"
                                      color="danger"
                                      size="small"
                                      onClick={() =>
                                        handleRejectReferral(referral.id)
                                      }
                                    >
                                      <IonIcon
                                        icon={closeCircle}
                                        slot="start"
                                      />
                                      Reject
                                    </IonButton>
                                  </>
                                )}
                              </div>
                            </IonCardContent>
                          </IonCard>
                        ))}
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              </div>
            )}
          </>
        ) : viewMode === "detail" && selectedReferral ? (
          <div className="referral-detail-section">
            <IonCard>
              <IonCardHeader>
                <div className="detail-header-r">
                  <IonButton
                    fill="clear"
                    onClick={() => {
                      setViewMode("list");
                      setSelectedReferral(null);
                    }}
                  >
                    <IonIcon icon={arrowBack} />
                    Back to Referrals
                  </IonButton>
                  <IonCardTitle>Referral Details</IonCardTitle>
                  <IonCardSubtitle>
                    Created on {formatDate(selectedReferral.referralDate)}
                  </IonCardSubtitle>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <div className="referral-detail-content">
                  {/* Show referring doctor for received referrals */}
                  {selectedReferral.receivingDoctorId === currentUser?.uid &&
                    selectedReferral.referringDoctor && (
                      <div className="detail-section-r">
                        <h3>Referring Doctor</h3>
                        <div className="doctor-info-detail-r">
                          <IonAvatar className="detail-avatar-r">
                            <img
                              src={
                                selectedReferral.referringDoctor.avatar ||
                                "https://ionicframework.com/docs/img/demos/avatar.svg"
                              }
                              alt={selectedReferral.referringDoctor.name}
                            />
                          </IonAvatar>
                          <div className="doctor-details-r">
                            <h4>{selectedReferral.referringDoctor.name}</h4>
                            <p>
                              {getSpecialtyIcon(
                                selectedReferral.receivingDoctorSpecialization,
                              )}
                              {selectedReferral.receivingDoctorSpecialization}
                            </p>
                            <p>
                              <IonIcon icon={location} />
                              {selectedReferral.referringDoctor.city},{" "}
                              {selectedReferral.referringDoctor.region}
                            </p>
                            <p>
                              <IonIcon icon={star} color="warning" />
                              {selectedReferral.referringDoctor.rating} (
                              {selectedReferral.referringDoctor.reviews}{" "}
                              reviews)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Show receiving doctor for sent referrals */}
                  {selectedReferral.referringDoctorId === currentUser?.uid &&
                    selectedReferral.receivingDoctor && (
                      <div className="detail-section-r">
                        <h3>Receiving Specialist</h3>
                        <div className="doctor-info-detail-r">
                          <IonAvatar className="detail-avatar-r">
                            <img
                              src={
                                selectedReferral.receivingDoctor.avatar ||
                                "https://ionicframework.com/docs/img/demos/avatar.svg"
                              }
                              alt={selectedReferral.receivingDoctor.name}
                            />
                          </IonAvatar>
                          <div className="doctor-details-r">
                            <h4>{selectedReferral.receivingDoctor.name}</h4>
                            <p>
                              {getSpecialtyIcon(
                                selectedReferral.receivingDoctor.specialization,
                              )}
                              {selectedReferral.receivingDoctor.specialization}
                            </p>
                            <p>
                              <IonIcon icon={location} />
                              {selectedReferral.receivingDoctor.city},{" "}
                              {selectedReferral.receivingDoctor.region}
                            </p>
                            <p>
                              <IonIcon icon={star} color="warning" />
                              {selectedReferral.receivingDoctor.rating} (
                              {selectedReferral.receivingDoctor.reviews}{" "}
                              reviews)
                            </p>
                            <p>
                              <IonIcon icon={timeOutline} color="primary" />
                              {selectedReferral.receivingDoctor.experience}{" "}
                              years experience
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="detail-section">
                    <h3>Patient Information</h3>
                    {selectedReferral.patient ? (
                      <IonGrid>
                        <IonRow>
                          <IonCol size="12" size-md="6">
                            <IonItem>
                              <IonLabel>
                                <strong>Name</strong>
                              </IonLabel>
                              <IonText>{selectedReferral.patient.name}</IonText>
                            </IonItem>
                          </IonCol>
                          <IonCol size="12" size-md="6">
                            <IonItem>
                              <IonLabel>
                                <strong>Email</strong>
                              </IonLabel>
                              <IonText>
                                {selectedReferral.patient.email}
                              </IonText>
                            </IonItem>
                          </IonCol>
                        </IonRow>
                        {selectedReferral.patient.phone && (
                          <IonRow>
                            <IonCol size="12" size-md="6">
                              <IonItem>
                                <IonLabel>
                                  <strong>Phone</strong>
                                </IonLabel>
                                <IonText>
                                  {selectedReferral.patient.phone}
                                </IonText>
                              </IonItem>
                            </IonCol>
                          </IonRow>
                        )}
                      </IonGrid>
                    ) : (
                      <IonText color="medium">
                        <p>Loading patient information...</p>
                      </IonText>
                    )}
                  </div>

                  <div className="detail-section">
                    <h3>Referral Information</h3>
                    <IonGrid>
                      <IonRow>
                        <IonCol size="12" size-md="6">
                          <IonItem>
                            <IonLabel>
                              <strong>Status</strong>
                            </IonLabel>
                            <IonBadge
                              color={getStatusColor(selectedReferral.status)}
                            >
                              {getStatusText(selectedReferral.status)}
                            </IonBadge>
                          </IonItem>
                        </IonCol>
                        <IonCol size="12" size-md="6">
                          <IonItem>
                            <IonLabel>
                              <strong>Urgency</strong>
                            </IonLabel>
                            <IonBadge
                              color={getUrgencyColor(selectedReferral.urgency)}
                            >
                              {selectedReferral.urgency
                                .charAt(0)
                                .toUpperCase() +
                                selectedReferral.urgency.slice(1)}
                            </IonBadge>
                          </IonItem>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol size="12">
                          <IonItem>
                            <IonLabel position="stacked">
                              Reason for Referral
                            </IonLabel>
                            <IonTextarea
                              value={selectedReferral.reason}
                              readonly
                              rows={3}
                            />
                          </IonItem>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol size="12">
                          <IonItem>
                            <IonLabel position="stacked">
                              Clinical Notes
                            </IonLabel>
                            <IonTextarea
                              value={selectedReferral.clinicalNotes}
                              readonly
                              rows={4}
                            />
                          </IonItem>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol size="12">
                          <IonItem>
                            <IonLabel position="stacked">
                              Additional Instructions
                            </IonLabel>
                            <IonTextarea
                              value={
                                selectedReferral.additionalInstructions ||
                                "No additional instructions"
                              }
                              readonly
                              rows={3}
                            />
                          </IonItem>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </div>

                  <div className="detail-actions">
                    {selectedReferral.referringDoctorId === currentUser?.uid &&
                      selectedReferral.status === "pending" && (
                        <IonButton
                          expand="block"
                          color="danger"
                          onClick={() =>
                            handleCancelReferral(selectedReferral.id)
                          }
                        >
                          <IonIcon icon={closeCircle} slot="start" />
                          Cancel Referral
                        </IonButton>
                      )}

                    {selectedReferral.receivingDoctorId === currentUser?.uid &&
                      selectedReferral.status === "pending" && (
                        <div className="received-actions">
                          <IonButton
                            expand="block"
                            color="success"
                            onClick={() =>
                              handleAcceptReferral(selectedReferral.id)
                            }
                          >
                            <IonIcon icon={checkmarkCircle} slot="start" />
                            Accept Referral
                          </IonButton>
                          <IonButton
                            expand="block"
                            color="danger"
                            onClick={() =>
                              handleRejectReferral(selectedReferral.id)
                            }
                          >
                            <IonIcon icon={closeCircle} slot="start" />
                            Reject Referral
                          </IonButton>
                        </div>
                      )}
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        ) : viewMode === "refer" && selectedDoctor && selectedPatient ? (
          <div className="referral-form-section">
            <IonCard>
              <IonCardHeader>
                <div className="detail-header-r">
                  <IonButton
                    fill="clear"
                    onClick={() => {
                      setViewMode("list");
                    }}
                  >
                    <IonIcon icon={arrowBack} />
                    Back to Selection
                  </IonButton>
                  <IonCardTitle>Create Referral</IonCardTitle>
                  <IonCardSubtitle>
                    Referring {selectedPatient.name} to {selectedDoctor.name}
                  </IonCardSubtitle>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <div className="referral-summary">
                  <div className="summary-item">
                    <strong>Patient:</strong> {selectedPatient.name}
                  </div>
                  <div className="summary-item">
                    <strong>Specialist:</strong> {selectedDoctor.name} (
                    {selectedDoctor.specialization})
                  </div>
                  <div className="summary-item">
                    <strong>Location:</strong> {selectedDoctor.city},{" "}
                    {selectedDoctor.region}
                  </div>
                </div>

                <div className="referral-form">
                  <h3>Referral Details</h3>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12" size-md="6">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">Referral Date</IonLabel>
                          <IonDatetimeButton datetime="referral-date"></IonDatetimeButton>
                          <IonModal keepContentsMounted={true}>
                            <IonDatetime
                              id="referral-date"
                              value={referralDate}
                              presentation="date"
                              onIonChange={(e) =>
                                setReferralDate(e.detail.value as string)
                              }
                              min={new Date().toISOString()}
                            ></IonDatetime>
                          </IonModal>
                        </IonItem>
                      </IonCol>
                      <IonCol size="12" size-md="6">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">Urgency Level</IonLabel>
                          <IonSelect
                            value={urgency}
                            onIonChange={(e) => setUrgency(e.detail.value)}
                            interface="popover"
                          >
                            {urgencyLevels.map((level) => (
                              <IonSelectOption
                                key={level.value}
                                value={level.value}
                              >
                                {level.label}
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol size="12">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">
                            Reason for Referral *
                          </IonLabel>
                          <IonInput
                            value={reason}
                            onIonInput={(e) => setReason(e.detail.value!)}
                            placeholder="Primary reason for referring this patient"
                            required
                          />
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol size="12">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">
                            Clinical Notes *
                          </IonLabel>
                          <IonTextarea
                            value={clinicalNotes}
                            onIonInput={(e) =>
                              setClinicalNotes(e.detail.value!)
                            }
                            placeholder="Relevant medical history, examination findings, test results..."
                            rows={4}
                            required
                          />
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol size="12">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">
                            Additional Instructions
                          </IonLabel>
                          <IonTextarea
                            value={additionalInstructions}
                            onIonInput={(e) =>
                              setAdditionalInstructions(e.detail.value!)
                            }
                            placeholder="Any specific instructions for the receiving specialist..."
                            rows={3}
                          />
                        </IonItem>
                      </IonCol>
                    </IonRow>
                  </IonGrid>

                  <IonButton
                    expand="block"
                    className="refer-btn"
                    onClick={handleReferPatient}
                    disabled={!reason || !clinicalNotes}
                  >
                    <IonIcon icon={shareOutline} slot="start" />
                    Send Referral
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default Refer_patient;
