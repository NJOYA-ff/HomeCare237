import LoadingHelix from "../../components/LoadingHelix";
import React, { useState, useEffect, useRef } from "react";
import { IonModal, IonContent, IonIcon, IonToast } from "@ionic/react";
import {
  call, callOutline, micOff, mic, volumeHigh, volumeMute,
  videocam, ellipsisHorizontal, personAddOutline, contractOutline,
} from "ionicons/icons";
import { db, auth } from "../../firebaseconfig";
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { twilioServiceAlternative } from "../../components/Services/twilioService";
import { avatarColor } from "../../utils/avatarColor";
import CallMessageBox from "../../components/telehealth/CallMessageBox";
import useCallConnectTimeout from "../../components/hooks/useCallConnectTimeout";
import "../../components/telehealth/AudioCallModal.scss";

interface AudioCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;                          // doctorId or patientId
  targetCollection: "doctors" | "patients";  // which collection to fetch from
  onSwitchToVideo?: () => void;
}

interface TargetInfo {
  name: string;
  contact: string;
  specialty?: string;
  avatarUrl?: string;
}

interface CallLog {
  id: string; callerId: string; targetId: string;
  callerName: string; targetName: string;
  status: "initiated" | "ringing" | "connected" | "missed" | "completed" | "failed";
  startTime: Timestamp | null; endTime: Timestamp | null; duration: number; notes?: string;
}

const AudioCallModal: React.FC<AudioCallModalProps> = ({
  isOpen, onClose, targetId, targetCollection, onSwitchToVideo,
}) => {
  const [targetInfo, setTargetInfo] = useState<TargetInfo>({ name: "Loading...", contact: "" });
  const [adminName, setAdminName] = useState("");
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "ringing" | "connected" | "error">("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState("");
  /* Separates "the call ran out of time" from an error Twilio raised, so the
     message box can word and icon the two differently. */
  const [timedOut, setTimedOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [callLogId, setCallLogId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<{ ctx: AudioContext | null; timer: any }>({ ctx: null, timer: null });

  useEffect(() => {
    if (isOpen && targetId) { fetchTargetInfo(); fetchAdminInfo(); }
    return () => { cleanupCall(); stopRingtone(); };
  }, [isOpen, targetId]);

  useEffect(() => {
    if (isOpen && (callStatus === "calling" || callStatus === "ringing")) startRingtone();
    else stopRingtone();
  }, [isOpen, callStatus]);

  const fetchAdminInfo = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "admins", currentUser.uid));
    if (snap.exists()) {
      const d = snap.data();
      setAdminName(d?.name || d?.displayName || "Admin");
    }
  };

  const fetchTargetInfo = async () => {
    try {
      setIsLoading(true);
      const snap = await getDoc(doc(db, targetCollection, targetId));
      if (snap.exists()) {
        const d = snap.data();
        setTargetInfo({
          name: d?.name || d?.fullName || d?.displayName || (targetCollection === "doctors" ? "Doctor" : "Patient"),
          contact: d?.contact || d?.phone || "",
          specialty: d?.specialization || d?.specialty,
          avatarUrl: d?.profilePhoto || d?.photoURL || d?.image || d?.avatarUrl,
        });
      } else {
        const snap2 = await getDoc(doc(db, "users", targetId));
        if (snap2.exists()) {
          const d = snap2.data();
          setTargetInfo({
            name: d?.name || d?.displayName || (targetCollection === "doctors" ? "Doctor" : "Patient"),
            contact: d?.contact || d?.phone || "",
            avatarUrl: d?.profilePhoto || d?.photoURL,
          });
        } else {
          setToastMessage("Contact information not available");
          setShowToast(true);
        }
      }
    } catch (err) {
      console.error("Error fetching target info:", err);
      setToastMessage("Failed to load contact details");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const createCallLog = async (status: CallLog["status"]) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      const ref = doc(collection(db, "callLogs"));
      setCallLogId(ref.id);
      await setDoc(ref, {
        id: ref.id, callerId: currentUser.uid, targetId,
        callerName: adminName, targetName: targetInfo.name, status,
        startTime: status === "connected" ? serverTimestamp() : null,
        endTime: null, duration: 0,
      });
      return ref.id;
    } catch (err) { console.error("Error creating call log:", err); return null; }
  };

  const updateCallLog = async (updates: Partial<CallLog>) => {
    if (!callLogId) return;
    try { await updateDoc(doc(db, "callLogs", callLogId), updates); }
    catch (err) { console.error("Error updating call log:", err); }
  };

  const startCall = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Please log in to make a call");
      const token = await twilioServiceAlternative.getCallToken(`admin_${currentUser.uid}`);
      await twilioServiceAlternative.initialize(token);
      setCallStatus("calling");
      setError("");
      await createCallLog("initiated");

      const connection = await twilioServiceAlternative.makeCall(targetInfo.contact);
      connection?.on("ringing", async () => { setCallStatus("ringing"); await updateCallLog({ status: "ringing" }); });
      connection?.on("accept", async () => {
        setCallStatus("connected"); startTimer();
        await updateCallLog({ status: "connected", startTime: serverTimestamp() as Timestamp });
      });
      connection?.on("disconnect", async () => { await endCall(); });
      connection?.on("error", async (e: any) => {
        setError(e.message || "Call failed"); setCallStatus("error");
        await updateCallLog({ status: "failed", endTime: serverTimestamp() as Timestamp, notes: e.message });
      });
    } catch (err: any) {
      setError(err.message || "Failed to make call"); setCallStatus("error");
      setToastMessage("Call failed to initiate"); setShowToast(true);
    }
  };

  const endCall = async () => {
    try {
      twilioServiceAlternative.disconnectCall();
      if (callLogId && callStatus === "connected")
        await updateCallLog({ status: "completed", endTime: serverTimestamp() as Timestamp, duration: callDuration });
      else if (callLogId && (callStatus === "calling" || callStatus === "ringing"))
        await updateCallLog({ status: "missed", endTime: serverTimestamp() as Timestamp });
    } catch (err) { console.error("Error ending call:", err); }
    finally { stopRingtone(); cleanupCall(); onClose(); }
  };

  const toggleMute = () => {
    if (twilioServiceAlternative["connection"]) {
      const next = !isMuted;
      twilioServiceAlternative["connection"].mute(next);
      setIsMuted(next);
    }
  };

  const cleanupCall = () => {
    try { twilioServiceAlternative.disconnectCall(); } catch (_) { /* call already torn down */ }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCallDuration(0); setCallStatus("idle"); setError(""); setIsMuted(false); setIsSpeakerOn(true); setCallLogId("");
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
  };

  const startRingtone = () => {
    if (ringtoneRef.current.timer) return;
    try {
      if (!ringtoneRef.current.ctx) ringtoneRef.current.ctx = new AudioContext();
      const ctx = ringtoneRef.current.ctx;
      ringtoneRef.current.timer = setInterval(() => {
        const oA = ctx.createOscillator(), oB = ctx.createOscillator(), gain = ctx.createGain();
        oA.type = "sine"; oA.frequency.setValueAtTime(520, ctx.currentTime);
        oB.type = "sine"; oB.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        oA.connect(gain); oB.connect(gain); gain.connect(ctx.destination);
        oA.start(); oB.start(); oA.stop(ctx.currentTime + 0.42); oB.stop(ctx.currentTime + 0.42);
      }, 900);
    } catch (err) { console.warn("Ringtone blocked:", err); }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current.timer) { clearInterval(ringtoneRef.current.timer); ringtoneRef.current.timer = null; }
    if (ringtoneRef.current.ctx) { ringtoneRef.current.ctx.close(); ringtoneRef.current.ctx = null; }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getStatusMessage = () => {
    switch (callStatus) {
      case "calling": return "Calling...";
      case "ringing": return "Ringing...";
      case "connected": return "Call in progress";
      case "error": return "Call failed";
      default: return targetInfo.specialty || (targetCollection === "doctors" ? "Doctor" : "Patient");
    }
  };

  /** Records an unanswered call as missed WITHOUT closing the screen. The timeout
   *  path hangs up on its own, so it cannot go through `endCall` — that one is for
   *  a call the user deliberately ended and it dismisses the whole modal. */
  const markCallMissed = () => {
    if (!callLogId) return;
    void updateCallLog({ status: "missed", endTime: serverTimestamp() as Timestamp });
  };

  /** "Try again" on the message box: drop the failure and re-dial. */
  const retryCall = () => {
    setError("");
    /* A retry is a fresh attempt, so the previous timeout verdict must not
       survive into it — otherwise a later real failure would still be reported
       as a timeout and show the clock icon. */
    setTimedOut(false);
    setCallStatus("idle");
    void startCall();
  };

  /** "Cancel" on the message box: give up on this attempt and stay on screen.
   *  It has to hang up, not merely hide the box: a failure can land while the call
   *  is still ringing at the other end, and without the teardown it keeps ringing
   *  out for someone the user has walked away from, and the next "Try again" would
   *  open a second connection on top of the first. */
  const dismissError = () => {
    markCallMissed();
    cleanupCall();
    setTimedOut(false);
  };

  /* Armed only while the call is genuinely out and nobody has answered yet, and
     disarmed as soon as an error lands or the call connects. Without this the
     phone rings forever: Twilio raises nothing if the other end never picks up
     and the network stays nominally fine, so "calling"/"ringing" is a terminal
     state the user cannot otherwise escape. */
  useCallConnectTimeout(
    isOpen && (callStatus === "calling" || callStatus === "ringing") && !error,
    () => {
      console.warn("[AudioCallModal] Call was not answered in time");
      /* Hang the unanswered call up BEFORE the box appears, for the same reason
         `dismissError` does: a call left ringing here would still be ringing at
         the other end while the user is being asked whether to try again, and
         "Try again" would stack a second connection on top of it. */
      markCallMissed();
      cleanupCall();
      setTimedOut(true);
      /* Set after the teardown, which clears `error` on its way out. */
      setError(
        "Nobody answered in time. Check the number and your signal, then try again — or cancel to go back."
      );
    },
  );

  const isActive = callStatus === "calling" || callStatus === "ringing" || callStatus === "connected";

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose} backdropDismiss={false} className="audio-call-modal">
      <IonContent className="audio-call-content">
        {isLoading ? (
          <div className="loading-container">
            <LoadingHelix />
            <p>Loading information...</p>
          </div>
        ) : (
          <div className="wa-audio-shell">
            <div className="wa-top-actions">
              <button className="wa-top-btn" type="button" aria-label="Minimize" onClick={onClose}>
                <IonIcon icon={contractOutline} />
              </button>
              <button className="wa-top-btn" type="button" aria-label="Add participant">
                <IonIcon icon={personAddOutline} />
              </button>
            </div>

            <div className="wa-caller-info">
              <h2 className="wa-caller-name">{targetInfo.name}</h2>
              <p className="wa-call-status">
                {callStatus === "connected" ? formatDuration(callDuration) : getStatusMessage()}
              </p>
            </div>

            <div className="wa-avatar-wrap">
              <div className="wa-avatar" style={{ background: avatarColor(targetInfo.name) }}>
                {targetInfo.avatarUrl
                  ? <img src={targetInfo.avatarUrl} alt={targetInfo.name} />
                  : targetInfo.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
                }
              </div>
            </div>

            <div className="wa-bottom-controls">
              <button className="wa-control-btn" type="button" aria-label="More options"
                onClick={() => { setToastMessage("More options coming soon"); setShowToast(true);} }>
                <IonIcon icon={ellipsisHorizontal} />
              </button>
              <button className="wa-control-btn" type="button" aria-label="Switch to video"
                onClick={async () => { await endCall(); onSwitchToVideo?.();} }>
                <IonIcon icon={videocam} />
              </button>
              <button className={`wa-control-btn ${isSpeakerOn ? "active" : ""}`} type="button"
                aria-label="Toggle speaker" onClick={() => setIsSpeakerOn((p) => !p)}>
                <IonIcon icon={isSpeakerOn ? volumeHigh : volumeMute} />
              </button>
              <button className={`wa-control-btn ${isMuted ? "active" : ""}`} type="button"
                aria-label="Toggle mute" onClick={toggleMute} disabled={callStatus !== "connected"}>
                <IonIcon icon={isMuted ? micOff : mic} />
              </button>
              {isActive ? (
                <button className="wa-control-btn wa-end-btn" type="button" aria-label="End call" onClick={endCall}>
                  <IonIcon icon={callOutline} />
                </button>
              ) : (
                <button className="wa-control-btn wa-start-btn" type="button" aria-label="Start call"
                  onClick={startCall} disabled={!targetInfo.contact}>
                  <IonIcon icon={call} />
                </button>
              )}
            </div>
          </div>
        )}
      </IonContent>
      </IonModal>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={3000} position="top" />

      {/* Failures open the dedicated message box, not a second modal — see
          CallMessageBox for why a nested ion-modal is the wrong shape over a
          call screen. */}
      <CallMessageBox
        isOpen={!!error}
        timedOut={timedOut}
        title={timedOut ? "Call timed out" : "Call not connected"}
        message={error}
        /* Try again re-dials; cancel dismisses the box and leaves this screen on its
           ready-to-dial state, so the user is never trapped and never has the
           screen taken away from under them. */
        onRetry={retryCall}
        onCancel={dismissError}
      />
    </>
  );
};

export default AudioCallModal;
