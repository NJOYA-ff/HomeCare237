// src/services/WebRTCService.ts
import { Subject } from "rxjs";

export interface WebRTCUser {
  id: string;
  name: string;
  stream?: MediaStream;
}

export interface SignalMessage {
  type: "offer" | "answer" | "ice-candidate" | "hangup";
  sender: string;
  receiver: string;
  data?: any;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: any; // Would be replaced with your signaling server implementation
  private isCalling = false;
  private iceCandidates: RTCIceCandidate[] = [];

  public localStream$ = new Subject<MediaStream>();
  public remoteStream$ = new Subject<MediaStream>();
  public connectionState$ = new Subject<string>();
  public callEnded$ = new Subject<void>();

  constructor(private config: RTCConfiguration) {}

  async initialize() {
    try {
      // Initialize signaling channel (would connect to your backend)
      this.signalingChannel = this.createSignalingChannel();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.config);

      // Set up event handlers
      this.setupPeerConnectionListeners();

      // Get local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.localStream$.next(this.localStream);

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      throw error;
    }
  }

  private setupPeerConnectionListeners() {
    if (!this.peerConnection) return;

    // Handle incoming remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.remoteStream$.next(this.remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to signaling server
        this.sendSignal({
          type: "ice-candidate",
          sender: "current-user-id", // Would be replaced with actual user ID
          receiver: "remote-user-id", // Would be replaced with actual remote user ID
          data: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      this.connectionState$.next(state || "");

      if (state === "connected") {
        this.isCalling = true;
      } else if (state === "disconnected" || state === "failed") {
        this.hangUp();
      }
    };
  }

  async makeCall(remoteUserId: string) {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to signaling server
      this.sendSignal({
        type: "offer",
        sender: "current-user-id", // Would be replaced with actual user ID
        receiver: remoteUserId,
        data: offer,
      });

      this.isCalling = true;
    } catch (error) {
      console.error("Error making call:", error);
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit, remoteUserId: string) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer to signaling server
      this.sendSignal({
        type: "answer",
        sender: "current-user-id", // Would be replaced with actual user ID
        receiver: remoteUserId,
        data: answer,
      });

      this.isCalling = true;
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(answer);

      // Add any collected ICE candidates
      this.iceCandidates.forEach((candidate) => {
        this.peerConnection!.addIceCandidate(candidate);
      });
      this.iceCandidates = [];
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;

    try {
      if (this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(candidate);
      } else {
        // Store candidates if remote description isn't set yet
        this.iceCandidates.push(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  }

  hangUp() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.isCalling = false;
    this.callEnded$.next();

    // Send hangup signal
    this.sendSignal({
      type: "hangup",
      sender: "current-user-id", // Would be replaced with actual user ID
      receiver: "remote-user-id", // Would be replaced with actual remote user ID
    });
  }

  private createSignalingChannel() {
    // This would connect to your backend's signaling mechanism
    // For example, using Socket.io, WebSockets, or Firebase
    return {
      send: (message: SignalMessage) => {
        // Implementation for sending signals to backend
        console.log("Sending signal:", message);
      },
      onMessage: (callback: (message: SignalMessage) => void) => {
        // Implementation for receiving signals from backend
      },
    };
  }

  private sendSignal(message: SignalMessage) {
    if (this.signalingChannel) {
      this.signalingChannel.send(message);
    }
  }
}
