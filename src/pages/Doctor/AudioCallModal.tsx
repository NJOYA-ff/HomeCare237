import React, { useState, useEffect, useRef } from "react";
import {
  IonModal,
  IonContent,
  IonIcon,
  IonSpinner,
  IonToast,
  IonAvatar,
} from "@ionic/react";
import {
  call,
  callOutline,
  micOff,
  mic,
  volumeHigh,
  volumeMute,
  videocam,
  ellipsisHorizontal,
  personAddOutline,
  contractOutline,
  personCircleOutline,
} from "ionicons/icons";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { twilioServiceAlternative } from "../../components/Services/twilioService";
import "./AudioCallModal.scss";

interface AudioCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSwitchToVideo?: () => void;
}

interface DoctorInfo {
  id: string;
  name: string;
  contact: string;
  specialty?: string;
  avatarUrl?: string;
}

interface PatientInfo {
  id: string;
  name: string;
  contact: string;
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
  duration: number;
  notes?: string;
  patientPhone?: string;
  doctorPhone?: string;
}

const AudioCallModal: React.FC<AudioCallModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onSwitchToVideo,
}) => {
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({
    id: "",
    name: "Loading...",
    contact: "",
    specialty: "",
  });
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    id: "",
    name: "Loading...",
    contact: "",
    isAvailable: true,
  });
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "ringing" | "connected" | "error"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [callLogId, setCallLogId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<{ ctx: AudioContext | null; timer: any }>({
    ctx: null,
    timer: null,
  });

  useEffect(() => {
    if (isOpen && patientId) {
      fetchDoctorInfo();
      fetchPatientInfo();
    }

    return () => {
      cleanupCall();
      stopRingtone();
    };
  }, [isOpen, patientId]);

  useEffect(() => {
    const shouldRing =
      isOpen && (callStatus === "calling" || callStatus === "ringing");
    if (shouldRing) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [isOpen, callStatus]);

  const fetchDoctorInfo = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No user logged in");
      }

      const doctorDocRef = doc(db, "doctors", currentUser.uid);
      const doctorDoc = await getDoc(doctorDocRef);

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        setDoctorInfo({
          id: currentUser.uid,
          name: data?.fullName || data?.name || "Doctor",
          contact: data?.contact || data?.phone || "",
          specialty:
            data?.specialty || data?.department || "General Practitioner",
          avatarUrl: data?.photoURL || data?.avatarUrl,
        });
      } else {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setDoctorInfo({
            id: currentUser.uid,
            name: data?.displayName || data?.name || "Doctor",
            contact: data?.phoneNumber || data?.phone || "",
            specialty: data?.specialty || "General Practitioner",
            avatarUrl: data?.photoURL || data?.avatarUrl,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching doctor info:", err);
      setDoctorInfo((prev) => ({ ...prev, name: "Doctor" }));
    }
  };

  const fetchPatientInfo = async () => {
    try {
      setIsLoading(true);

      const patientDocRef = doc(db, "patients", patientId);
      const patientDoc = await getDoc(patientDocRef);

      if (patientDoc.exists()) {
        const data = patientDoc.data();
        setPatientInfo({
          id: patientId,
          name: data?.fullName || data?.name || "Patient",
          contact: data?.phoneNumber || data?.phone || data?.contact || "",
          avatarUrl: data?.photoURL || data?.avatarUrl,
          isAvailable: data?.isAvailable !== false,
        });
      } else {
        const userDocRef = doc(db, "users", patientId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setPatientInfo({
            id: patientId,
            name: data?.displayName || data?.name || "Patient",
            contact: data?.phoneNumber || data?.phone || data?.contact || "",
            avatarUrl: data?.photoURL || data?.avatarUrl,
            isAvailable: true,
          });
        } else {
          setError("Patient not found");
          setToastMessage("Patient information not available");
          setShowToast(true);
        }
      }
    } catch (err) {
      console.error("Error fetching patient info:", err);
      setError("Failed to load patient information");
      setToastMessage("Failed to load patient details");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeTwilio = async () => {
    try {
      setCallStatus("idle");
      setError("");

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Please log in to make a call");
      }

      const identity = `doctor_${currentUser.uid}`;
      const token = await twilioServiceAlternative.getCallToken(identity);
      await twilioServiceAlternative.initialize(token);

      const setupHandler = (twilioServiceAlternative as any)[
        "setupIncomingCallHandler"
      ];
      if (typeof setupHandler === "function") {
        setupHandler((incomingCall: any) => {
          console.log("Incoming call:", incomingCall);
        });
      }
    } catch (err: any) {
      console.error("Failed to initialize Twilio:", err);
      setError("Failed to initialize call service");
      setCallStatus("error");
      setToastMessage("Call service initialization failed");
      setShowToast(true);
    }
  };

  const createCallLog = async (status: CallLog["status"]) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !patientId) return null;

      const callLogRef = doc(collection(db, "callLogs"));
      const nextCallLogId = callLogRef.id;
      setCallLogId(nextCallLogId);

      const callLog: CallLog = {
        id: nextCallLogId,
        doctorId: currentUser.uid,
        patientId,
        patientName: patientInfo.name,
        doctorName: doctorInfo.name,
        status,
        startTime:
          status === "connected" ? (serverTimestamp() as Timestamp) : null,
        endTime: null,
        duration: 0,
        patientPhone: patientInfo.contact,
        doctorPhone: doctorInfo.contact,
      };

      await setDoc(callLogRef, callLog);
      return nextCallLogId;
    } catch (err) {
      console.error("Error creating call log:", err);
      return null;
    }
  };

  const updateCallLog = async (updates: Partial<CallLog>) => {
    if (!callLogId) return;

    try {
      const callLogRef = doc(db, "callLogs", callLogId);
      await updateDoc(callLogRef, updates);
    } catch (err) {
      console.error("Error updating call log:", err);
    }
  };

  const startCall = async () => {
    try {
      if (patientInfo.isAvailable === false) {
        setError("Patient is not available");
        setToastMessage("Patient is currently unavailable");
        setShowToast(true);
        return;
      }

      await initializeTwilio();
      setCallStatus("calling");
      setError("");

      await createCallLog("initiated");

      const connection = await twilioServiceAlternative.makeCall(
        patientInfo.contact,
      );

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

      connection?.on("error", async (callError: any) => {
        console.error("Call error:", callError);
        setError(callError.message || "Call failed");
        setCallStatus("error");
        await updateCallLog({
          status: "failed",
          endTime: serverTimestamp() as Timestamp,
          notes: callError.message,
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
      stopRingtone();
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
    try {
      twilioServiceAlternative.disconnectCall();
    } catch (err) {
      console.warn("Call cleanup disconnect failed:", err);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
    setCallStatus("idle");
    setError("");
    setIsMuted(false);
    setIsSpeakerOn(true);
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
        return "Calling...";
      case "ringing":
        return "Ringing...";
      case "connected":
        return "Call in progress";
      case "error":
        return error || "Call failed";
      default:
        return "Ready to call";
    }
  };

  const startRingtone = () => {
    if (ringtoneRef.current.timer) return;

    try {
      if (!ringtoneRef.current.ctx) {
        ringtoneRef.current.ctx = new AudioContext();
      }

      const ctx = ringtoneRef.current.ctx;
      ringtoneRef.current.timer = setInterval(() => {
        if (!ctx) return;
        const oscillatorA = ctx.createOscillator();
        const oscillatorB = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillatorA.type = "sine";
        oscillatorA.frequency.setValueAtTime(520, ctx.currentTime);
        oscillatorB.type = "sine";
        oscillatorB.frequency.setValueAtTime(660, ctx.currentTime);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

        oscillatorA.connect(gain);
        oscillatorB.connect(gain);
        gain.connect(ctx.destination);

        oscillatorA.start();
        oscillatorB.start();
        oscillatorA.stop(ctx.currentTime + 0.42);
        oscillatorB.stop(ctx.currentTime + 0.42);
      }, 900);
    } catch (err) {
      console.warn("Ringtone blocked:", err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current.timer) {
      clearInterval(ringtoneRef.current.timer);
      ringtoneRef.current.timer = null;
    }
    if (ringtoneRef.current.ctx) {
      ringtoneRef.current.ctx.close();
      ringtoneRef.current.ctx = null;
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  const showMoreOptions = () => {
    setToastMessage("More call options coming soon");
    setShowToast(true);
  };

  const addParticipant = () => {
    setToastMessage("Add participant will be available soon");
    setShowToast(true);
  };

  const switchToVideoCall = async () => {
    await endCall();
    onSwitchToVideo?.();
  };

  const callerInitials = patientInfo.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      className="audio-call-modal"
    >
      <IonContent className="audio-call-content">
        {isLoading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading patient information...</p>
          </div>
        ) : (
          <div className="wa-audio-shell">
            <div className="wa-top-actions">
              <button
                className="wa-top-btn"
                type="button"
                aria-label="Minimize"
                onClick={onClose}
              >
                <IonIcon icon={contractOutline} />
              </button>
              <button
                className="wa-top-btn"
                type="button"
                aria-label="Add participant"
                onClick={addParticipant}
              >
                <IonIcon icon={personAddOutline} />
              </button>
            </div>

            <div className="wa-caller-info">
              <h2 className="wa-caller-name">{patientInfo.name}</h2>
              <p className="wa-call-status">
                {callStatus === "connected"
                  ? formatDuration(callDuration)
                  : getStatusMessage()}
              </p>
            </div>

            <div className="wa-avatar-wrap">
              <IonAvatar className="wa-avatar">
                {patientInfo.avatarUrl ? (
                  <img src={patientInfo.avatarUrl} alt={patientInfo.name} />
                ) : (
                  <span>
                    {callerInitials || <IonIcon icon={personCircleOutline} />}
                  </span>
                )}
              </IonAvatar>
            </div>

            <div className="wa-bottom-controls">
              <button
                className="wa-control-btn"
                type="button"
                aria-label="More options"
                onClick={showMoreOptions}
              >
                <IonIcon icon={ellipsisHorizontal} />
              </button>
              <button
                className="wa-control-btn"
                type="button"
                aria-label="Switch to video call"
                onClick={switchToVideoCall}
              >
                <IonIcon icon={videocam} />
              </button>
              <button
                className={`wa-control-btn ${isSpeakerOn ? "active" : ""}`}
                type="button"
                aria-label="Toggle speaker"
                onClick={toggleSpeaker}
              >
                <IonIcon icon={isSpeakerOn ? volumeHigh : volumeMute} />
              </button>
              <button
                className={`wa-control-btn ${isMuted ? "active" : ""}`}
                type="button"
                aria-label="Toggle mute"
                onClick={toggleMute}
                disabled={callStatus !== "connected"}
              >
                <IonIcon icon={isMuted ? micOff : mic} />
              </button>
              {callStatus === "idle" || callStatus === "error" ? (
                <button
                  className="wa-control-btn wa-start-btn"
                  type="button"
                  aria-label="Start call"
                  onClick={startCall}
                  disabled={!patientInfo.contact || patientInfo.isAvailable === false}
                >
                  <IonIcon icon={call} />
                </button>
              ) : (
                <button
                  className="wa-control-btn wa-end-btn"
                  type="button"
                  aria-label="End call"
                  onClick={endCall}
                >
                  <IonIcon icon={callOutline} />
                </button>
              )}
            </div>
            {callStatus === "error" && <p className="wa-error">{error}</p>}
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
