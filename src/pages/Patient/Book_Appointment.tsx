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
  IonLoading,
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
} from "ionicons/icons";
import brainOutline from "@material-design-icons/svg/two-tone/healing.svg";
import "./Appointment.scss";

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

interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled" | "pending";
  type: "home-visit" | "telemedicine" | "clinic";
  reason: string;
  notes: string;
  createdAt: any;
  updatedAt: any;
  consultationFee: number;
  doctor?: Doctor;
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

// Specialty icons mapping
const specialtyIcons: { [key: string]: string } = {
  "General Practitioner": medical,
  Cardiologist: heartOutline,
  Pediatrician: people,
  Dermatologist: bodyOutline,
  Gynecologist: medical,
  "Orthopedic Surgeon": fitnessOutline,
  Neurologist: brainOutline,
  Psychiatrist: brainOutline,
  Dentist: medical,
  Ophthalmologist: eyeOutline,
  "ENT Specialist": medical,
  Urologist: medical,
  Endocrinologist: medical,
  Gastroenterologist: medical,
  Oncologist: medical,
  Rheumatologist: medical,
  Pulmonologist: medical,
  Nephrologist: medical,
  Allergist: bandageOutline,
  Physiotherapist: fitnessOutline,
};

// Default available slots in case they're not defined
const defaultAvailableSlots = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
];

const Book_Appointment: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<"book" | "myAppointments">(
    "book"
  );
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString()
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<
    "home-visit" | "telemedicine" | "clinic"
  >("clinic");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showCancelAlert, setShowCancelAlert] = useState<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string>("");
  const [appointmentToUpdate, setAppointmentToUpdate] =
    useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<
    "list" | "detail" | "update" | "viewAppointment"
  >("list");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [unsubscribeAppointments, setUnsubscribeAppointments] = useState<
    (() => void) | null
  >(null);
  const [doctorsLoaded, setDoctorsLoaded] = useState<boolean>(false);

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserAppointments(user.uid);
      } else {
        // Clean up subscription if user logs out
        if (unsubscribeAppointments) {
          unsubscribeAppointments();
          setUnsubscribeAppointments(null);
        }
        setAppointments([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Clean up subscription on component unmount
  useEffect(() => {
    return () => {
      if (unsubscribeAppointments) {
        unsubscribeAppointments();
      }
    };
  }, [unsubscribeAppointments]);

  // Load doctors from Firebase - FIXED: Prevent duplicate loading
  const loadDoctors = async () => {
    if (doctorsLoaded) {
      console.log("Doctors already loaded, skipping...");
      return;
    }

    try {
      setIsLoading(true);
      const doctorsCollection = collection(db, "doctors");
      const doctorSnapshot = await getDocs(doctorsCollection);

      // Use Set to track unique doctor IDs
      const uniqueDoctors = new Map<string, Doctor>();

      doctorSnapshot.forEach((doc) => {
        const doctorData = doc.data();
        const doctorId = doc.id;

        // Only add if not already in the map
        if (!uniqueDoctors.has(doctorId)) {
          uniqueDoctors.set(doctorId, {
            id: doctorId,
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
            availableSlots: doctorData.availableSlots || defaultAvailableSlots,
            isAvailable:
              doctorData.isAvailable !== undefined
                ? doctorData.isAvailable
                : true,
            experience: doctorData.experience || 5,
            email: doctorData.email,
            phone: doctorData.phone,
          } as Doctor);
        }
      });

      const doctorsList = Array.from(uniqueDoctors.values());
      console.log(`Loaded ${doctorsList.length} unique doctors`);

      setDoctors(doctorsList);
      setFilteredDoctors(doctorsList);
      setDoctorsLoaded(true);
    } catch (error) {
      console.error("Error loading doctors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get doctor by ID - Enhanced to fetch from Firebase if not in local state
  const getDoctorById = async (id: string): Promise<Doctor | undefined> => {
    // First check if doctor is in local state
    const localDoctor = doctors.find((doctor) => doctor.id === id);
    if (localDoctor) {
      return localDoctor;
    }

    // If not found locally, fetch from Firebase
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
          availableSlots: doctorData.availableSlots || defaultAvailableSlots,
          isAvailable:
            doctorData.isAvailable !== undefined
              ? doctorData.isAvailable
              : true,
          experience: doctorData.experience || 5,
          email: doctorData.email,
          phone: doctorData.phone,
        };

        // Add to local doctors state for future use - FIXED: Prevent duplicates
        setDoctors((prev) => {
          const exists = prev.some((doc) => doc.id === fetchedDoctor.id);
          if (!exists) {
            return [...prev, fetchedDoctor];
          }
          return prev;
        });

        return fetchedDoctor;
      }
    } catch (error) {
      console.error("Error fetching doctor:", error);
    }

    return undefined;
  };

  // Load user appointments from Firebase with doctor data - REAL TIME
  const loadUserAppointments = async (userId: string) => {
    try {
      // Clean up existing subscription
      if (unsubscribeAppointments) {
        unsubscribeAppointments();
      }

      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("patientId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        appointmentsQuery,
        async (snapshot) => {
          const appointmentsList: Appointment[] = [];

          // Process all appointments and fetch doctor data
          for (const doc of snapshot.docs) {
            const data = doc.data();
            const appointment: Appointment = {
              id: doc.id,
              doctorId: data.doctorId,
              doctorName: data.doctorName || "Unknown Doctor",
              doctorSpecialization:
                data.doctorSpecialization || "General Practitioner",
              patientId: data.patientId,
              patientName: data.patientName || "Patient",
              patientEmail: data.patientEmail || "",
              date: data.date?.toDate
                ? data.date.toDate().toISOString()
                : data.date,
              time: data.time || "00:00",
              status: data.status || "pending",
              type: data.type || "clinic",
              reason: data.reason || "",
              notes: data.notes || "",
              consultationFee: data.consultationFee || 5000,
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            } as Appointment;

            // Get doctor data for this appointment
            const doctor = await getDoctorById(data.doctorId);
            if (doctor) {
              appointment.doctor = doctor;
            }

            appointmentsList.push(appointment);
          }

          console.log(
            "Real-time update: Appointments loaded with doctor data",
            appointmentsList.length
          );
          setAppointments(appointmentsList);
        },
        (error) => {
          console.error("Error in real-time appointments listener:", error);
        }
      );

      setUnsubscribeAppointments(() => unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("Error loading appointments:", error);
      return null;
    }
  };

  // Enhanced book appointment function
  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !currentUser) {
      return;
    }

    setIsLoading(true);

    try {
      const newAppointment = {
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialization: selectedDoctor.specialization,
        patientId: currentUser.uid,
        patientName: currentUser.displayName || "Patient",
        patientEmail: currentUser.email,
        date: Timestamp.fromDate(new Date(selectedDate)),
        time: selectedTime,
        status: "pending" as const,
        type: appointmentType,
        reason: reason,
        notes: notes,
        consultationFee: selectedDoctor.consultationFee,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log("Booking appointment:", newAppointment);

      await addDoc(collection(db, "appointments"), newAppointment);

      // The real-time listener will automatically update the appointments list
      setShowConfirmation(true);
      resetSelection();
      setViewMode("list");

      // Force switch to appointments tab to show the new appointment
      setActiveSegment("myAppointments");
    } catch (error) {
      console.error("Error booking appointment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced update appointment function
  const handleUpdateAppointment = async () => {
    if (!appointmentToUpdate || !selectedDate || !selectedTime) {
      return;
    }

    setIsLoading(true);

    try {
      const appointmentRef = doc(db, "appointments", appointmentToUpdate.id);

      await updateDoc(appointmentRef, {
        date: Timestamp.fromDate(new Date(selectedDate)),
        time: selectedTime,
        type: appointmentType,
        reason: reason,
        notes: notes,
        updatedAt: Timestamp.now(),
      });

      setShowConfirmation(true);
      setAppointmentToUpdate(null);
      setViewMode("list");
      resetSelection();
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setShowCancelAlert(true);
  };

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    setIsLoading(true);

    try {
      const appointmentRef = doc(db, "appointments", appointmentToCancel);

      await updateDoc(appointmentRef, {
        status: "cancelled",
        updatedAt: Timestamp.now(),
      });

      setShowCancelAlert(false);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);

      await updateDoc(appointmentRef, {
        status: "completed",
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error completing appointment:", error);
    }
  };

  const handleEditAppointment = async (appointment: Appointment) => {
    const doctor = await getDoctorById(appointment.doctorId);
    if (!doctor) {
      console.error("Doctor not found for appointment:", appointment.id);
      return;
    }

    setSelectedDoctor(doctor);
    setAppointmentToUpdate(appointment);
    setSelectedDate(appointment.date);
    setSelectedTime(appointment.time);
    setAppointmentType(appointment.type);
    setReason(appointment.reason);
    setNotes(appointment.notes);
    setViewMode("update");
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setViewMode("viewAppointment");
  };

  // Safe function to get available slots
  const getAvailableSlots = (doctor: Doctor | null): string[] => {
    if (!doctor) return defaultAvailableSlots;
    return doctor.availableSlots || defaultAvailableSlots;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "primary";
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      case "pending":
        return "warning";
      default:
        return "medium";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Scheduled";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "pending":
        return "Pending";
      default:
        return status;
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

  const formatTime = (timeString: string) => {
    if (!timeString) return "Invalid Time";

    try {
      const [hours, minutes] = timeString.split(":");
      if (!hours || !minutes) return timeString;

      const hourNum = parseInt(hours);
      const minuteNum = parseInt(minutes);

      if (isNaN(hourNum) || isNaN(minuteNum)) return timeString;

      const date = new Date();
      date.setHours(hourNum, minuteNum);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString;
    }
  };

  const resetSelection = () => {
    setSelectedDoctor(null);
    setSelectedDate(new Date().toISOString());
    setSelectedTime("");
    setReason("");
    setNotes("");
    setSelectedAppointment(null);
  };

  const getSpecialtyIcon = (specialty: string) => {
    return specialtyIcons[specialty] || medical;
  };

  // Initialize with some sample doctors if collection is empty - FIXED: Prevent duplicate initialization
  const initializeSampleDoctors = async () => {
    try {
      const doctorsCollection = collection(db, "doctors");
      const snapshot = await getDocs(doctorsCollection);

      console.log(
        "Doctors collection already has data, skipping initialization"
      );
      loadDoctors();
    } catch (error) {
      console.error("Error initializing sample doctors:", error);
    }
  };

  // Call this function once to initialize sample data - FIXED: Use proper dependency array
  useEffect(() => {
    initializeSampleDoctors();
  }, []); // Empty dependency array ensures this runs only once

  // Filter doctors based on region, specialty and search query - FIXED: Use proper dependencies
  useEffect(() => {
    let result = doctors;

    if (selectedRegion) {
      result = result.filter((doctor) => doctor.region === selectedRegion);
    }

    if (selectedSpecialty) {
      result = result.filter(
        (doctor) => doctor.specialization === selectedSpecialty
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(query) ||
          doctor.specialization.toLowerCase().includes(query) ||
          doctor.city.toLowerCase().includes(query)
      );
    }

    // Remove duplicates by ID
    const uniqueDoctors = result.filter(
      (doctor, index, self) =>
        index === self.findIndex((d) => d.id === doctor.id)
    );

    setFilteredDoctors(uniqueDoctors);
  }, [selectedRegion, selectedSpecialty, searchQuery, doctors]);

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Appointments</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="appointment-content">
        <IonLoading isOpen={isLoading} message="Processing..." />

        <IonAlert
          isOpen={showCancelAlert}
          onDidDismiss={() => setShowCancelAlert(false)}
          header={"Cancel Appointment"}
          message={"Are you sure you want to cancel this appointment?"}
          buttons={[
            {
              text: "No",
              role: "cancel",
              cssClass: "secondary",
            },
            {
              text: "Yes",
              handler: confirmCancelAppointment,
            },
          ]}
        />

        <IonAlert
          isOpen={showConfirmation}
          onDidDismiss={() => setShowConfirmation(false)}
          header={"Success!"}
          message={"Your appointment has been successfully processed."}
          buttons={["OK"]}
        />

        {!currentUser ? (
          <IonCard>
            <IonCardContent className="auth-required">
              <IonText color="medium">
                <h2>Please sign in to book appointments</h2>
                <p>You need to be signed in to view and book appointments.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : viewMode === "list" ? (
          <>
            <IonSegment
              value={activeSegment}
              onIonChange={(e) => setActiveSegment(e.detail.value as any)}
            >
              <IonSegmentButton value="book">
                <IonLabel>Book Appointment</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="myAppointments">
                <IonLabel>My Appointments ({appointments.length})</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {activeSegment === "book" ? (
              <div className="booking-section">
                <IonCard className="booking-card">
                  <IonCardHeader>
                    <IonCardTitle>Book a New Appointment</IonCardTitle>
                    <IonCardSubtitle>
                      Find and book with healthcare professionals across
                      Cameroon
                    </IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="filters-container">
                      <IonItem className="filter-item">
                        <IonIcon icon={location} slot="start" />
                        <IonLabel>Region</IonLabel>
                        <IonSelect
                          value={selectedRegion}
                          placeholder="All Regions"
                          onIonChange={(e) => setSelectedRegion(e.detail.value)}
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
                            <IonSelectOption key={specialty} value={specialty}>
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

                    <div className="specialty-filters">
                      <h4>Popular Specialties</h4>
                      <div className="specialty-chips">
                        {medicalSpecialties.slice(0, 6).map((specialty) => (
                          <IonChip
                            key={specialty}
                            outline={selectedSpecialty !== specialty}
                            color={
                              selectedSpecialty === specialty
                                ? "primary"
                                : "medium"
                            }
                            onClick={() =>
                              setSelectedSpecialty(
                                selectedSpecialty === specialty ? "" : specialty
                              )
                            }
                          >
                            <IonIcon icon={getSpecialtyIcon(specialty)} />
                            <IonLabel>{specialty}</IonLabel>
                          </IonChip>
                        ))}
                      </div>
                    </div>

                    <div className="doctors-list">
                      <h3 className="section-title">
                        {selectedRegion && selectedSpecialty
                          ? `Doctors in ${selectedRegion} - ${selectedSpecialty}`
                          : selectedRegion
                          ? `Doctors in ${selectedRegion}`
                          : selectedSpecialty
                          ? `${selectedSpecialty} Doctors`
                          : "Available Doctors"}
                        ({filteredDoctors.length})
                      </h3>

                      {filteredDoctors.length === 0 ? (
                        <IonText color="medium" className="no-results">
                          <p>No doctors found matching your criteria.</p>
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
                        <div className="doctors-grid">
                          {filteredDoctors.map((doctor) => (
                            <IonCard
                              key={doctor.id}
                              className="doctor-card"
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                setViewMode("detail");
                              }}
                            >
                              <IonCardContent>
                                <div className="doctor-header">
                                  <IonAvatar className="doctor-avatar">
                                    <img
                                      src={doctor.avatar}
                                      alt={doctor.name}
                                    />
                                  </IonAvatar>
                                  <div className="doctor-info">
                                    <IonText>
                                      <h3 className="doctor-name">
                                        {doctor.name}
                                      </h3>
                                    </IonText>
                                    <IonText color="medium">
                                      <p className="doctor-specialty">
                                        <IonIcon
                                          icon={getSpecialtyIcon(
                                            doctor.specialization
                                          )}
                                        />
                                        {doctor.specialization}
                                      </p>
                                    </IonText>
                                  </div>
                                </div>

                                <div className="doctor-details">
                                  <div className="detail-item-d">
                                    <IonIcon icon={location} />
                                    <span>
                                      {doctor.city}, {doctor.region}
                                    </span>
                                  </div>
                                  <div className="detail-item-d">
                                    <IonIcon icon={star} color="warning" />
                                    <span>
                                      {doctor.rating} ({doctor.reviews} reviews)
                                    </span>
                                  </div>
                                  <div className="detail-item-d">
                                    <IonIcon
                                      icon={cashOutline}
                                      color="success"
                                    />
                                    <span>
                                      {doctor.consultationFee.toLocaleString()}{" "}
                                      XAF
                                    </span>
                                  </div>
                                  <div className="detail-item-d">
                                    <IonIcon
                                      icon={timeOutline}
                                      color="primary"
                                    />
                                    <span>
                                      {doctor.experience} years experience
                                    </span>
                                  </div>
                                </div>

                                <IonButton
                                  expand="block"
                                  size="small"
                                  className="book-now-btn-1"
                                >
                                  Book now
                                </IonButton>
                              </IonCardContent>
                            </IonCard>
                          ))}
                        </div>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            ) : (
              <div className="appointments-section">
                <IonCard className="booking-card">
                  <IonCardHeader>
                    <IonCardTitle>My Appointments</IonCardTitle>
                    <IonCardSubtitle>
                      Manage your upcoming and past appointments
                    </IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {appointments.length === 0 ? (
                      <IonText color="medium" className="no-appointments">
                        <p>You don't have any appointments yet.</p>
                        <IonButton onClick={() => setActiveSegment("book")}>
                          Book Your First Appointment
                        </IonButton>
                      </IonText>
                    ) : (
                      <div className="appointments-list">
                        {appointments.map((appointment) => (
                          <IonCard
                            key={appointment.id}
                            className="appointment-card"
                          >
                            <IonCardContent>
                              <div className="appointment-header">
                                <IonAvatar className="doctor-avatar">
                                  <img
                                    src={
                                      appointment.doctor?.avatar ||
                                      "https://ionicframework.com/docs/img/demos/avatar.svg"
                                    }
                                    alt={appointment.doctor?.name || "Doctor"}
                                  />
                                </IonAvatar>
                                <div className="appointment-info">
                                  <IonText>
                                    <h3
                                      className="doctor-name"
                                      onClick={() =>
                                        handleViewAppointment(appointment)
                                      }
                                      style={{
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {appointment.doctorName}
                                    </h3>
                                  </IonText>
                                  <IonText color="medium">
                                    <p className="doctor-specialty">
                                      <IonIcon
                                        icon={getSpecialtyIcon(
                                          appointment.doctorSpecialization
                                        )}
                                      />
                                      {appointment.doctorSpecialization}
                                    </p>
                                  </IonText>
                                  <IonChip
                                    color={getStatusColor(appointment.status)}
                                  >
                                    {getStatusText(appointment.status)}
                                  </IonChip>
                                </div>
                              </div>

                              <div className="appointment-details">
                                <div className="detail-item-d">
                                  <IonIcon icon={calendar} />
                                  <span>{formatDate(appointment.date)}</span>
                                </div>

                                <div className="detail-item-d">
                                  <IonIcon icon={time} />
                                  <span>{formatTime(appointment.time)}</span>
                                </div>

                                <div className="detail-item-d">
                                  <IonIcon icon={medical} />
                                  <span>
                                    {appointment.type === "clinic"
                                      ? "Clinic Visit"
                                      : appointment.type === "home-visit"
                                      ? "Home Visit"
                                      : "Telemedicine"}
                                  </span>
                                </div>

                                {appointment.doctor && (
                                  <>
                                    <div className="detail-item-d">
                                      <IonIcon icon={location} />
                                      <span>
                                        {appointment.doctor.city},{" "}
                                        {appointment.doctor.region}
                                      </span>
                                    </div>
                                    <div className="detail-item-d">
                                      <IonIcon icon={cashOutline} />
                                      <span>
                                        Fee:{" "}
                                        {appointment.doctor.consultationFee.toLocaleString()}{" "}
                                        XAF
                                      </span>
                                    </div>
                                  </>
                                )}

                                <div className="detail-item-d">
                                  <IonIcon icon={informationCircle} />
                                  <span>Reason: {appointment.reason}</span>
                                </div>
                              </div>

                              <div className="appointment-actions">
                                <IonButton
                                  fill="outline"
                                  color="primary"
                                  size="small"
                                  onClick={() =>
                                    handleViewAppointment(appointment)
                                  }
                                >
                                  <IonIcon icon={eyeOutline} slot="start" />
                                  View Details
                                </IonButton>

                                {appointment.status === "scheduled" && (
                                  <>
                                    {/* <IonButton
                                      fill="outline"
                                      color="primary"
                                      size="small"
                                      onClick={() =>
                                        handleEditAppointment(appointment)
                                      }
                                    >
                                      <IonIcon
                                        icon={createOutline}
                                        slot="start"
                                      />
                                      Update
                                    </IonButton> */}

                                    <IonButton
                                      fill="outline"
                                      color="danger"
                                      size="small"
                                      onClick={() =>
                                        handleCancelAppointment(appointment.id)
                                      }
                                    >
                                      <IonIcon
                                        icon={closeCircle}
                                        slot="start"
                                      />
                                      Cancel
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
        ) : viewMode === "viewAppointment" && selectedAppointment ? (
          <div className="appointment-detail-section">
            <IonCard>
              <IonCardHeader>
                <div className="detail-header">
                  <IonButton
                    fill="clear"
                    onClick={() => {
                      setViewMode("list");
                      setSelectedAppointment(null);
                    }}
                  >
                    <IonIcon icon={arrowBack} />
                    Back to Appointments
                  </IonButton>
                  <IonCardTitle>Appointment Details</IonCardTitle>
                  <IonCardSubtitle>
                    {formatDate(selectedAppointment.date)} at{" "}
                    {formatTime(selectedAppointment.time)}
                  </IonCardSubtitle>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <div className="appointment-detail-content">
                  <div className="detail-section">
                    <h3>Doctor Information</h3>
                    {selectedAppointment.doctor ? (
                      <div className="doctor-info-detail">
                        <IonAvatar className="detail-avatar">
                          <img
                            src={
                              selectedAppointment.doctor.avatar ||
                              "https://ionicframework.com/docs/img/demos/avatar.svg"
                            }
                            alt={selectedAppointment.doctor.name}
                          />
                        </IonAvatar>
                        <div className="doctor-details">
                          <h4>{selectedAppointment.doctor.name}</h4>
                          <p>
                            <IonIcon
                              icon={getSpecialtyIcon(
                                selectedAppointment.doctor.specialization
                              )}
                            />
                            {selectedAppointment.doctor.specialization}
                          </p>
                          <p>
                            <IonIcon icon={location} />
                            {selectedAppointment.doctor.city},{" "}
                            {selectedAppointment.doctor.region}
                          </p>
                          <p>
                            <IonIcon icon={star} color="warning" />
                            {selectedAppointment.doctor.rating} (
                            {selectedAppointment.doctor.reviews} reviews)
                          </p>
                          <p>
                            <IonIcon icon={cashOutline} color="success" />
                            Consultation:{" "}
                            {selectedAppointment.doctor.consultationFee.toLocaleString()}{" "}
                            XAF
                          </p>
                          <p>
                            <IonIcon icon={timeOutline} color="primary" />
                            {selectedAppointment.doctor.experience} years
                            experience
                          </p>
                          <p>
                            <IonIcon icon={people} />
                            Languages:{" "}
                            {selectedAppointment.doctor.languages.join(", ")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <IonText color="medium">
                        <p>Loading doctor information...</p>
                      </IonText>
                    )}
                  </div>

                  <div className="detail-section">
                    <h3>Appointment Information</h3>
                    <IonGrid>
                      <IonRow>
                        <IonCol size="12" size-md="6">
                          <IonItem>
                            <IonLabel>
                              <strong>Status</strong>
                            </IonLabel>
                            <IonChip
                              color={getStatusColor(selectedAppointment.status)}
                            >
                              {getStatusText(selectedAppointment.status)}
                            </IonChip>
                          </IonItem>
                        </IonCol>
                        <IonCol size="12" size-md="6">
                          <IonItem>
                            <IonLabel>
                              <strong>Type</strong>
                            </IonLabel>
                            <IonText>
                              {selectedAppointment.type === "clinic"
                                ? "Clinic Visit"
                                : selectedAppointment.type === "home-visit"
                                ? "Home Visit"
                                : "Telemedicine"}
                            </IonText>
                          </IonItem>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol size="12" size-md="6">
                          <IonItem>
                            <IonLabel>
                              <strong>Date</strong>
                            </IonLabel>
                            <IonText>
                              {formatDate(selectedAppointment.date)}
                            </IonText>
                          </IonItem>
                        </IonCol>
                        <IonCol size="12" size-md="6">
                          <IonItem>
                            <IonLabel>
                              <strong>Time</strong>
                            </IonLabel>
                            <IonText>
                              {formatTime(selectedAppointment.time)}
                            </IonText>
                          </IonItem>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol size="12">
                          <IonItem>
                            <IonLabel>
                              <strong>Consultation Fee</strong>
                            </IonLabel>
                            <IonText>
                              {selectedAppointment.consultationFee.toLocaleString()}{" "}
                              XAF
                            </IonText>
                          </IonItem>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </div>

                  <div className="detail-section">
                    <h3>Medical Information</h3>
                    <IonItem>
                      <IonLabel position="stacked">Reason for Visit</IonLabel>
                      <IonTextarea
                        value={selectedAppointment.reason}
                        readonly
                        rows={2}
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Additional Notes</IonLabel>
                      <IonTextarea
                        value={
                          selectedAppointment.notes || "No additional notes"
                        }
                        readonly
                        rows={3}
                      />
                    </IonItem>
                  </div>

                  {selectedAppointment.status === "scheduled" && (
                    <div className="detail-actions">
                      <IonButton
                        expand="block"
                        color="primary"
                        onClick={() =>
                          handleEditAppointment(selectedAppointment)
                        }
                      >
                        <IonIcon icon={createOutline} slot="start" />
                        Update Appointment
                      </IonButton>
                      <IonButton
                        expand="block"
                        color="danger"
                        fill="outline"
                        onClick={() =>
                          handleCancelAppointment(selectedAppointment.id)
                        }
                      >
                        <IonIcon icon={closeCircle} slot="start" />
                        Cancel Appointment
                      </IonButton>
                    </div>
                  )}
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        ) : (viewMode === "detail" || viewMode === "update") &&
          selectedDoctor ? (
          <div className="booking-detail-section">
            <IonCard>
              <IonCardHeader>
                <div className="detail-header">
                  <IonButton
                    fill="clear"
                    onClick={() => {
                      setViewMode("list");
                      resetSelection();
                    }}
                  >
                    <IonIcon icon={arrowBack} />
                    Back
                  </IonButton>
                  <IonCardTitle>
                    {viewMode === "update"
                      ? "Update Appointment with "
                      : "Book with "}
                    {selectedDoctor.name}
                  </IonCardTitle>
                  <IonCardSubtitle>
                    {selectedDoctor.specialization}
                  </IonCardSubtitle>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <div className="doctor-profile">
                  <div className="profile-header">
                    <IonAvatar className="profile-avatar">
                      <img
                        src={selectedDoctor.avatar}
                        alt={selectedDoctor.name}
                      />
                    </IonAvatar>
                    <div className="profile-info">
                      <h2>{selectedDoctor.name}</h2>
                      <p>{selectedDoctor.specialization}</p>
                      <div className="rating">
                        <IonIcon icon={star} color="warning" />
                        <span>
                          {selectedDoctor.rating} ({selectedDoctor.reviews}{" "}
                          reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="profile-details">
                    <div className="detail-row">
                      <IonIcon icon={location} />
                      <span>
                        {selectedDoctor.address}, {selectedDoctor.city},{" "}
                        {selectedDoctor.region}
                      </span>
                    </div>
                    <div className="detail-row">
                      <IonIcon icon={cashOutline} />
                      <span>
                        Consultation:{" "}
                        {selectedDoctor.consultationFee.toLocaleString()} XAF
                      </span>
                    </div>
                    <div className="detail-row">
                      <IonIcon icon={timeOutline} />
                      <span>
                        {selectedDoctor.experience} years of experience
                      </span>
                    </div>
                    <div className="detail-row">
                      <IonIcon icon={people} />
                      <span>
                        Languages: {selectedDoctor.languages.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="booking-form">
                  <h3>Appointment Details</h3>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12" size-md="6">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">
                            Appointment Type
                          </IonLabel>
                          <IonSelect
                            value={appointmentType}
                            onIonChange={(e) =>
                              setAppointmentType(e.detail.value)
                            }
                            interface="popover"
                          >
                            <IonSelectOption value="clinic">
                              Clinic Visit
                            </IonSelectOption>
                            <IonSelectOption value="home-visit">
                              Home Visit
                            </IonSelectOption>
                            <IonSelectOption value="telemedicine">
                              Telemedicine
                            </IonSelectOption>
                          </IonSelect>
                        </IonItem>
                      </IonCol>
                      <IonCol size="12" size-md="6">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">Select Date</IonLabel>
                          <IonDatetimeButton datetime="appointment-date"></IonDatetimeButton>
                          <IonModal keepContentsMounted={true}>
                            <IonDatetime
                              id="appointment-date"
                              value={selectedDate}
                              presentation="date"
                              onIonChange={(e) =>
                                setSelectedDate(e.detail.value as string)
                              }
                              min={new Date().toISOString()}
                            ></IonDatetime>
                          </IonModal>
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    {selectedDate && (
                      <IonRow>
                        <IonCol size="12">
                          <IonItem className="form-item">
                            <IonLabel position="stacked">Select Time</IonLabel>
                            <IonSelect
                              value={selectedTime}
                              placeholder="Available slots"
                              onIonChange={(e) =>
                                setSelectedTime(e.detail.value)
                              }
                              interface="popover"
                            >
                              {/* FIXED: Using safe function to get available slots */}
                              {getAvailableSlots(selectedDoctor).map((slot) => (
                                <IonSelectOption key={slot} value={slot}>
                                  {slot}
                                </IonSelectOption>
                              ))}
                            </IonSelect>
                          </IonItem>
                        </IonCol>
                      </IonRow>
                    )}

                    <IonRow>
                      <IonCol size="12">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">
                            Reason for Visit
                          </IonLabel>
                          <IonInput
                            value={reason}
                            onIonInput={(e) => setReason(e.detail.value!)}
                            placeholder="Describe your symptoms or reason for appointment"
                          />
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol size="12">
                        <IonItem className="form-item">
                          <IonLabel position="stacked">
                            Additional Notes (Optional)
                          </IonLabel>
                          <IonTextarea
                            value={notes}
                            onIonInput={(e) => setNotes(e.detail.value!)}
                            placeholder="Any additional information for the doctor"
                            rows={3}
                          />
                        </IonItem>
                      </IonCol>
                    </IonRow>
                  </IonGrid>

                  <IonButton
                    expand="block"
                    className="book-btn"
                    onClick={
                      viewMode === "update"
                        ? handleUpdateAppointment
                        : handleBookAppointment
                    }
                    disabled={!selectedDate || !selectedTime}
                  >
                    <IonIcon icon={checkmark} slot="start" />
                    {viewMode === "update"
                      ? "Update Appointment"
                      : "Confirm Appointment"}
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

export default Book_Appointment;
