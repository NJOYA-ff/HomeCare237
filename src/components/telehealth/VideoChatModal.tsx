import LoadingHelix from "../LoadingHelix";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IonModal,
  IonContent,
} from "@ionic/react";
import {
  FiMoreHorizontal,
  FiUserPlus,
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
} from "react-icons/fi";
import { MdCameraswitch, MdAutoFixHigh } from "react-icons/md";
import { FaPhoneSlash, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { connect, Room, LocalVideoTrack, LocalAudioTrack, RemoteParticipant, RemoteTrackPublication } from "twilio-video";
import { auth } from "../../firebaseconfig";
import "./Videochat.scss";
import CallMessageBox from "./CallMessageBox";
import useCallConnectTimeout from "../hooks/useCallConnectTimeout";

export interface VideoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  token?: string;
  callerName?: string;
}

export const VideoChatModal: React.FC<VideoChatModalProps> = ({
  isOpen,
  onClose,
  roomName,
  token: initialToken,
  callerName,
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [localTracks, setLocalTracks] = useState<(LocalVideoTrack | LocalAudioTrack)[]>([]);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isEffectsOn, setIsEffectsOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Distinguishes "the connect attempt ran out of time" from an error Twilio
     or the API actually raised. Both open the same box, but they read
     differently and lead to different retry expectations — see
     useCallConnectTimeout for why a timeout is needed here at all. */
  const [timedOut, setTimedOut] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const ringtoneRef = useRef<{ ctx: AudioContext | null; timer: any }>({
    ctx: null,
    timer: null,
  });

  // Live Twilio objects are mirrored in refs so that `connectToRoom` /
  // `disconnectFromRoom` can stay referentially stable.  When they were read
  // from state they had to be listed as dependencies of the unmount effect,
  // which made its cleanup run on every state change and call
  // `setLocalTracks([])` with a brand-new array again -> endless re-render
  // ("Maximum update depth exceeded").
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<(LocalVideoTrack | LocalAudioTrack)[]>([]);
  // Bumped on every connect attempt, so async work can tell whether it is still
  // the current attempt (the modal may have been closed or the call retried).
  const connectAttemptRef = useRef(0);
  const isConnectingRef = useRef(false);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current.timer) {
      clearInterval(ringtoneRef.current.timer);
      ringtoneRef.current.timer = null;
    }
    if (ringtoneRef.current.ctx) {
      ringtoneRef.current.ctx.close().catch(() => {});
      ringtoneRef.current.ctx = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (ringtoneRef.current.timer) return;

    try {
      if (!ringtoneRef.current.ctx) {
        ringtoneRef.current.ctx = new AudioContext();
      }

      const ctx = ringtoneRef.current.ctx;
      ringtoneRef.current.timer = setInterval(() => {
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.36);
      }, 800);
    } catch (err) {
      console.warn("Ringtone error:", err);
    }
  }, []);

  const fetchJwtToken = useCallback(async (targetRoom: string): Promise<string> => {
    const apiBase =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, "")
        : "");

    const identity = auth.currentUser?.email || auth.currentUser?.uid || `user_${Date.now()}`;
    const response = await fetch(`${apiBase}/api/twilio/video-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, roomName: targetRoom }),
    });

    if (!response.ok) {
      throw new Error(`Failed to obtain video token: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error("No token returned from server");
    }
    return data.token;
  }, []);

  const trackSubscribed = useCallback((track: any, participant: RemoteParticipant) => {
    const videoElement = remoteVideoRefs.current[participant.sid];
    if (videoElement && track.kind === "video") {
      track.attach(videoElement);
    }
  }, []);

  const trackUnsubscribed = useCallback((track: any) => {
    track.detach();
  }, []);

  const participantConnected = useCallback(
    (participant: RemoteParticipant) => {
      setRemoteParticipants((prev) => [...prev.filter((p) => p.sid !== participant.sid), participant]);

      participant.tracks.forEach((publication: RemoteTrackPublication) => {
        if (publication.isSubscribed && publication.track) {
          trackSubscribed(publication.track, participant);
        }
      });

      participant.on("trackSubscribed", (track: any) =>
        trackSubscribed(track, participant)
      );
      participant.on("trackUnsubscribed", trackUnsubscribed);
    },
    [trackSubscribed, trackUnsubscribed]
  );

  const participantDisconnected = useCallback((participant: RemoteParticipant) => {
    setRemoteParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
  }, []);

  // Stop and forget every local track.  The state updater returns the previous
  // array when it is already empty, so React can bail out of the re-render
  // instead of receiving a fresh `[]` on every call.
  const stopLocalTracks = useCallback(() => {
    localTracksRef.current.forEach((track) => track.stop());
    localTracksRef.current = [];
    setLocalTracks((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const clearRemoteParticipants = useCallback(() => {
    setRemoteParticipants((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const handleRoomDisconnection = useCallback(() => {
    roomRef.current = null;
    setRoom(null);
    clearRemoteParticipants();
    stopLocalTracks();
  }, [clearRemoteParticipants, stopLocalTracks]);

  const disconnectFromRoom = useCallback(() => {
    // Invalidate any in-flight connect attempt so it cannot publish a room that
    // is no longer wanted.
    connectAttemptRef.current += 1;
    isConnectingRef.current = false;

    const activeRoom = roomRef.current;
    roomRef.current = null;
    if (activeRoom) {
      activeRoom.disconnect();
    }

    stopLocalTracks();
    setRoom(null);
    clearRemoteParticipants();
  }, [stopLocalTracks, clearRemoteParticipants]);

  const connectToRoom = useCallback(async () => {
    // Never open a second room while one is live or still being negotiated.
    if (isConnectingRef.current || roomRef.current) {
      return;
    }
    isConnectingRef.current = true;
    const attempt = ++connectAttemptRef.current;

    try {
      setIsConnecting(true);
      setError(null);
      /* Each retry is a fresh attempt, so it must clear the previous attempt's
         timeout verdict — otherwise a later real failure would still be
         reported as a timeout and show the clock icon. */
      setTimedOut(false);

      // Determine valid JWT token: if initialToken is a placeholder or empty, fetch a real one
      let jwt = initialToken;
      const isPlaceholder = !jwt || jwt.startsWith("mock-") || jwt.startsWith("room-");
      if (isPlaceholder) {
        try {
          jwt = await fetchJwtToken(roomName || `room_${Date.now()}`);
        } catch (fetchErr: any) {
          console.warn("[VideoChatModal] Could not fetch server token:", fetchErr);
          // If server is not running or Twilio is not configured, show clear diagnostic
          if (attempt === connectAttemptRef.current) {
            setError(
              "Video server token could not be obtained. Please ensure the HomeCare237 API server is running."
            );
          }
          return;
        }
      }

      if (attempt !== connectAttemptRef.current) {
        return;
      }

      // Get local media tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      });

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      const localVideoTrack = new LocalVideoTrack(videoTrack);
      const localAudioTrack = new LocalAudioTrack(audioTrack);
      const tracksArray = [localVideoTrack, localAudioTrack];

      // The modal was closed while we were waiting for device permissions:
      // release what we just acquired instead of leaking the camera/mic.
      if (attempt !== connectAttemptRef.current) {
        tracksArray.forEach((track) => track.stop());
        return;
      }

      localTracksRef.current = tracksArray;
      setLocalTracks(tracksArray);

      if (localVideoRef.current) {
        localVideoTrack.attach(localVideoRef.current);
      }

      // Connect to Twilio Video room
      const connectedRoom = await connect(jwt!, {
        name: roomName || "consultation",
        tracks: tracksArray,
      });

      if (attempt !== connectAttemptRef.current) {
        connectedRoom.disconnect();
        tracksArray.forEach((track) => track.stop());
        return;
      }

      roomRef.current = connectedRoom;
      setRoom(connectedRoom);

      connectedRoom.participants.forEach(participantConnected);
      connectedRoom.on("participantConnected", participantConnected);
      connectedRoom.on("participantDisconnected", participantDisconnected);
      connectedRoom.on("disconnected", handleRoomDisconnection);
    } catch (err: any) {
      console.error("[VideoChatModal] Failed to connect to room:", err);
      if (attempt === connectAttemptRef.current) {
        if (roomRef.current) {
          roomRef.current.disconnect();
          roomRef.current = null;
        }
        stopLocalTracks();
        setError(err?.message || "Failed to connect to video call. Please check device permissions.");
      }
    } finally {
      if (attempt === connectAttemptRef.current) {
        isConnectingRef.current = false;
        setIsConnecting(false);
      }
    }
  }, [
    initialToken,
    roomName,
    fetchJwtToken,
    participantConnected,
    participantDisconnected,
    handleRoomDisconnection,
    stopLocalTracks,
  ]);

  // Connect when modal opens, hang up when it closes
  useEffect(() => {
    if (isOpen) {
      connectToRoom();
    } else {
      disconnectFromRoom();
    }
  }, [isOpen, connectToRoom, disconnectFromRoom]);

  /* Armed only while a connect is genuinely in flight AND nothing has gone
     wrong yet. A raised error clears `isConnecting` on its own, so this cannot
     fire on top of one; and it disarms the moment a room exists, so a healthy
     call is never timed out by a late timer.
     On firing, this tears the attempt down before surfacing the box: leaving a
     half-open getUserMedia or a pending connect() would keep the camera light
     on behind a dialog asking whether to try again. */
  useCallConnectTimeout(
    isOpen && isConnecting && !error && !room,
    () => {
      console.warn("[VideoChatModal] Connect attempt timed out");
      connectAttemptRef.current++;
      disconnectFromRoom();
      setTimedOut(true);
      setIsConnecting(false);
      setError(
        "The video call did not connect in time. This is usually a slow or dropped connection — try again, or cancel to go back."
      );
    },
  );

  // Ringtone handling
  useEffect(() => {
    const shouldRing = isOpen && !room && !error && !isConnecting;
    if (shouldRing) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [isOpen, room, error, isConnecting, startRingtone, stopRingtone]);

  // Cleanup on unmount.  Both callbacks are referentially stable, so this effect
  // only runs once (it used to re-run on every render, tearing down the live
  // call and looping forever).
  useEffect(() => {
    return () => {
      disconnectFromRoom();
      stopRingtone();
    };
  }, [disconnectFromRoom, stopRingtone]);

  const toggleMute = () => {
    localTracks.forEach((track) => {
      if (track.kind === "audio") {
        if (track.isEnabled) {
          track.disable();
        } else {
          track.enable();
        }
      }
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localTracks.forEach((track) => {
      if (track.kind === "video") {
        if (track.isEnabled) {
          track.disable();
        } else {
          track.enable();
        }
      }
    });
    setIsVideoOff(!isVideoOff);
  };

  const endCall = () => {
    disconnectFromRoom();
    onClose();
  };

  /* Cancel on the message box dismisses the BOX, not this screen. The audio
     screens behave the same way — they drop back to a ready-to-dial state — and
     a dismiss action that also closes the screen would be a different action
     wearing the same label.

     The attempt is still torn down: a half-open getUserMedia or a pending
     connect() would otherwise leave the camera light on behind a box that is
     no longer there. `disconnectFromRoom` bumps the attempt counter, so
     anything still in flight knows it is no longer wanted and releases what it
     acquired. The end-call button remains the way out of this screen. */
  const dismissError = () => {
    disconnectFromRoom();
    setIsConnecting(false);
    setTimedOut(false);
    setError(null);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  const toggleEffects = () => {
    setIsEffectsOn((prev) => !prev);
  };

  const setRemoteVideoRef = (node: HTMLVideoElement | null, participantSid: string) => {
    remoteVideoRefs.current[participantSid] = node;
  };

  const displayName = callerName || remoteParticipants[0]?.identity || roomName || "Teleconsultation";

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={endCall}
        backdropDismiss={false}
        className="video-chat-modal"
      >
        <IonContent className="video-content">
          {isConnecting && (
            <div className="connecting-overlay">
              <LoadingHelix />
              <p>Connecting to secure video call...</p>
            </div>
          )}
          <div className="whatsapp-video-shell">
            <div className="whatsapp-video-stage">
              <div className="remote-stage">
                {remoteParticipants.map((participant) => (
                  <div key={participant.sid} className="remote-video-wrapper">
                    <video
                      ref={(node) => setRemoteVideoRef(node, participant.sid)}
                      autoPlay
                      playsInline
                      className="remote-video"
                    />
                  </div>
                ))}

                {remoteParticipants.length === 0 && !isConnecting && (
                  <div className="remote-placeholder">
                    <div className="remote-avatar">
                      {displayName
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="local-preview">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`local-video ${isVideoOff ? "video-off" : ""}`}
                />
                {isVideoOff && <div className="video-off-mask" />}
              </div>

              <div className="call-header">
                <h2 className="caller-name">{displayName}</h2>
                <p className="call-status">
                  {room ? "In Call" : isConnecting ? "Connecting..." : "Ringing..."}
                </p>
              </div>

              <div className="right-rail">
                <button className="rail-btn" type="button" aria-label="Add user">
                  <FiUserPlus />
                </button>
                <button className="rail-btn" type="button" aria-label="Switch camera">
                  <MdCameraswitch />
                </button>
                <button
                  className={`rail-btn ${isEffectsOn ? "active" : ""}`}
                  type="button"
                  aria-label="Effects"
                  onClick={toggleEffects}
                >
                  <MdAutoFixHigh />
                </button>
              </div>
            </div>

            <div className="bottom-controls">
              <button className="control-btn" type="button" aria-label="More">
                <FiMoreHorizontal />
              </button>
              <button
                className={`control-btn ${isVideoOff ? "danger" : ""}`}
                type="button"
                aria-label="Toggle video"
                onClick={toggleVideo}
              >
                {isVideoOff ? <FiVideoOff /> : <FiVideo />}
              </button>
              <button
                className="control-btn speaker"
                type="button"
                aria-label="Toggle speaker"
                onClick={toggleSpeaker}
              >
                {isSpeakerOn ? <FaVolumeUp /> : <FaVolumeMute />}
              </button>
              <button
                className={`control-btn ${isMuted ? "danger" : ""}`}
                type="button"
                aria-label="Toggle microphone"
                onClick={toggleMute}
              >
                {isMuted ? <FiMicOff /> : <FiMic />}
              </button>
              <button
                className="control-btn end"
                type="button"
                aria-label="End call"
                onClick={endCall}
              >
                <FaPhoneSlash />
              </button>
            </div>
          </div>
        </IonContent>
      </IonModal>

      {/* Call failures open the dedicated message box, not a second modal —
          see CallMessageBox for why a nested ion-modal is the wrong shape over
          a call screen. */}
      <CallMessageBox
        isOpen={!!error}
        timedOut={timedOut}
        title={timedOut ? "Call timed out" : "Call not connected"}
        message={error || "An error occurred"}
        /* Try again re-dials with a fresh attempt and a fresh token; cancel
           dismisses the box and leaves this screen open, so neither action
           closes the call behind the user's back. */
        onRetry={connectToRoom}
        onCancel={dismissError}
      />
    </>
  );
};

export default VideoChatModal;
