// components/VideoChatModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonButtons,
  IonSpinner,
  IonAlert,
} from "@ionic/react";
import { call, mic, micOff, videocam, videocamOff } from "ionicons/icons";
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>(
    {}
  );

  // Cleanup function
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
      localTracks.forEach((track) => {
        track.stop();
      });
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
        <IonHeader>
          <IonToolbar>
            <IonTitle>Video Call - {roomName}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="video-content">
          {isConnecting && (
            <div className="connecting-overlay">
              <IonSpinner name="crescent" />
              <p>Connecting to video call...</p>
            </div>
          )}

          <div className="video-container">
            {/* Remote Videos */}
            <div className="remote-videos-container">
              {remoteParticipants.map((participant) => (
                <div key={participant.sid} className="remote-video-wrapper">
                  <video
                    ref={(node) => setRemoteVideoRef(node, participant.sid)}
                    autoPlay
                    playsInline
                    className="remote-video"
                  />
                  <div className="participant-info">{participant.identity}</div>
                </div>
              ))}

              {remoteParticipants.length === 0 && !isConnecting && room && (
                <div className="waiting-overlay">
                  <IonSpinner name="crescent" />
                  <p>Waiting for others to join...</p>
                </div>
              )}
            </div>

            {/* Local Video */}
            <div className="local-video-container">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`local-video ${isVideoOff ? "video-off" : ""}`}
              />
              {isVideoOff && (
                <div className="video-off-overlay">
                  <IonIcon icon={videocamOff} size="large" />
                </div>
              )}
              <div className="local-video-controls">
                <IonButton
                  size="small"
                  fill="clear"
                  color={isMuted ? "danger" : "light"}
                  onClick={toggleMute}
                >
                  <IonIcon icon={isMuted ? micOff : mic} />
                </IonButton>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="call-controls">
            <IonButton
              shape="round"
              fill={"outline"}
              color={isMuted ? "danger" : "secondary"}
              onClick={toggleMute}
            >
              <IonIcon icon={isMuted ? micOff : mic} />
            </IonButton>

            <IonButton
              shape="round"
              fill={"outline"}
              color={isVideoOff ? "danger" : "secondary"}
              onClick={toggleVideo}
            >
              <IonIcon icon={isVideoOff ? videocamOff : videocam} />
            </IonButton>

            <IonButton
              shape="round"
              fill="outline"
              color="danger"
              onClick={endCall}
            >
              <IonIcon icon={call} />
            </IonButton>
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
