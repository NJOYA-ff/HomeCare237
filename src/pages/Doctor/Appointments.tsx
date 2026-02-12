import React, { useState, useEffect, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonText,
  IonLoading,
  useIonViewWillEnter,
  IonAlert,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import {
  calendar,
  time,
  location,
  checkmarkCircle,
  closeCircle,
  medical,
  call,
  informationCircle,
  person,
} from "ionicons/icons";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import twilioMs from "../../components/Services/twilioServiceMs";
import { useNotifications } from "../../context/NotificationContext";
import "./Appointments.scss";
import { getAuth } from "firebase/auth";

// Define the Emergency Contact type
interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// Define the Patient type
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  profilePicture?: string;
  emergencyContact?: EmergencyContact;
  bloodType?: string;
  allergies?: string[];
  medicalHistory?: string[];
}

// Define the Appointment type
interface Appointment {
  id: string;
  patientId: string;
  doctorId: string; // Added doctorId field
  doctorName: string;
  patientName: string;
  patientImage: string;
  date: string;
  time: string;
  address: string;
  service: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  phone: string;
  symptoms: string;
  duration: string;
  consultationFee: string;
  createdAt?: any;
  updatedAt?: any;
  // Additional patient fields from patients collection
  patient?: {
    dateOfBirth?: string;
    gender?: string;
    email?: string;
    phone?: string;
    emergencyContact?: EmergencyContact;
    bloodType?: string;
    allergies?: string[];
    medicalHistory?: string[];
  };
}

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [searchText, setSearchText] = useState("");
  const [segment, setSegment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [actionType, setActionType] = useState<
    "accept" | "reject" | "complete" | ""
  >("");
  const [currentDoctorId, setCurrentDoctorId] = useState<string>("");
  const prevAppointmentIds = useRef<Set<string>>(new Set());
  const { sendLocalNotification } = useNotifications();

  // Get current doctor ID on component mount
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      setCurrentDoctorId(user.uid);
      console.log("Current doctor ID:", user.uid);
    } else {
      console.error("No doctor logged in");
      // You might want to redirect to login here
    }
  }, []);

  // Safe value converter - handles all types including Timestamps
  const safeValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    // If it's a Firestore Timestamp
    if (
      value instanceof Object &&
      "seconds" in value &&
      "nanoseconds" in value
    ) {
      try {
        const timestamp = value as Timestamp;
        const date = timestamp.toDate();
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch (error) {
        console.error("Error converting timestamp:", error);
        return "Invalid Date";
      }
    }

    // If it's a regular object (but not a Timestamp), stringify it
    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    // For all other types, convert to string
    return String(value);
  };

  // Safe time converter
  const safeTimeValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    // If it's a Firestore Timestamp
    if (
      value instanceof Object &&
      "seconds" in value &&
      "nanoseconds" in value
    ) {
      try {
        const timestamp = value as Timestamp;
        const date = timestamp.toDate();
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch (error) {
        console.error("Error converting timestamp to time:", error);
        return "Invalid Time";
      }
    }

    // For all other types, convert to string
    return String(value);
  };

  // Format emergency contact for display
  const formatEmergencyContact = (
    emergencyContact: EmergencyContact | undefined,
  ): string => {
    if (!emergencyContact) return "N/A";

    const { name, relationship, phone } = emergencyContact;
    return `${name} (${relationship}): ${phone}`;
  };

  // Format array for display
  const formatArray = (array: any[] | undefined): string => {
    if (!array || array.length === 0) return "None";
    return array.join(", ");
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): string => {
    if (!dateOfBirth) return "N/A";

    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return `${age} years`;
    } catch (error) {
      console.error("Error calculating age:", error);
      return "N/A";
    }
  };

  // Fetch patient data by ID - with enhanced error handling
  const fetchPatientData = async (
    patientId: string,
  ): Promise<Patient | null> => {
    try {
      if (!patientId) return null;

      const patientDoc = await getDoc(doc(db, "patients", patientId));
      if (patientDoc.exists()) {
        const data = patientDoc.data();
        return {
          id: patientDoc.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          address: data.address,
          profilePicture: data.profilePicture,
          emergencyContact: data.emergencyContact,
          bloodType: data.bloodType,
          allergies: data.allergies || [],
          medicalHistory: data.medicalHistory || [],
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching patient data:", error);
      return null;
    }
  };

  // Process appointment data from Firestore - with fallback for missing data
  const processAppointmentData = async (
    docId: string,
    data: any,
  ): Promise<Appointment> => {
    console.log("Processing appointment data:", { id: docId, data });

    let patientData = null;

    // Fetch patient data if patientId exists - but don't fail if it doesn't
    if (data.patientId) {
      try {
        patientData = await fetchPatientData(data.patientId);
      } catch (error) {
        console.error(
          "Error fetching patient data, continuing without it:",
          error,
        );
        // Continue without patient data - don't let this break the appointment
      }
    }

    // Use patient data to enrich appointment data, with fallbacks
    const patientName =
      data.patientName ||
      (patientData
        ? `${patientData.firstName} ${patientData.lastName}`.trim()
        : "Unknown Patient") ||
      "Unknown Patient";

    const patientImage =
      data.patientImage ||
      patientData?.profilePicture ||
      "https://ionicframework.com/docs/img/demos/avatar.svg";

    const phone = data.phone || patientData?.phone || "No phone provided";

    // Get address from patient data (priority) or appointment data
    const address =
      patientData?.address || data.address || "No address provided";

    // Ensure status has a valid value
    const status = (data.status || "pending") as
      | "pending"
      | "accepted"
      | "rejected"
      | "completed";

    return {
      id: docId,
      patientId: data.patientId || "",
      doctorId: data.doctorId || "", // Added doctorId
      doctorName: data.doctorName || "",
      patientName,
      patientImage,
      date: safeValue(data.date) || safeValue(data.createdAt) || "N/A",
      time: safeValue(data.time) || safeTimeValue(data.createdAt) || "N/A",
      address: safeValue(address),
      service: safeValue(data.service) || "General Checkup",
      status: status,
      phone,
      symptoms: safeValue(data.symptoms) || "No symptoms provided",
      duration: safeValue(data.duration) || "30 mins",
      consultationFee: safeValue(data.consultationFee) || "0 XAF",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      patient: patientData
        ? {
            dateOfBirth: patientData.dateOfBirth,
            gender: patientData.gender,
            email: patientData.email,
            emergencyContact: patientData.emergencyContact,
            bloodType: patientData.bloodType,
            allergies: patientData.allergies,
            medicalHistory: patientData.medicalHistory,
          }
        : undefined,
    };
  };

  // Load appointments with patient data - with robust error handling
  const loadAppointments = async () => {
    if (!currentDoctorId) {
      console.log("No doctor ID available yet");
      return;
    }

    try {
      setIsLoading(true);
      console.log(
        "Loading appointments from Firestore for doctor:",
        currentDoctorId,
      );

      // Create a query that filters by doctorId
      const appointmentsRef = collection(db, "appointments");
      const q = query(
        appointmentsRef,
        where("doctorId", "==", currentDoctorId),
        orderBy("createdAt", "desc"),
      );

      const querySnapshot = await getDocs(q);
      const appointmentsData: Appointment[] = [];

      // Process appointments sequentially to ensure proper patient data fetching
      for (const doc of querySnapshot.docs) {
        try {
          const appointment = await processAppointmentData(doc.id, doc.data());
          appointmentsData.push(appointment);
        } catch (error) {
          console.error(
            "Error processing appointment, skipping:",
            error,
            doc.id,
          );
          // Create a basic appointment even if processing fails
          const data = doc.data();
          const basicAppointment: Appointment = {
            id: doc.id,
            patientId: data.patientId || "",
            doctorId: data.doctorId || "",
            doctorName: data.doctorName || "",
            patientName: data.patientName || "Unknown Patient",
            patientImage:
              data.patientImage ||
              "https://ionicframework.com/docs/img/demos/avatar.svg",
            date: safeValue(data.date) || "N/A",
            time: safeValue(data.time) || "N/A",
            address: data.address || "No address provided",
            service: data.service || "General Checkup",
            status: (data.status || "pending") as
              | "pending"
              | "accepted"
              | "rejected"
              | "completed",
            phone: data.phone || "No phone provided",
            symptoms: data.symptoms || "No symptoms provided",
            duration: data.duration || "30 mins",
            consultationFee: data.consultationFee || "0 XAF",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          appointmentsData.push(basicAppointment);
        }
      }

      console.log("Loaded appointments for current doctor:", appointmentsData);
      setAppointments(appointmentsData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading appointments:", error);
      // Set empty array instead of failing completely
      setAppointments([]);
      setIsLoading(false);
    }
  };

  // Real-time listener for appointments - with error resilience
  useEffect(() => {
    if (!currentDoctorId) {
      console.log("No doctor ID available for real-time listener");
      return;
    }

    const appointmentsRef = collection(db, "appointments");
    // Create query with doctorId filter
    const q = query(
      appointmentsRef,
      where("doctorId", "==", currentDoctorId),
      orderBy("createdAt", "desc"),
    );

    console.log("Setting up real-time listener for doctor's appointments...");

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        console.log(
          "Received snapshot with",
          querySnapshot.size,
          "documents for doctor:",
          currentDoctorId,
        );
        const appointmentsData: Appointment[] = [];

        // Determine if this is the first snapshot seen by this component
        const isInitial = prevAppointmentIds.current.size === 0;

        // Process appointments sequentially
        for (const doc of querySnapshot.docs) {
          try {
            const appointment = await processAppointmentData(
              doc.id,
              doc.data(),
            );
            // If this is not the initial load and the appointment id was not seen
            // before, this is a newly received appointment request — notify doctor
            const isNew = !prevAppointmentIds.current.has(appointment.id);
            appointmentsData.push(appointment);

            if (!isInitial && isNew) {
              try {
                await addDoc(collection(db, "notifications"), {
                  recipientId: currentDoctorId,
                  title: "New Appointment Request",
                  body: `New appointment from ${
                    appointment.patientName
                  } on ${safeValue(appointment.date)} at ${safeTimeValue(
                    appointment.time,
                  )}.`,

                  timestamp: Timestamp.now(),
                  read: false,
                });
              } catch (err) {
                console.warn("Failed to write doctor notification:", err);
              }
            }
          } catch (error) {
            console.error(
              "Error processing appointment in real-time listener, skipping:",
              error,
              doc.id,
            );
            // Create basic appointment as fallback
            const data = doc.data();
            const basicAppointment: Appointment = {
              id: doc.id,
              patientId: data.patientId || "",
              doctorId: data.doctorId || "",
              doctorName: data.doctorName || "",
              patientName: data.patientName || "Unknown Patient",
              patientImage:
                data.patientImage ||
                "https://ionicframework.com/docs/img/demos/avatar.svg",
              date: safeValue(data.date) || "N/A",
              time: safeValue(data.time) || "N/A",
              address: data.address || "No address provided",
              service: data.service || "General Checkup",
              status: (data.status || "pending") as
                | "pending"
                | "accepted"
                | "rejected"
                | "completed",
              phone: data.phone || "No phone provided",
              symptoms: data.symptoms || "No symptoms provided",
              duration: data.duration || "30 mins",
              consultationFee: data.consultationFee || "0 XAF",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
            appointmentsData.push(basicAppointment);
          }
        }

        console.log(
          "Processed appointments for current doctor:",
          appointmentsData,
        );

        // Update previously seen IDs so next snapshot can detect new additions
        prevAppointmentIds.current = new Set(appointmentsData.map((a) => a.id));

        setAppointments(appointmentsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error in real-time listener:", error);
        setIsLoading(false);
        // Don't set appointments to empty - keep existing data
      },
    );

    return () => {
      console.log("Cleaning up real-time listener");
      unsubscribe();
    };
  }, [currentDoctorId]); // Re-run when currentDoctorId changes

  // Load appointments when doctor ID is available
  useEffect(() => {
    if (currentDoctorId) {
      loadAppointments();
    }
  }, [currentDoctorId]);

  // Filter appointments based on search and segment
  useEffect(() => {
    let result = appointments;

    // Filter by segment
    if (segment !== "all") {
      result = result.filter((app) => app.status === segment);
    }

    // Filter by search text
    if (searchText) {
      result = result.filter(
        (app) =>
          app.patientName.toLowerCase().includes(searchText.toLowerCase()) ||
          app.service.toLowerCase().includes(searchText.toLowerCase()) ||
          app.address.toLowerCase().includes(searchText.toLowerCase()) ||
          app.phone.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    setFilteredAppointments(result);
  }, [searchText, segment, appointments]);

  const handleAccept = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setActionType("accept");
    setAlertMessage(
      `Are you sure you want to accept the appointment with ${appointment.patientName}?`,
    );
    setShowAlert(true);
  };

  const handleReject = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setActionType("reject");
    setAlertMessage(
      `Are you sure you want to reject the appointment with ${appointment.patientName}?`,
    );
    setShowAlert(true);
  };

  const handleComplete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setActionType("complete");
    setAlertMessage(
      `Mark appointment with ${appointment.patientName} as completed?`,
    );
    setShowAlert(true);
  };

  const handleAlertConfirm = async () => {
    if (!selectedAppointment) return;

    try {
      const appointmentRef = doc(db, "appointments", selectedAppointment.id);

      if (actionType === "accept") {
        await updateDoc(appointmentRef, {
          status: "accepted",
          updatedAt: Timestamp.now(),
        });
        // Notify patient via SMS about acceptance
        try {
          const patientPhone =
            selectedAppointment.phone || selectedAppointment.patient?.phone;
          if (patientPhone) {
            await twilioMs.sendAppointmentStatusSMS(patientPhone, "accepted", {
              id: selectedAppointment.id,
              doctorName: "", // will be filled by send function if needed
              date: selectedAppointment.date,
              time: selectedAppointment.time,
            });
          }
        } catch (err) {
          console.warn("Failed to send acceptance SMS to patient:", err);
        }
        // Write a Firestore notification for the patient
        try {
          await addDoc(collection(db, "notifications"), {
            recipientId: selectedAppointment.patientId,
            title: "Appointment Accepted",
            body: `Your appointment (ID: ${selectedAppointment.date}) with Dr. ${selectedAppointment.doctorName} has been accepted.`,

            timestamp: Timestamp.now(),
            read: false,
          });
          // Send local notification to the current doctor for confirmation
          try {
            await sendLocalNotification(
              "Appointment Accepted",
              `You have accepted the appointment with ${selectedAppointment.patientName}.`,
              {
                appointmentId: selectedAppointment.id,
                status: "accepted",
                timestamp: Date.now(),
              },
            );
          } catch (err) {
            console.warn("Failed to send local notification:", err);
          }
        } catch (err) {
          console.warn("Failed to write patient acceptance notification:", err);
        }
      } else if (actionType === "reject") {
        await updateDoc(appointmentRef, {
          status: "rejected",
          updatedAt: Timestamp.now(),
        });
        // Notify patient via SMS about rejection
        try {
          const patientPhone =
            selectedAppointment.phone || selectedAppointment.patient?.phone;
          if (patientPhone) {
            await twilioMs.sendAppointmentStatusSMS(patientPhone, "rejected", {
              id: selectedAppointment.id,
              doctorName: "",
              date: selectedAppointment.date,
              time: selectedAppointment.time,
            });
          }
        } catch (err) {
          console.warn("Failed to send rejection SMS to patient:", err);
        }
        // Write a Firestore notification for the patient
        try {
          await addDoc(collection(db, "notifications"), {
            recipientId: selectedAppointment.patientId,
            title: "Appointment Rejected",
            body: `Your appointment (ID: ${selectedAppointment.date}) with ${selectedAppointment.doctorName} has been rejected.`,
            timestamp: Timestamp.now(),
            read: false,
          });
          // Send local notification to the current doctor for confirmation
          try {
            await sendLocalNotification(
              "Appointment Rejected",
              `You have rejected the appointment with ${selectedAppointment.patientName}.`,
              {
                appointmentId: selectedAppointment.id,
                status: "rejected",
                timestamp: Date.now(),
              },
            );
          } catch (err) {
            console.warn("Failed to send local notification:", err);
          }
        } catch (err) {
          console.warn("Failed to write patient rejection notification:", err);
        }
      } else if (actionType === "complete") {
        await updateDoc(appointmentRef, {
          status: "completed",
          updatedAt: Timestamp.now(),
        });
        // Notify patient via SMS about completion (custom message)
        try {
          const patientPhone =
            selectedAppointment.phone || selectedAppointment.patient?.phone;
          if (patientPhone) {
            await twilioMs.sendSMS({
              to: patientPhone,
              body: `✅ Your appointment (ID: ${selectedAppointment.date}) has been marked as completed. Thank you for using HomeCare.`,
              appointmentId: selectedAppointment.id,
            });
          }
        } catch (err) {
          console.warn("Failed to send completion SMS to patient:", err);
        }
        // Write a Firestore notification for the patient
        try {
          await addDoc(collection(db, "notifications"), {
            recipientId: selectedAppointment.patientId,
            title: "Appointment Completed",
            body: `Your appointment (ID: ${selectedAppointment.date}) with Dr. ${selectedAppointment.doctorName} has been marked as completed.`,
            timestamp: Timestamp.now(),
            read: false,
          });
          // Send local notification to the current doctor for confirmation
          try {
            await sendLocalNotification(
              "Appointment Completed",
              `You have marked the appointment with ${selectedAppointment.patientName} as completed.`,
              {
                appointmentId: selectedAppointment.id,
                status: "completed",
                timestamp: Date.now(),
              },
            );
          } catch (err) {
            console.warn("Failed to send local notification:", err);
          }
        } catch (err) {
          console.warn("Failed to write patient completion notification:", err);
        }
      }

      console.log(`Appointment ${actionType}ed successfully`);
    } catch (error) {
      console.error(`Error ${actionType}ing appointment:`, error);
      setAlertMessage(`Failed to ${actionType} appointment. Please try again.`);
      setShowAlert(true);
    }

    setSelectedAppointment(null);
    setActionType("");
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle>My Appointments</IonTitle>
        </IonToolbar>

        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search appointments..."
          />
        </IonToolbar>

        <IonToolbar>
          <IonSegment
            value={segment}
            onIonChange={(e) => setSegment(e.detail.value as string)}
          >
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="pending">
              <IonLabel>Pending</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="accepted">
              <IonLabel>Accepted</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="completed">
              <IonLabel>Completed</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonLoading isOpen={isLoading} message={"Loading appointments..."} />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => {
            setShowAlert(false);
            setSelectedAppointment(null);
            setActionType("");
          }}
          header={"Confirm Action"}
          message={alertMessage}
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              cssClass: "secondary",
            },
            {
              text: "Confirm",
              handler: handleAlertConfirm,
            },
          ]}
        />

        {!currentDoctorId && !isLoading ? (
          <div className="no-appointments">
            <IonIcon icon={informationCircle} size="large" />
            <IonText>
              <h3>Please log in to view appointments</h3>
            </IonText>
          </div>
        ) : filteredAppointments.length === 0 && !isLoading ? (
          <div className="no-appointments">
            <IonIcon icon={calendar} size="large" />
            <IonText>
              <h3>No appointments found</h3>
              <p>You don't have any appointments in this category</p>
            </IonText>
          </div>
        ) : (
          <IonList lines="none">
            {filteredAppointments.map((appointment, index) => (
              <IonCard
                key={appointment.id}
                className={`appointment-card ${appointment.status}-card`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <IonCardHeader className="appointment-header">
                  <IonGrid className="compact-grid">
                    <IonRow className="ion-align-items-center ion-justify-content-between">
                      <IonCol size="auto">
                        <IonAvatar className="small-avatar">
                          <img
                            src={appointment.patientImage}
                            alt={appointment.patientName}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://ionicframework.com/docs/img/demos/avatar.svg";
                            }}
                          />
                        </IonAvatar>
                      </IonCol>
                      <IonCol>
                        <IonCardTitle className="compact-title">
                          {appointment.patientName}
                        </IonCardTitle>
                        <IonCardSubtitle className="compact-subtitle">
                          {appointment.service}
                          {appointment.patient?.dateOfBirth && (
                            <span>
                              {" "}
                              • {calculateAge(appointment.patient.dateOfBirth)}
                            </span>
                          )}
                          {appointment.patient?.gender && (
                            <span> • {appointment.patient.gender}</span>
                          )}
                        </IonCardSubtitle>
                      </IonCol>
                      <IonCol size="auto">
                        <IonChip color={getStatusColor(appointment.status)}>
                          {appointment.status.charAt(0).toUpperCase() +
                            appointment.status.slice(1)}
                        </IonChip>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardHeader>

                <IonCardContent className="compact-content">
                  <IonGrid className="compact-grid">
                    <IonRow>
                      <IonCol size="6">
                        <IonItem className="compact-item" lines="none">
                          <IonIcon icon={calendar} slot="start" />
                          <IonLabel className="compact-label">
                            <p>Date</p>
                            <h3>{safeValue(appointment.date)}</h3>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                      <IonCol size="6">
                        <IonItem className="compact-item" lines="none">
                          <IonIcon icon={time} slot="start" />
                          <IonLabel className="compact-label">
                            <p>Time</p>
                            <h3>{safeValue(appointment.time)}</h3>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol>
                        <IonItem className="compact-item" lines="none">
                          <IonIcon icon={location} slot="start" />
                          <IonLabel className="compact-label">
                            <p>Location</p>
                            <h3>{safeValue(appointment.address)}</h3>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol size="6">
                        <IonItem className="compact-item" lines="none">
                          <IonIcon icon={call} slot="start" />
                          <IonLabel className="compact-label">
                            <p>Phone</p>
                            <h3>{safeValue(appointment.phone)}</h3>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                      <IonCol size="6">
                        <IonItem className="compact-item" lines="none">
                          <IonIcon icon={informationCircle} slot="start" />
                          <IonLabel className="compact-label">
                            <p>Fee</p>
                            <h3>{safeValue(appointment.consultationFee)}</h3>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    {/* Additional Patient Information - Only show if available */}
                    {appointment.patient && (
                      <>
                        <IonRow>
                          <IonCol>
                            <IonItem className="compact-item" lines="none">
                              <IonIcon icon={person} slot="start" />
                              <IonLabel className="compact-label">
                                <p>Patient Details</p>
                                <div className="patient-details">
                                  {appointment.patient.email && (
                                    <span>
                                      Email: {appointment.patient.email}
                                    </span>
                                  )}
                                  {appointment.patient.bloodType && (
                                    <span>
                                      Blood Type:{" "}
                                      {appointment.patient.bloodType}
                                    </span>
                                  )}
                                  {appointment.patient.emergencyContact && (
                                    <span>
                                      Emergency:{" "}
                                      {formatEmergencyContact(
                                        appointment.patient.emergencyContact,
                                      )}
                                    </span>
                                  )}
                                </div>
                              </IonLabel>
                            </IonItem>
                          </IonCol>
                        </IonRow>

                        {appointment.patient.allergies &&
                          appointment.patient.allergies.length > 0 && (
                            <IonRow>
                              <IonCol>
                                <IonItem className="compact-item" lines="none">
                                  <IonIcon icon={medical} slot="start" />
                                  <IonLabel className="compact-label">
                                    <p>Allergies</p>
                                    <h3>
                                      {formatArray(
                                        appointment.patient.allergies,
                                      )}
                                    </h3>
                                  </IonLabel>
                                </IonItem>
                              </IonCol>
                            </IonRow>
                          )}

                        {appointment.patient.medicalHistory &&
                          appointment.patient.medicalHistory.length > 0 && (
                            <IonRow>
                              <IonCol>
                                <IonItem className="compact-item" lines="none">
                                  <IonIcon
                                    icon={informationCircle}
                                    slot="start"
                                  />
                                  <IonLabel className="compact-label">
                                    <p>Medical History</p>
                                    <h3>
                                      {formatArray(
                                        appointment.patient.medicalHistory,
                                      )}
                                    </h3>
                                  </IonLabel>
                                </IonItem>
                              </IonCol>
                            </IonRow>
                          )}
                      </>
                    )}

                    {/* Status Action Buttons - Always show based on status */}
                    {appointment.status === "pending" && (
                      <IonRow>
                        <IonCol>
                          <IonButton
                            color="success"
                            size="small"
                            onClick={() => handleAccept(appointment)}
                          >
                            <IonIcon icon={checkmarkCircle} slot="start" />
                            Accept
                          </IonButton>
                        </IonCol>
                        <IonCol>
                          <IonButton
                            color="danger"
                            size="small"
                            onClick={() => handleReject(appointment)}
                          >
                            <IonIcon icon={closeCircle} slot="start" />
                            Reject
                          </IonButton>
                        </IonCol>
                      </IonRow>
                    )}

                    {appointment.status === "accepted" && (
                      <IonRow>
                        <IonCol>
                          <IonButton
                            color="primary"
                            size="small"
                            onClick={() => handleComplete(appointment)}
                          >
                            <IonIcon icon={checkmarkCircle} slot="start" />
                            Complete
                          </IonButton>
                        </IonCol>
                      </IonRow>
                    )}
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Appointments;
