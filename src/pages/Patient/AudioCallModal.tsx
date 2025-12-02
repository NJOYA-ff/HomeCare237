import React, { useState, useEffect, useRef } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
} from "@ionic/react";
import {
  call,
  callOutline,
  close,
  volumeHigh,
  volumeMute,
  personCircleOutline,
  timeOutline,
} from "ionicons/icons";
import { db, auth, storage } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { twilioServiceAlternative } from "../../components/Services/twilioService";
import "./AudioCallModal.scss";

interface AudioCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string; // Doctor's unique ID from Firebase
  patientId?: string; // Patient's ID (current user)
}

interface DoctorInfo {
  name: string;
  phoneNumber: string;
  specialty?: string;
  avatarUrl?: string;
  isAvailable?: boolean;
}

interface CallLog {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  status:
    | "initiated"
    | "ringing"
    | "connected"
    | "missed"
    | "completed"
    | "failed";
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  duration: number; // in seconds
  notes?: string;
  patientPhone?: string;
  doctorPhone?: string;
}

const AudioCallModal: React.FC<AudioCallModalProps> = ({
  isOpen,
  onClose,
  doctorId,
  patientId,
}) => {
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({
    name: "Loading...",
    phoneNumber: "",
    specialty: "",
  });
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "ringing" | "connected" | "error"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    phoneNumber: "",
  });
  const [callLogId, setCallLogId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch doctor information
  useEffect(() => {
    if (isOpen && doctorId) {
      fetchDoctorInfo();
      fetchPatientInfo();
    }

    return () => {
      cleanupCall();
    };
  }, [isOpen, doctorId]);

  // Fetch patient information from Firebase
  const fetchPatientInfo = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No user logged in");
      }

      const patientDocRef = doc(db, "patients", currentUser.uid);
      const patientDoc = await getDoc(patientDocRef);

      if (patientDoc.exists()) {
        const data = patientDoc.data();
        setPatientInfo({
          name: data?.fullName || data?.name || "Patient",
          phoneNumber: data?.phoneNumber || data?.phone || "",
        });
      } else {
        // Fallback to user profile if not in patients collection
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setPatientInfo({
            name: data?.displayName || data?.name || "Patient",
            phoneNumber: data?.phoneNumber || "",
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching patient info:", err);
      setPatientInfo({
        name: "Patient",
        phoneNumber: "",
      });
    }
  };

  // Fetch doctor information from Firebase
  const fetchDoctorInfo = async () => {
    try {
      setIsLoading(true);
      const doctorDocRef = doc(db, "doctors", doctorId);
      const doctorDoc = await getDoc(doctorDocRef);

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        setDoctorInfo({
          name: data?.fullName || data?.name || "Doctor",
          phoneNumber: data?.phoneNumber || data?.phone || "",
          specialty:
            data?.specialty || data?.department || "General Practitioner",
          avatarUrl: data?.photoURL || data?.avatarUrl,
          isAvailable: data?.isAvailable !== false, // Default to true if not specified
        });
      } else {
        setError("Doctor not found");
        setToastMessage("Doctor information not available");
        setShowToast(true);
      }
    } catch (err: any) {
      console.error("Error fetching doctor info:", err);
      setError("Failed to load doctor information");
      setToastMessage("Failed to load doctor details");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Twilio with Firebase authentication
  const initializeTwilio = async () => {
    try {
      setCallStatus("idle");
      setError("");

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Please log in to make a call");
      }

      // Use Firebase UID as identity for Twilio
      const identity = `patient_${currentUser.uid}`;
      const token = await twilioServiceAlternative.getCallToken(identity);
      await twilioServiceAlternative.initialize(token);

      // Listen for incoming call events if needed (guarded to avoid TS error if method doesn't exist)
      const setupHandler = (twilioServiceAlternative as any)[
        "setupIncomingCallHandler"
      ];
      if (typeof setupHandler === "function") {
        setupHandler((incomingCall: any) => {
          // Handle incoming calls if required
          console.log("Incoming call:", incomingCall);
        });
      } else {
        // Optional: log that the handler is not available on this Twilio service implementation
        console.warn(
          "setupIncomingCallHandler is not available on twilioServiceAlternative"
        );
      }
    } catch (err: any) {
      console.error("Failed to initialize Twilio:", err);
      setError("Failed to initialize call service");
      setCallStatus("error");
      setToastMessage("Call service initialization failed");
      setShowToast(true);
    }
  };

  // Create a call log in Firebase
  const createCallLog = async (status: CallLog["status"]) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !doctorId) return null;

      const callLogRef = doc(collection(db, "callLogs"));
      const callLogId = callLogRef.id;
      setCallLogId(callLogId);

      const callLog: CallLog = {
        id: callLogId,
        doctorId,
        patientId: currentUser.uid,
        patientName: patientInfo.name,
        doctorName: doctorInfo.name,
        status,
        startTime:
          status === "connected" ? (serverTimestamp() as Timestamp) : null,
        endTime: null,
        duration: 0,
        patientPhone: patientInfo.phoneNumber,
        doctorPhone: doctorInfo.phoneNumber,
      };

      await setDoc(callLogRef, callLog);
      return callLogId;
    } catch (err) {
      console.error("Error creating call log:", err);
      return null;
    }
  };

  // Update call log status
  const updateCallLog = async (updates: Partial<CallLog>) => {
    if (!callLogId) return;

    try {
      const callLogRef = doc(db, "callLogs", callLogId);
      await updateDoc(callLogRef, updates);
    } catch (err) {
      console.error("Error updating call log:", err);
    }
  };

  // Start the call with Firebase integration
  const startCall = async () => {
    try {
      if (!doctorInfo.isAvailable) {
        setError("Doctor is not available");
        setToastMessage("Doctor is currently unavailable");
        setShowToast(true);
        return;
      }

      await initializeTwilio();
      setCallStatus("calling");
      setError("");

      // Create initial call log
      await createCallLog("initiated");

      const connection = await twilioServiceAlternative.makeCall(
        doctorInfo.phoneNumber
      );

      // Set up connection listeners for real-time updates
      connection?.on("ringing", async () => {
        setCallStatus("ringing");
        await updateCallLog({ status: "ringing" });
      });

      connection?.on("accept", async () => {
        setCallStatus("connected");
        startTimer();
        await updateCallLog({
          status: "connected",
          startTime: serverTimestamp() as Timestamp,
        });
      });

      connection?.on("disconnect", async () => {
        await endCall();
      });

      connection?.on("error", async (error: any) => {
        console.error("Call error:", error);
        setError(error.message || "Call failed");
        setCallStatus("error");
        await updateCallLog({
          status: "failed",
          endTime: serverTimestamp() as Timestamp,
          notes: error.message,
        });
      });
    } catch (err: any) {
      console.error("Call failed:", err);
      setError(err.message || "Failed to make call");
      setCallStatus("error");
      setToastMessage("Call failed to initiate");
      setShowToast(true);
      await updateCallLog({
        status: "failed",
        endTime: serverTimestamp() as Timestamp,
        notes: err.message,
      });
    }
  };

  // End call and update Firebase
  const endCall = async () => {
    try {
      twilioServiceAlternative.disconnectCall();

      if (callLogId && callStatus === "connected") {
        await updateCallLog({
          status: "completed",
          endTime: serverTimestamp() as Timestamp,
          duration: callDuration,
        });
      } else if (
        callLogId &&
        (callStatus === "calling" || callStatus === "ringing")
      ) {
        await updateCallLog({
          status: "missed",
          endTime: serverTimestamp() as Timestamp,
        });
      }
    } catch (err) {
      console.error("Error ending call:", err);
    } finally {
      cleanupCall();
      onClose();
    }
  };

  const toggleMute = () => {
    if (twilioServiceAlternative["connection"]) {
      const currentMuteStatus = !isMuted;
      twilioServiceAlternative["connection"].mute(currentMuteStatus);
      setIsMuted(currentMuteStatus);
    }
  };

  const cleanupCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
    setCallStatus("idle");
    setError("");
    setIsMuted(false);
    setCallLogId("");
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusMessage = () => {
    switch (callStatus) {
      case "calling":
        return "Calling Doctor...";
      case "ringing":
        return "Doctor's Phone Ringing...";
      case "connected":
        return "Call in progress";
      case "error":
        return error || "Call failed";
      default:
        return "Ready to call";
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      className="audio-call-modal"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Audio Call with Doctor</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {isLoading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading doctor information...</p>
          </div>
        ) : (
          <div className="content-container">
            {/* Doctor Info Card */}
            <IonCard className="doctor-card">
              <div className="doctor-header">
                <IonAvatar className="doctor-avatar">
                  {doctorInfo.avatarUrl ? (
                    <img src={doctorInfo.avatarUrl} alt={doctorInfo.name} />
                  ) : (
                    <IonIcon icon={personCircleOutline} />
                  )}
                </IonAvatar>
                <div className="doctor-details">
                  <h2 className="doctor-name">{doctorInfo.name}</h2>
                  <p className="doctor-specialty">{doctorInfo.specialty}</p>
                  <p className="availability">
                    Status:{" "}
                    {doctorInfo.isAvailable ? "Available" : "Unavailable"}
                  </p>
                </div>
              </div>
            </IonCard>

            {/* Status Section */}
            <div className="status-section">
              <div className={`status-icon ${callStatus}`}>
                {callStatus === "calling" || callStatus === "ringing" ? (
                  <IonSpinner name="crescent" />
                ) : callStatus === "connected" ? (
                  <IonIcon
                    icon={isMuted ? volumeMute : volumeHigh}
                    color="success"
                    className="connected"
                  />
                ) : null}
              </div>

              <h3
                className={`duration-display ${
                  callStatus === "connected" ? "" : "connecting"
                }`}
              >
                {callStatus === "connected"
                  ? formatDuration(callDuration)
                  : getStatusMessage()}
              </h3>

              {callStatus === "connected" && (
                <p className="status-message success">Call in progress</p>
              )}
              {callStatus === "error" && (
                <p className="status-message error">{error}</p>
              )}
            </div>

            {/* Patient Info */}
            <IonCard className="patient-card">
              <IonCardHeader>
                <IonCardTitle>Your Information</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h3>Name</h3>
                      <p>{patientInfo.name}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h3>Phone Number</h3>
                      <p>{patientInfo.phoneNumber || "Not provided"}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>

            {/* Call Controls */}
            <div className="call-controls">
              {callStatus === "connected" && (
                <div className="mute-control">
                  <IonButton
                    fill="outline"
                    className={isMuted ? "active" : ""}
                    onClick={toggleMute}
                  >
                    <IonIcon icon={isMuted ? volumeMute : volumeHigh} />
                    {isMuted ? "Unmute" : "Mute"}
                  </IonButton>
                </div>
              )}

              <div className="primary-controls">
                {callStatus === "idle" && (
                  <IonButton
                    expand="block"
                    className="call-button"
                    onClick={startCall}
                    disabled={
                      !doctorInfo.phoneNumber || !doctorInfo.isAvailable
                    }
                  >
                    <IonIcon icon={call} />
                    {/* Call Dr. {doctorInfo.name.split(" ")[0]} */}
                  </IonButton>
                )}

                {(callStatus === "calling" ||
                  callStatus === "ringing" ||
                  callStatus === "connected") && (
                  <IonButton
                    expand="block"
                    className="end-call-button"
                    onClick={endCall}
                  >
                    <IonIcon icon={callOutline} />
                    End Call
                  </IonButton>
                )}

                {callStatus === "error" && (
                  <>
                    <IonButton
                      expand="block"
                      className="retry-button"
                      onClick={startCall}
                    >
                      <IonIcon icon={call} />
                      Try Again
                    </IonButton>
                    <IonButton
                      expand="block"
                      fill="outline"
                      className="close-button"
                      onClick={onClose}
                    >
                      Close
                    </IonButton>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </IonContent>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="top"
      />
    </IonModal>
  );
};

export default AudioCallModal;
