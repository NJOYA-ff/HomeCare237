import LoadingHelix from "../../components/LoadingHelix";
import { EmptyState } from "../../components/ui";
import { avatarColor } from "../../utils/avatarColor";
import React, { useState, useRef, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonLabel,
  IonItem,
  IonText,
  IonModal,
  IonButtons,
  IonTextarea,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonThumbnail,
  useIonViewWillEnter,
  useIonViewWillLeave,
  IonProgressBar,
  IonImg,
  useIonActionSheet,
  IonBackButton,
  IonFooter,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { useNotifications } from "../../context/NotificationContext";
import { sendPushNotification } from "../../utils/pushNotification";
import { db, auth, storage } from "../../firebaseconfig";
import {
  attach,
  close,
  play,
  image,
  pause,
  mic,
  checkmarkDone,
  checkmark,
  arrowBack,
  sendOutline,
  callOutline,
  videocamOutline,
  micOutline,
  downloadOutline,
  trashOutline,
  documentText,
  peopleOutline,
  chatbubblesOutline,
} from "ionicons/icons";
import { useIonToast } from "@ionic/react";
import "./Consult.scss";

// Firebase imports
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import AudioCallModal from "./AudioCallModal";
import VideoChatModal from "./VideoChat";

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Admin {
  id: string;
  name: string;
  email?: string;
  department?: string;
  online?: boolean;
  userId?: string;
}

interface Message {
  id: string;
  text: string;
  sender: "admin" | "doctor";
  senderId: string;
  timestamp: any;
  status: "sent" | "delivered" | "read";
  attachments?: Attachment[];
  chatId: string;
}

interface Attachment {
  id: string;
  type: "image" | "document" | "audio";
  url: string;
  name: string;
  storagePath?: string;
  duration?: number;
  uploadProgress?: number;
  isPlaying?: boolean;
  currentTime?: number;
}

interface ChatSession {
  id: string;
  doctorId: string;
  adminId: string;
  admin?: Admin;
  lastMessage?: string;
  lastMessageTime: any;
  unreadCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatMessageTime = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// ─── Component ─────────────────────────────────────────────────────────────────

const SMS_Admin: React.FC = () => {
  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Attachment | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [roomToken, setRoomToken] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isTyping] = useState(false);

  // ── Recording state ─────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLockRecord, setShowLockRecord] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [recordingAmplitude, setRecordingAmplitude] = useState<number[]>([]);
  const [showCancelRecording, setShowCancelRecording] = useState(false);
  const [recordingSlideX, setRecordingSlideX] = useState(0);

  // ── Firebase state ──────────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const amplitudeIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);
  const messageInputRef = useRef<HTMLIonTextareaElement>(null);
  const recordButtonRef = useRef<HTMLIonButtonElement>(null);
  const recordContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const messageListenerInitializedRef = useRef(false);
  const recordingStopActionRef = useRef<"send" | "cancel">("send");
  const recordingGestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastDeltaX: 0,
    lastDeltaY: 0,
    pointerId: 0,
    locked: false,
  });

  const [presentToast] = useIonToast();
  const [presentActionSheet] = useIonActionSheet();
  const { sendLocalNotification } = useNotifications();

  // ── Auth + initial data load ────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadAdmins();
        loadChatSessions(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const loadAdmins = async () => {
    try {
      const adminsRef = collection(db, "admins");
      const snapshot = await getDocs(adminsRef);
      const adminsData = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Admin[];
      setAdmins(adminsData);
    } catch (error) {
      console.error("Error loading admins:", error);
      presentToast({ message: "Failed to load admins", duration: 2000, color: "danger" });
    }
  };

  /** Listen to admin_chats where doctorId == current doctor's UID */
  const loadChatSessions = (doctorId: string) => {
    const chatsRef = collection(db, "admin_chats");
    const q = query(
      chatsRef,
      where("doctorId", "==", doctorId),
      orderBy("lastMessageTime", "desc"),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessions: ChatSession[] = [];

      for (const document of snapshot.docs) {
        const chatData = document.data();
        let adminData = chatData.admin;

        if (!adminData && chatData.adminId) {
          try {
            const adminDoc = await getDoc(doc(db, "admins", chatData.adminId));
            if (adminDoc.exists()) {
              adminData = { id: adminDoc.id, ...adminDoc.data() } as Admin;
            }
          } catch (error) {
            console.error("Error fetching admin data:", error);
          }
        }

        sessions.push({
          id: document.id,
          ...chatData,
          admin: adminData,
        } as ChatSession);
      }

      setChatSessions(sessions);
    });

    return unsubscribe;
  };

  // ── Messages listener ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedChat) return;

    const messagesRef = collection(db, "admin_chats", selectedChat.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    messageListenerInitializedRef.current = false;
    seenMessageIdsRef.current.clear();

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((d) => {
        messagesData.push({ id: d.id, ...d.data() } as Message);
      });

      if (!messageListenerInitializedRef.current) {
        messagesData.forEach((msg) => seenMessageIdsRef.current.add(msg.id));
        messageListenerInitializedRef.current = true;
      } else {
        messagesData.forEach(async (msg) => {
          if (!seenMessageIdsRef.current.has(msg.id) && msg.sender === "admin") {
            try {
              const adminName = selectedAdmin?.name || "Admin";
              const preview = msg.text || "(attachment)";
              const timestamp = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
              const timeStr = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              // Push notification to doctor when admin sends a message
              if (currentUser) {
                await sendPushNotification({
                  recipientId: currentUser.uid,
                  title: adminName,
                  body: preview,
                  data: { timestamp: timeStr, adminName, message: preview, chatId: selectedChat.id, type: "message" },
                });
              }
            } catch (e) {
              console.error("Notification error:", e);
            }
          }
          seenMessageIdsRef.current.add(msg.id);
        });
      }

      setMessages(messagesData);
      setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
    });

    return unsubscribe;
  }, [selectedChat, selectedAdmin, sendLocalNotification]);

  // ── Scroll on new messages ──────────────────────────────────────────────────

  useEffect(() => {
    if (contentRef.current && selectedChat) {
      setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
    }
  }, [messages, selectedChat]);

  // ── Ionic lifecycle ─────────────────────────────────────────────────────────

  useIonViewWillEnter(() => {});
  useIonViewWillLeave(() => {
    const activeElement = globalThis.document?.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    if (isRecording) stopRecordingWithoutSend();
    pauseAllAudio();
  });

  // ─── Select / create chat with an admin ────────────────────────────────────

  const handleSelectAdmin = async (admin: Admin) => {
    if (!currentUser) {
      presentToast({ message: "Please sign in first", duration: 2000, color: "danger" });
      return;
    }

    const existingChat = chatSessions.find((c) => c.adminId === admin.id);

    if (existingChat) {
      setSelectedChat(existingChat);
      setSelectedAdmin(admin);
    } else {
      try {
        const chatData = {
          doctorId: currentUser.uid,
          adminId: admin.id,
          admin: admin,
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          unreadCount: 0,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "admin_chats"), chatData);
        const newChat: ChatSession = {
          id: docRef.id,
          ...chatData,
          lastMessageTime: new Date(),
        };

        setSelectedChat(newChat);
        setSelectedAdmin(admin);

        // Opening greeting from doctor
        await addDoc(collection(db, "admin_chats", docRef.id, "messages"), {
          text: `Hello, I am a doctor reaching out to admin. Could you please assist me?`,
          sender: "doctor",
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          status: "sent",
          chatId: docRef.id,
        });
      } catch (error) {
        console.error("Error creating chat:", error);
        presentToast({ message: "Failed to start chat", duration: 2000, color: "danger" });
      }
    }
  };

  // ─── Send message ───────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if ((newMessage.trim() === "" && attachments.length === 0) || !selectedChat || !currentUser) return;

    setIsSending(true);
    try {
      const uploadedAttachments: Attachment[] = [];
      for (const att of attachments) {
        if (att.url.startsWith("blob:")) {
          uploadedAttachments.push(await uploadFile(att));
        } else {
          uploadedAttachments.push(att);
        }
      }

      const messageData: any = {
        text: newMessage,
        sender: "doctor",
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        status: "sent",
        chatId: selectedChat.id,
      };
      if (uploadedAttachments.length > 0) messageData.attachments = uploadedAttachments;

      await addDoc(collection(db, "admin_chats", selectedChat.id, "messages"), messageData);

      // Notify the admin that the doctor sent a message
      if (selectedAdmin) {
        sendPushNotification({
          recipientId: selectedAdmin.id,
          title: currentUser.displayName || "Doctor",
          body: newMessage || "(attachment)",
          data: { chatId: selectedChat.id, type: "message", senderId: currentUser.uid },
        }).catch((e) => console.warn("Failed to notify admin:", e));
      }

      const displayMessage =
        newMessage ||
        (attachments.length > 0
          ? attachments[0].type === "image" ? "Photo"
          : attachments[0].type === "audio" ? "Voice message"
          : "Document"
          : "");

      await updateDoc(doc(db, "admin_chats", selectedChat.id), {
        lastMessage: displayMessage,
        lastMessageTime: serverTimestamp(),
        unreadCount: (selectedChat.unreadCount ?? 0) + 1,
      });

      setNewMessage("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      presentToast({ message: "Failed to send message", duration: 2000, color: "danger" });
    } finally {
      setIsSending(false);
    }
  };

  // ─── File upload ────────────────────────────────────────────────────────────

  const uploadFile = (attachment: Attachment): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const storagePath = `admin_chats/${selectedChat?.id}/attachments/${attachment.id}_${attachment.name}`;
      const storageRef = ref(storage, storagePath);

      fetch(attachment.url)
        .then((res) => res.blob())
        .then((blob) => {
          const uploadTask = uploadBytesResumable(storageRef, blob);
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setAttachments((prev) =>
                prev.map((a) => (a.id === attachment.id ? { ...a, uploadProgress: progress } : a)),
              );
            },
            reject,
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({ ...attachment, url: downloadURL, storagePath, uploadProgress: 100 });
            },
          );
        })
        .catch(reject);
    });
  };

  const removeAttachment = (id: string) => {
    const att = attachments.find((a) => a.id === id);
    if (att) URL.revokeObjectURL(att.url);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ─── File / Photo picking ───────────────────────────────────────────────────

  const openAttachmentActionSheet = async () => {
    await presentActionSheet({
      buttons: [
        { text: "Photo & Video", icon: image, handler: handleTakePhoto },
        { text: "Document", icon: documentText, handler: () => fileInputRef.current?.click() },
        { text: "Cancel", role: "cancel" },
      ],
    });
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
      });
      if (!photo?.dataUrl) return;
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      const objectUrl = URL.createObjectURL(file);
      setAttachments((prev) => [
        ...prev,
        { id: Math.random().toString(36).substring(7), type: "image", url: objectUrl, name: file.name, isPlaying: false, currentTime: 0 },
      ]);
    } catch (error) {
      console.error("Camera error:", error);
      presentToast({ message: "Unable to take photo", duration: 2000, color: "danger" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const fileType = file.type.split("/")[0];
      let type: "image" | "document" | "audio" = "document";
      if (fileType === "image") type = "image";
      else if (fileType === "audio") type = "audio";
      setAttachments((prev) => [
        ...prev,
        { id: Math.random().toString(36).substring(7), type, url: URL.createObjectURL(file), name: file.name, isPlaying: false, currentTime: 0 },
      ]);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Recording ──────────────────────────────────────────────────────────────

  const CANCEL_THRESHOLD = -110;
  const LOCK_THRESHOLD = -90;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      setupRecordingStopHandler();
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingAmplitude([]);
      setRecordingSlideX(0);
      setShowCancelRecording(false);
      setShowLockRecord(true);
      setIsRecordingLocked(false);
      recordingStopActionRef.current = "send";

      recordingIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
      amplitudeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          setRecordingAmplitude((prev) => [...prev.slice(-50), Math.max(...dataArray) / 255]);
        }
      }, 100);
    } catch (error) {
      console.error("Recording error:", error);
      setAlertMessage("Microphone access is required for voice messages. Please allow microphone permissions and try again.");
      setShowAlert(true);
    }
  };

  const stopRecordingAndSend = async () => {
    if (mediaRecorderRef.current && isRecording) {
      recordingStopActionRef.current = "send";
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const stopRecordingWithoutSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      recordingStopActionRef.current = "cancel";
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const setupRecordingStopHandler = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.onstop = async () => {
      const stopAction = recordingStopActionRef.current;

      if (stopAction === "send" && selectedChat && currentUser) {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const attachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          type: "audio",
          url: audioUrl,
          name: `voice_note_${Date.now()}.webm`,
          duration: recordingTime,
          isPlaying: false,
          currentTime: 0,
        };
        const uploaded = await uploadFile(attachment);
        await addDoc(collection(db, "admin_chats", selectedChat.id, "messages"), {
          text: "",
          sender: "doctor",
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          status: "sent",
          chatId: selectedChat.id,
          attachments: [uploaded],
        });
        await updateDoc(doc(db, "admin_chats", selectedChat.id), {
          lastMessage: "Voice message",
          lastMessageTime: serverTimestamp(),
        });
        URL.revokeObjectURL(audioUrl);
      }

      setRecordingTime(0);
      setIsRecording(false);
      setIsRecordingLocked(false);
      setShowLockRecord(false);
      setShowCancelRecording(false);
      setRecordingSlideX(0);
      recordingGestureRef.current.active = false;
      recordingGestureRef.current.locked = false;
      recordingStopActionRef.current = "send";
      if (amplitudeIntervalRef.current) clearInterval(amplitudeIntervalRef.current);
      if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    };
  };

  const handleRecordPointerDown = async (e: React.PointerEvent<HTMLIonButtonElement>) => {
    if (newMessage.trim() !== "" || attachments.length > 0 || isRecording) return;
    recordingGestureRef.current = { active: true, startX: e.clientX, startY: e.clientY, lastDeltaX: 0, lastDeltaY: 0, pointerId: e.pointerId, locked: false };
    setShowCancelRecording(false);
    setShowLockRecord(true);
    setRecordingSlideX(0);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {
      // Best-effort only: hold-to-record still works without pointer capture.
      console.debug("Pointer capture unavailable:", err);
    }
    await startRecording();
  };

  const handleRecordPointerMove = (e: React.PointerEvent<HTMLIonButtonElement>) => {
    if (!recordingGestureRef.current.active || !isRecording || isRecordingLocked) return;
    const deltaX = e.clientX - recordingGestureRef.current.startX;
    const deltaY = e.clientY - recordingGestureRef.current.startY;
    recordingGestureRef.current.lastDeltaX = deltaX;
    recordingGestureRef.current.lastDeltaY = deltaY;
    setRecordingSlideX(Math.max(-120, Math.min(0, deltaX)));
    setShowCancelRecording(deltaX <= CANCEL_THRESHOLD);
    if (deltaY <= LOCK_THRESHOLD) {
      recordingGestureRef.current.locked = true;
      setIsRecordingLocked(true);
      setShowLockRecord(false);
      setShowCancelRecording(false);
      setRecordingSlideX(0);
    }
  };

  const handleRecordPointerUp = (e: React.PointerEvent<HTMLIonButtonElement>) => {
    if (!recordingGestureRef.current.active) return;
    recordingGestureRef.current.active = false;
    try { e.currentTarget.releasePointerCapture(recordingGestureRef.current.pointerId); } catch (err) {
      // Best-effort only: capture may already be gone when the gesture is cancelled.
      console.debug("Pointer release skipped:", err);
    }
    if (!isRecording) return;
    const shouldCancel = recordingGestureRef.current.lastDeltaX <= CANCEL_THRESHOLD || showCancelRecording;
    if (isRecordingLocked || recordingGestureRef.current.locked) return;
    if (shouldCancel) { stopRecordingWithoutSend(); } else { stopRecordingAndSend(); }
  };

  // ─── Audio playback ─────────────────────────────────────────────────────────

  const playAudio = (attachment: Attachment) => {
    if (!audioRef.current) audioRef.current = new Audio(attachment.url);
    else audioRef.current.src = attachment.url;

    audioRef.current.onloadedmetadata = () =>
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((a) =>
            a.id === attachment.id ? { ...a, isPlaying: true, duration: audioRef.current?.duration || 0 } : a,
          ),
        })),
      );

    audioRef.current.ontimeupdate = () =>
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((a) =>
            a.id === attachment.id ? { ...a, currentTime: audioRef.current?.currentTime || 0 } : a,
          ),
        })),
      );

    audioRef.current.onended = () =>
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((a) =>
            a.id === attachment.id ? { ...a, isPlaying: false, currentTime: 0 } : a,
          ),
        })),
      );

    audioRef.current.play();
  };

  const pauseAudio = (attachment: Attachment) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((a) => (a.id === attachment.id ? { ...a, isPlaying: false } : a)),
        })),
      );
    }
  };

  const pauseAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((a) => ({ ...a, isPlaying: false })),
        })),
      );
    }
  };

  // ─── Download ───────────────────────────────────────────────────────────────

  const downloadFile = async (attachment: Attachment) => {
    try {
      const link = window.document.createElement("a");
      link.href = attachment.url;
      link.download = attachment.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      presentToast({ message: `Downloading ${attachment.name}`, duration: 2000 });
    } catch (error) {
      presentToast({ message: "Failed to download file", duration: 2000, color: "danger" });
    }
  };

  // ─── Keyboard ───────────────────────────────────────────────────────────────

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleBack = () => {
    setSelectedAdmin(null);
    setSelectedChat(null);
    setAttachments([]);
    setNewMessage("");
    pauseAllAudio();
  };

  // ─── Render message ─────────────────────────────────────────────────────────

  const renderMessage = (msg: Message) => {
    const isDoctor = msg.sender === "doctor";

    return (
      <div
        key={msg.id}
        className={`message-wrapper ${isDoctor ? "doctor-wrapper" : "patient-wrapper"}`}
      >
        <div className={`message ${isDoctor ? "doctor-message-d" : "patient-message-d"}`}>
          <div className="message-content">
            {!isDoctor && (
              <div className="admin-badge">
                <IonChip color="warning">Admin</IonChip>
              </div>
            )}
            <p>{msg.text}</p>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="message-attachments">
                {msg.attachments.map((att, index: number) => (
                  <div key={att.id || `attachment-${index}`} className="attachment">
                    {att.type === "image" && (
                      <div
                        className="image-attachment"
                        onClick={() => { setSelectedImage(att.url); setShowImageModal(true); }}
                      >
                        <IonThumbnail><IonImg src={att.url} alt={att.name} /></IonThumbnail>
                        <div className="attachment-details">
                          <IonLabel>{att.name}</IonLabel>
                          <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); downloadFile(att); }}>
                            <IonIcon icon={downloadOutline} />
                          </IonButton>
                        </div>
                      </div>
                    )}
                    {att.type === "document" && (
                      <div
                        className="document-attachment"
                        onClick={() => { setSelectedDocument(att); setShowDocumentModal(true); }}
                      >
                        <IonIcon icon={documentText} size="large" />
                        <div className="attachment-details">
                          <IonLabel>{att.name}</IonLabel>
                          <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); downloadFile(att); }}>
                            <IonIcon icon={downloadOutline} />
                          </IonButton>
                        </div>
                      </div>
                    )}
                    {att.type === "audio" && (
                      <div className="audio-attachment">
                        <div className="audio-player">
                          <IonButton fill="clear" className="play-pause-btn" onClick={() => att.isPlaying ? pauseAudio(att) : playAudio(att)}>
                            <IonIcon icon={att.isPlaying ? pause : play} size="large" />
                          </IonButton>
                          <div className="audio-progress">
                            <IonProgressBar
                              value={att.currentTime && att.duration ? att.currentTime / att.duration : 0}
                              className="audio-progress-bar"
                            />
                            <div className="audio-time">
                              <span>{formatTime(att.currentTime || 0)} / {formatTime(att.duration || 0)}</span>
                            </div>
                          </div>
                          <IonButton fill="clear" size="small" className="download-btn" onClick={() => downloadFile(att)}>
                            <IonIcon icon={downloadOutline} />
                          </IonButton>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="message-meta">
            <span className="message-time">{formatMessageTime(msg.timestamp)}</span>
            {isDoctor && msg.status && (
              <IonIcon
                icon={msg.status === "read" ? checkmarkDone : checkmark}
                style={{
                  color: msg.status === "read" ? "var(--ion-color-tertiary)" : "var(--ion-color-medium)",
                  fontSize: "16px",
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading screen ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="loading-container">
            <LoadingHelix />
            <IonText>Loading...</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <IonPage className={`consult-page${selectedAdmin ? " chat-open" : ""}`}>
      {/* ── Header ── */}
      <IonHeader class="ion-no-border" className="consult-header">
        <IonToolbar>
          {selectedAdmin ? (
            <>
              <IonButtons slot="start">
                <IonButton onClick={handleBack}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <div className="patient-header-info">
                <div
                  className="initials-avatar header-avatar-c"
                  style={{ background: avatarColor(selectedAdmin.name) }}
                >
                  {selectedAdmin.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="header-details">
                  <IonTitle>{selectedAdmin.name}</IonTitle>
                  <IonText>
                    {selectedAdmin.online ? (
                      <span className="online-status">Online</span>
                    ) : (
                      <span className="last-seen">Admin</span>
                    )}
                  </IonText>
                </div>
              </div>
              <IonButtons slot="end">
                <IonButton className="call-button" onClick={() => setIsCallModalOpen(true)}>
                  <IonIcon icon={callOutline} />
                </IonButton>
                <IonButton
                  className="call-button"
                  onClick={() => { setRoomToken("room-" + Date.now()); setIsVideoModalOpen(true); }}
                >
                  <IonIcon icon={videocamOutline} />
                </IonButton>
              </IonButtons>
            </>
          ) : (
            <>
              <IonButtons slot="start">
                <IonBackButton defaultHref="/doc/dashboard" />
              </IonButtons>
              <IonTitle>Admin Messages</IonTitle>
            </>
          )}
        </IonToolbar>
      </IonHeader>

      {/* ── Content ── */}
      <IonContent ref={contentRef} className="consult-content">
        {!selectedAdmin ? (
          /* ── Admin list ── */
          <div className="wa-doctor-list">
            {admins.length === 0 ? (
              <EmptyState
                className="ion-margin"
                icon={peopleOutline}
                title="No admins available"
                description="You don't have any support contacts yet. Once an admin is assigned to you, they'll show up here."
              />
            ) : (
              admins.map((admin) => {
                const existingChat = chatSessions.find((c) => c.adminId === admin.id);
                const lastMsg = existingChat?.lastMessage || admin.department || "Admin";
                const lastTime = existingChat?.lastMessageTime
                  ? formatMessageTime(existingChat.lastMessageTime)
                  : "";
                const unread = existingChat?.unreadCount || 0;

                return (
                  <IonItem
                    key={admin.id}
                    className="wa-doctor-item"
                    button
                    lines="full"
                    onClick={() => handleSelectAdmin(admin)}
                  >
                    <div className="avatar-container-c" slot="start">
                      <div
                        className="initials-avatar wa-avatar"
                        style={{ background: avatarColor(admin.name) }}
                      >
                        {admin.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`wa-online-dot ${admin.online ? "online" : ""}`} />
                    </div>
                    <div className="wa-info">
                      <div className="wa-top">
                        <span className="wa-name">{admin.name}</span>
                        {lastTime && <span className="wa-time">{lastTime}</span>}
                      </div>
                      <div className="wa-meta">{admin.department || "Administration"}</div>
                      <div className="wa-bottom">
                        <span className="wa-preview">{lastMsg}</span>
                        {unread > 0 && <span className="wa-unread">{unread}</span>}
                      </div>
                    </div>
                  </IonItem>
                );
              })
            )}
          </div>
        ) : (
          /* ── Chat view ── */
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && (
                <EmptyState
                  className="ion-margin"
                  icon={chatbubblesOutline}
                  title="No messages yet"
                  description={`Start the conversation with ${selectedAdmin.name}. Messages and attachments are shared securely.`}
                />
              )}
              {messages.map((msg) => renderMessage(msg))}
              {isTyping && (
                <div className="typing-indicator">
                  <div
                    className="initials-avatar typing-avatar"
                    style={{ background: avatarColor(selectedAdmin.name) }}
                  >
                    {selectedAdmin.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="typing-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Hidden file input ── */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          multiple
          onChange={handleFileSelect}
        />

        {/* ── Image preview modal ── */}
        <IonModal
          isOpen={showImageModal}
          onDidDismiss={() => setShowImageModal(false)}
          className="image-preview-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Image Preview</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowImageModal(false)} className="modal-close-btn">
                  <IonIcon icon={close} />
                </IonButton>
                <IonButton
                  onClick={() =>
                    downloadFile({ id: "temp", type: "image", url: selectedImage, name: "image.jpg" } as Attachment)
                  }
                >
                  <IonIcon icon={downloadOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="image-container">
              <img src={selectedImage} alt="Preview" className="preview-image" />
            </div>
          </IonContent>
        </IonModal>

        {/* ── Document preview modal ── */}
        <IonModal
          isOpen={showDocumentModal}
          onDidDismiss={() => setShowDocumentModal(false)}
          className="document-preview-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedDocument?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDocumentModal(false)} className="modal-close-btn">
                  <IonIcon icon={close} />
                </IonButton>
                <IonButton onClick={() => selectedDocument && downloadFile(selectedDocument)}>
                  <IonIcon icon={downloadOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="document-container">
              {selectedDocument && (
                <iframe
                  src={selectedDocument.url}
                  title="Document preview"
                  width="100%"
                  height="100%"
                  className="document-iframe"
                >
                  <p>Your browser does not support PDF viewing. Please download the file to view it.</p>
                </iframe>
              )}
            </div>
          </IonContent>
        </IonModal>

                <MessageBox
          isOpen={showAlert}
          title="Microphone Access"
          message={alertMessage}
          tone="danger"
          actions={[
            {
              label: "OK",
              color: "primary",
              onClick: () => setShowAlert(false),
            },
          ]}
          onDismiss={() => setShowAlert(false)}
        />
      </IonContent>

      {/* ── Footer (message input) ── */}
      {selectedAdmin && (
        <IonFooter>
          <IonToolbar className="message-input-container1">
            <IonGrid className="message-input-container1">
              {attachments.length > 0 && (
                <div className="attachments-preview">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-preview">
                      {attachment.type === "image" && (
                        <>
                          <IonThumbnail>
                            <img src={attachment.url} alt={attachment.name} />
                          </IonThumbnail>
                          <div className="attachment-info">
                            <IonText>{attachment.name}</IonText>
                            {attachment.uploadProgress !== undefined && (
                              <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />
                            )}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn">
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </>
                      )}
                      {attachment.type === "document" && (
                        <>
                          <IonIcon icon={documentText} className="document-icon" />
                          <div className="attachment-info">
                            <IonText>{attachment.name}</IonText>
                            {attachment.uploadProgress !== undefined && (
                              <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />
                            )}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn">
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </>
                      )}
                      {attachment.type === "audio" && (
                        <>
                          <IonIcon icon={mic} className="audio-icon" />
                          <div className="attachment-info">
                            <IonText>Voice note ({formatTime(attachment?.duration || 0)})</IonText>
                            {attachment.uploadProgress !== undefined && (
                              <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />
                            )}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn">
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <IonGrid className="input-grid">
                {!isRecording ? (
                  <IonRow className="ion-align-items-center input-row">
                    <IonCol size="1" className="attachment-col">
                      <IonButton fill="clear" color="medium" onClick={openAttachmentActionSheet} className="attachment-btn">
                        <IonIcon icon={attach} color="primary" />
                      </IonButton>
                    </IonCol>
                    <IonCol size="10" className="text-input-col">
                      <IonItem lines="none" color="light">
                        <IonTextarea
                          ref={messageInputRef}
                          value={newMessage}
                          placeholder="Type a message to admin..."
                          onIonInput={(e) => setNewMessage(e.detail.value!)}
                          rows={1}
                          onKeyPress={handleKeyPress}
                          autoGrow
                          className="message-textarea"
                        />
                      </IonItem>
                    </IonCol>
                    <IonCol size="1" className="send-col">
                      {newMessage.trim() === "" && attachments.length === 0 ? (
                        <IonButton
                          ref={recordButtonRef}
                          fill="clear"
                          color="primary"
                          className="record-btn"
                          onPointerDown={handleRecordPointerDown}
                          onPointerMove={handleRecordPointerMove}
                          onPointerUp={handleRecordPointerUp}
                          onPointerCancel={handleRecordPointerUp}
                        >
                          <IonIcon icon={micOutline} />
                        </IonButton>
                      ) : (
                        <IonButton
                          fill="clear"
                          color="primary"
                          onClick={handleSendMessage}
                          disabled={isSending}
                          className="send-btn"
                        >
                          {isSending ? <LoadingHelix color="white" /> : <IonIcon icon={sendOutline} />}
                        </IonButton>
                      )}
                    </IonCol>
                  </IonRow>
                ) : (
                  <IonRow className="recording-row">
                    <IonCol size="12">
                      <div
                        className={`whatsapp-recording-bar ${showCancelRecording ? "cancel-ready" : ""}`}
                        ref={recordContainerRef}
                        style={{ transform: `translateX(${recordingSlideX}px)` }}
                      >
                        <div className="recording-left">
                          <span className="recording-live-dot"></span>
                          <IonIcon icon={mic} className="recording-mic" />
                          <IonText className="recording-time">{formatTime(recordingTime)}</IonText>
                        </div>
                        <div className="recording-wave">
                          {(recordingAmplitude.length > 0
                            ? recordingAmplitude
                            : [0.1, 0.25, 0.35, 0.5, 0.3, 0.2, 0.4]
                          ).map((amp, index) => (
                            <span
                              key={`wave-bar-${index}`}
                              className="recording-wave-bar"
                              style={{ height: `${Math.max(18, amp * 34)}px` }}
                            />
                          ))}
                          <IonText className="recording-slide-hint">
                            {showCancelRecording && !isRecordingLocked
                              ? "Release to cancel"
                              : isRecordingLocked
                              ? "Locked"
                              : showLockRecord
                              ? "Slide up to lock"
                              : "Slide left to cancel"}
                          </IonText>
                        </div>
                        <div className="recording-actions">
                          <IonButton
                            fill="clear"
                            color="danger"
                            className="recording-action-btn cancel"
                            onClick={stopRecordingWithoutSend}
                          >
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                          <IonButton
                            fill="solid"
                            color="primary"
                            className="recording-action-btn send"
                            onClick={stopRecordingAndSend}
                          >
                            <IonIcon icon={sendOutline} />
                          </IonButton>
                        </div>
                      </div>
                    </IonCol>
                  </IonRow>
                )}
              </IonGrid>
            </IonGrid>
          </IonToolbar>
        </IonFooter>
      )}

      {/* ── Call / Video modals ── */}
      <AudioCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        patientId={selectedAdmin?.id || ""}
        onSwitchToVideo={() => {
          setIsCallModalOpen(false);
          setRoomToken("room-" + Date.now());
          setIsVideoModalOpen(true);
        }
        }/>
      <VideoChatModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        roomName={roomToken}
        token={roomToken}
      />
    </IonPage>
  );
};

export default SMS_Admin;
