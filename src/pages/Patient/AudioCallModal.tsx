import React, { useState, useEffect, useRef } from "react";
import {
  IonModal,
  IonContent,
  IonIcon,
  IonSpinner,
  IonToast,
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
import { avatarColor } from "../../utils/avatarColor";
import "./AudioCallModal.scss";

interface AudioCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  patientId?: string;
  onSwitchToVideo?: () => void;
}

interface DoctorInfo {
  name: string;
  contact: string;
  specialization?: string;
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
  doctorId,
  onSwitchToVideo,
}) => {
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({
    name: "Loading...",
    contact: "",
    specialization: "",
    isAvailable: true,
  });
  const [patientInfo, setPatientInfo] = useState({ name: "", contact: "" });
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "ringing" | "connected" | "error"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [callLogId, setCallLogId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<{ ctx: AudioContext | null; timer: any }>({
    ctx: null,
    timer: null,
  });

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchDoctorInfo();
      fetchPatientInfo();
    }
    return () => {
      cleanupCall();
      stopRingtone();
    };
  }, [isOpen, doctorId]);

  useEffect(() => {
    if (isOpen && (callStatus === "calling" || callStatus === "ringing")) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [isOpen, callStatus]);

  const fetchPatientInfo = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const snap = await getDoc(doc(db, "patients", currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setPatientInfo({
          name: d?.name || d?.fullName || "Patient",
          contact: d?.contact || d?.phone || "",
        });
      } else {
        const snap2 = await getDoc(doc(db, "patients", currentUser.uid));
        if (snap2.exists()) {
          const d = snap2.data();
          setPatientInfo({
            name: d?.name || d?.displayName || "Patient",
            contact: d?.contact || d?.phone || "",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching patient info:", err);
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      setIsLoading(true);
      const snap = await getDoc(doc(db, "doctors", doctorId));
      if (snap.exists()) {
        const d = snap.data();
        setDoctorInfo({
          name: d?.name || d?.fullName || "Doctor",
          contact: d?.contact || d?.phone || "",
          specialization: d?.specialization || "General Practitioner",
          avatarUrl: d?.profilePhoto || d?.photoURL || d?.image || d?.avatarUrl,
          isAvailable: d?.isAvailable !== false,
        });
      } else {
        const snap2 = await getDoc(doc(db, "doctors", doctorId));
        if (snap2.exists()) {
          const d = snap2.data();
          setDoctorInfo({
            name: d?.name || d?.displayName || "Doctor",
            contact: d?.contact || "",
            specialization: d?.specialization || "General Practitioner",
            avatarUrl:
              d?.profilePhoto || d?.photoURL || d?.image || d?.avatarUrl,
            isAvailable: true,
          });
        } else {
          setToastMessage("Doctor information not available");
          setShowToast(true);
        }
      }
    } catch (err) {
      console.error("Error fetching doctor info:", err);
      setToastMessage("Failed to load doctor details");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeTwilio = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Please log in to make a call");
    const token = await twilioServiceAlternative.getCallToken(
      `patient_${currentUser.uid}`,
    );
    await twilioServiceAlternative.initialize(token);
  };

  const createCallLog = async (status: CallLog["status"]) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      const ref = doc(collection(db, "callLogs"));
      setCallLogId(ref.id);
      await setDoc(ref, {
        id: ref.id,
        doctorId,
        patientId: currentUser.uid,
        patientName: patientInfo.name,
        doctorName: doctorInfo.name,
        status,
        startTime: status === "connected" ? serverTimestamp() : null,
        endTime: null,
        duration: 0,
        patientPhone: patientInfo.contact,
        doctorPhone: doctorInfo.contact,
      });
      return ref.id;
    } catch (err) {
      console.error("Error creating call log:", err);
      return null;
    }
  };

  const updateCallLog = async (updates: Partial<CallLog>) => {
    if (!callLogId) return;
    try {
      await updateDoc(doc(db, "callLogs", callLogId), updates);
    } catch (err) {
      console.error("Error updating call log:", err);
    }
  };

  const startCall = async () => {
    try {
      if (!doctorInfo.isAvailable) {
        setToastMessage("Doctor is currently unavailable");
        setShowToast(true);
        return;
      }
      await initializeTwilio();
      setCallStatus("calling");
      setError("");
      await createCallLog("initiated");

      const connection = await twilioServiceAlternative.makeCall(
        doctorInfo.contact,
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
      connection?.on("error", async (e: any) => {
        setError(e.message || "Call failed");
        setCallStatus("error");
        await updateCallLog({
          status: "failed",
          endTime: serverTimestamp() as Timestamp,
          notes: e.message,
        });
      });
    } catch (err: any) {
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
      const next = !isMuted;
      twilioServiceAlternative["connection"].mute(next);
      setIsMuted(next);
    }
  };

  const cleanupCall = () => {
    try {
      twilioServiceAlternative.disconnectCall();
    } catch (_) {}
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
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
  };

  const startRingtone = () => {
    if (ringtoneRef.current.timer) return;
    try {
      if (!ringtoneRef.current.ctx)
        ringtoneRef.current.ctx = new AudioContext();
      const ctx = ringtoneRef.current.ctx;
      ringtoneRef.current.timer = setInterval(() => {
        const oA = ctx.createOscillator(),
          oB = ctx.createOscillator(),
          gain = ctx.createGain();
        oA.type = "sine";
        oA.frequency.setValueAtTime(520, ctx.currentTime);
        oB.type = "sine";
        oB.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        oA.connect(gain);
        oB.connect(gain);
        gain.connect(ctx.destination);
        oA.start();
        oB.start();
        oA.stop(ctx.currentTime + 0.42);
        oB.stop(ctx.currentTime + 0.42);
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

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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
        return doctorInfo.specialization || "Doctor";
    }
  };

  const isActive =
    callStatus === "calling" ||
    callStatus === "ringing" ||
    callStatus === "connected";

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
            <p>Loading doctor information...</p>
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
              >
                <IonIcon icon={personAddOutline} />
              </button>
            </div>

            <div className="wa-caller-info">
              <h2 className="wa-caller-name">{doctorInfo.name}</h2>
              <p className="wa-call-status">
                {callStatus === "connected"
                  ? formatDuration(callDuration)
                  : getStatusMessage()}
              </p>
            </div>

            <div className="wa-avatar-wrap">
              <div
                className="wa-avatar"
                style={{ background: avatarColor(doctorInfo.name) }}
              >
                {doctorInfo.avatarUrl ? (
                  <img src={doctorInfo.avatarUrl} alt={doctorInfo.name} />
                ) : (
                  doctorInfo.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>
            </div>

            <div className="wa-bottom-controls">
              <button
                className="wa-control-btn"
                type="button"
                aria-label="More options"
                onClick={() => {
                  setToastMessage("More options coming soon");
                  setShowToast(true);
                }}
              >
                <IonIcon icon={ellipsisHorizontal} />
              </button>
              <button
                className="wa-control-btn"
                type="button"
                aria-label="Switch to video"
                onClick={async () => {
                  await endCall();
                  onSwitchToVideo?.();
                }}
              >
                <IonIcon icon={videocam} />
              </button>
              <button
                className={`wa-control-btn ${isSpeakerOn ? "active" : ""}`}
                type="button"
                aria-label="Toggle speaker"
                onClick={() => setIsSpeakerOn((p) => !p)}
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
              {isActive ? (
                <button
                  className="wa-control-btn wa-end-btn"
                  type="button"
                  aria-label="End call"
                  onClick={endCall}
                >
                  <IonIcon icon={callOutline} />
                </button>
              ) : (
                <button
                  className="wa-control-btn wa-start-btn"
                  type="button"
                  aria-label="Start call"
                  onClick={startCall}
                  disabled={!doctorInfo.contact || !doctorInfo.isAvailable}
                >
                  <IonIcon icon={call} />
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
