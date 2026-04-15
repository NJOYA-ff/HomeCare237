// components/VideoChatModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  IonModal,
  IonContent,
  IonSpinner,
  IonAlert,
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
import { connect, Room, LocalVideoTrack, LocalAudioTrack } from "twilio-video";
import "./Videochat.scss";
interface VideoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  token: string;
}

const VideoChatModal: React.FC<VideoChatModalProps> = ({
  isOpen,
  onClose,
  roomName,
  token,
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [localTracks, setLocalTracks] = useState<
    (LocalVideoTrack | LocalAudioTrack)[]
  >([]);
  const [remoteParticipants, setRemoteParticipants] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isEffectsOn, setIsEffectsOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>(
    {}
  );
  const ringtoneRef = useRef<{ ctx: AudioContext | null; timer: any }>({
    ctx: null,
    timer: null,
  });

  // Cleanup function
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
      localTracks.forEach((track) => {
        track.stop();
      });
      stopRingtone();
    };
  }, []);

  // Connect to room when modal opens
  useEffect(() => {
    if (isOpen && token) {
      connectToRoom();
    } else {
      disconnectFromRoom();
    }
  }, [isOpen, token]);

  useEffect(() => {
    const shouldRing = isOpen && !room && !error;
    if (shouldRing) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [isOpen, room, error]);

  const connectToRoom = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get local media tracks
      const tracks = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      });

      const videoTrack = Array.from(tracks.getVideoTracks())[0];
      const audioTrack = Array.from(tracks.getAudioTracks())[0];

      const localVideoTrack = new LocalVideoTrack(videoTrack);
      const localAudioTrack = new LocalAudioTrack(audioTrack);

      const tracksArray = [localVideoTrack, localAudioTrack];
      setLocalTracks(tracksArray);

      // Attach local video track
      if (localVideoRef.current) {
        localVideoTrack.attach(localVideoRef.current);
      }

      // Connect to the room
      const room = await connect(token, {
        name: roomName,
        tracks: tracksArray,
      });

      setRoom(room);

      // Handle remote participants
      room.participants.forEach(participantConnected);
      room.on("participantConnected", participantConnected);
      room.on("participantDisconnected", participantDisconnected);
      room.on("disconnected", handleRoomDisconnection);
    } catch (err) {
      console.error("Failed to connect to room:", err);
      setError(
        "Failed to connect to video call. Please check your permissions and try again."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const participantConnected = (participant: any) => {
    setRemoteParticipants((prev) => [...prev, participant]);

    participant.tracks.forEach((publication: any) => {
      if (publication.isSubscribed) {
        trackSubscribed(publication.track, participant);
      }
    });

    participant.on("trackSubscribed", (track: any) =>
      trackSubscribed(track, participant)
    );
    participant.on("trackUnsubscribed", trackUnsubscribed);
  };

  const participantDisconnected = (participant: any) => {
    setRemoteParticipants((prev) => prev.filter((p) => p !== participant));
  };

  const trackSubscribed = (track: any, participant: any) => {
    const videoElement = remoteVideoRefs.current[participant.sid];
    if (videoElement && track.kind === "video") {
      track.attach(videoElement);
    }
  };

  const trackUnsubscribed = (track: any) => {
    track.detach();
  };

  const handleRoomDisconnection = () => {
    setRoom(null);
    setRemoteParticipants([]);
    localTracks.forEach((track) => track.stop());
    setLocalTracks([]);
  };

  const disconnectFromRoom = () => {
    if (room) {
      room.disconnect();
    }
    localTracks.forEach((track) => track.stop());
    setLocalTracks([]);
    setRoom(null);
    setRemoteParticipants([]);
  };

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

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  const toggleEffects = () => {
    setIsEffectsOn((prev) => !prev);
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

  const setRemoteVideoRef = (
    node: HTMLVideoElement | null,
    participantSid: string
  ) => {
    remoteVideoRefs.current[participantSid] = node;
  };

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={onClose}
        className="video-chat-modal"
      >
        <IonContent className="video-content">
          {isConnecting && (
            <div className="connecting-overlay">
              <IonSpinner name="crescent" />
              <p>Connecting to video call...</p>
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
                      {(roomName || "User")
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
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
                {isVideoOff && <div className="video-off-mask"></div>}
              </div>

              <div className="call-header">
                <h2 className="caller-name">
                  {remoteParticipants[0]?.identity || roomName}
                </h2>
                <p className="call-status">
                  {room ? "In call" : isConnecting ? "Connecting..." : "Ringing..."}
                </p>
              </div>

              <div className="right-rail">
                <button className="rail-btn" type="button" aria-label="Add user">
                  <FiUserPlus />
                </button>
                <button
                  className="rail-btn"
                  type="button"
                  aria-label="Switch camera"
                >
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

      <IonAlert
        isOpen={!!error}
        onDidDismiss={() => setError(null)}
        header="Connection Error"
        message={error || "An error occurred"}
        buttons={[
          {
            text: "Retry",
            handler: connectToRoom,
          },
          {
            text: "Cancel",
            role: "cancel",
          },
        ]}
      />
    </>
  );
};

export default VideoChatModal;
