import { avatarColor } from "../../utils/avatarColor";
import React, { useState, useRef, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonCardTitle,
  IonCardSubtitle,
  IonAvatar,
  IonButton,
  IonIcon,
  IonLabel,
  IonList,
  IonItem,
  IonText,
  IonModal,
  IonButtons,
  IonTextarea,
  IonChip,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonThumbnail,
  useIonViewWillEnter,
  useIonViewWillLeave,
  IonAlert,
  IonProgressBar,
  IonImg,
  useIonActionSheet,
  IonBackButton,
  IonFooter,
  IonBadge,
} from "@ionic/react";
import { useNotifications } from "../../context/NotificationContext";
import { db, auth, storage } from "../../firebaseconfig";
import {
  attach,
  star,
  location,
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
  call,
} from "ionicons/icons";
import { useIonToast } from "@ionic/react";
import "../Doctor/Consult.scss";
import downloadt from "@material-design-icons/svg/outlined/download.svg";

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
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import AudioCallModal from "./AudioCallModal";
import VideoChatModal from "./VideoChat";

// Updated interfaces for Firebase
interface Doctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  town: string;
  availability: string;
  image: string;
  languages: string[];
  yearsOfExperience: string;
  lastSeen: string;
  online: boolean;
  userId: string;
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
  doctor?: Doctor;
  lastMessage?: string;
  lastMessageTime: any;
  unreadCount: number;
}

// Helper function to format message time
const formatMessageTime = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Helper function to format time duration
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const SMS_doctor: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [roomToken, setRoomToken] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Attachment | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLockRecord, setShowLockRecord] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [recordingAmplitude, setRecordingAmplitude] = useState<number[]>([]);
  const [animateCards, setAnimateCards] = useState(false);
  const [showCancelRecording, setShowCancelRecording] = useState(false);
  const [recordingSlideX, setRecordingSlideX] = useState(0);

  // Firebase states
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  const [fileToUpload, setFileToUpload] = useState<{
    file: File | null;
    type: "image" | "document";
  }>({ file: null, type: "image" });

  // Firebase listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadDoctors();
        loadChatSessions(user.uid);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Load doctors from Firebase
  const loadDoctors = async () => {
    try {
      const doctorsRef = collection(db, "doctors");
      const doctorsSnapshot = await getDocs(doctorsRef);
      const doctorsData = doctorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Doctor[];
      setDoctors(doctorsData);
    } catch (error) {
      console.error("Error loading doctors:", error);
      presentToast({
        message: "Failed to load doctors",
        duration: 2000,
        color: "danger",
      });
    }
  };

  // Load chat sessions for current user
  const loadChatSessions = (userId: string) => {
    const chatsRef = collection(db, "admin_chats");
    const q = query(
      chatsRef,
      where("adminId", "==", userId),
      orderBy("lastMessageTime", "desc"),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessions: ChatSession[] = [];

      for (const document of snapshot.docs) {
        const chatData = document.data();
        let doctorData = chatData.doctor;

        // If doctor data is missing, fetch it from doctors collection
        if (!doctorData) {
          try {
            const doctorDoc = await getDoc(
              doc(db, "doctors", chatData.doctorId),
            );
            if (doctorDoc.exists()) {
              doctorData = doctorDoc.data() as Doctor;
              // Update the chat with doctor data
              await updateDoc(document.ref, { doctor: doctorData });
            }
          } catch (error) {
            console.error("Error fetching doctor data:", error);
          }
        }

        sessions.push({
          id: document.id,
          ...chatData,
          doctor: doctorData,
        } as ChatSession);
      }

      setChatSessions(sessions);
    });

    return unsubscribe;
  };

  // Load messages for selected chat
  useEffect(() => {
    if (selectedChat) {
      const messagesRef = collection(
        db,
        "admin_chats",
        selectedChat.id,
        "messages",
      );
      const q = query(messagesRef, orderBy("timestamp", "asc"));

      messageListenerInitializedRef.current = false;
      seenMessageIdsRef.current.clear();

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData: Message[] = [];
        snapshot.forEach((document) => {
          messagesData.push({
            id: document.id,
            ...document.data(),
          } as Message);
        });

        // On initial load, mark all messages as seen so we don't spam notifications
        if (!messageListenerInitializedRef.current) {
          messagesData.forEach((msg) => {
            seenMessageIdsRef.current.add(msg.id);
          });
          messageListenerInitializedRef.current = true;
        } else {
          // For new messages, send notification if from doctor
          messagesData.forEach((msg) => {
            if (
              !seenMessageIdsRef.current.has(msg.id) &&
              msg.sender === "doctor"
            ) {
              try {
                const doctorName = selectedDoctor?.name || "Doctor";
                const messagePreview = msg.text || "(attachment)";
                const timestamp =
                  msg.timestamp?.toDate?.() || new Date(msg.timestamp);
                const timeStr = timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Send local notification
                sendLocalNotification(doctorName, messagePreview, {
                  timestamp: timeStr,
                  doctorName,
                  message: messagePreview,
                  chatId: selectedChat.id,
                });
              } catch (error) {
                console.error("Failed to send notification:", error);
              }
            }
            seenMessageIdsRef.current.add(msg.id);
          });
        }

        setMessages(messagesData);

        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          contentRef.current?.scrollToBottom(300);
        }, 100);
      });

      return unsubscribe;
    }
  }, [selectedChat, selectedDoctor, sendLocalNotification]);

  const removeAttachment = (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (attachment) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openAttachmentActionSheet = async () => {
    await presentActionSheet({
      buttons: [
        {
          text: "Photo & Video",
          icon: image,
          handler: () => {
            handleTakePhoto();
          },
        },
        {
          text: "Document",
          icon: documentText,
          handler: () => {
            fileInputRef.current?.click();
          },
        },
        {
          text: "Cancel",
          role: "cancel",
        },
      ],
    });
  };

  useIonViewWillEnter(() => {
    setAnimateCards(true);
  });

  useIonViewWillLeave(() => {
    setAnimateCards(false);
    if (isRecording) {
      stopRecordingAndSend();
    }
    pauseAllAudio();
  });

  const downloadFile = async (attachment: Attachment) => {
    try {
      const link = window.document.createElement("a");
      link.href = attachment.url;
      link.download = attachment.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      presentToast({
        message: `Downloading ${attachment.name}`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Download error:", error);
      presentToast({
        message: "Failed to download file",
        duration: 2000,
        color: "danger",
      });
    }
  };

  useEffect(() => {
    if (contentRef.current && selectedChat) {
      setTimeout(() => {
        contentRef.current?.scrollToBottom(300);
      }, 100);
    }
  }, [messages, selectedChat]);

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchText.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchText.toLowerCase()),
  );

  const handleSelectDoctor = async (doctor: Doctor) => {
    if (!currentUser) {
      presentToast({
        message: "Please sign in to start a chat",
        duration: 2000,
        color: "danger",
      });
      return;
    }

    // Check if chat already exists
    const existingChat = chatSessions.find(
      (chat) => chat.doctorId === doctor.id,
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      setSelectedDoctor(doctor);
    } else {
      // Create new chat session
      try {
        const chatData = {
          doctorId: doctor.id,
          adminId: currentUser.uid,
          doctor: doctor,
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
        setSelectedDoctor(doctor);

        // Add initial message
        await addDoc(collection(db, "admin_chats", docRef.id, "messages"), {
          text: `Hi ${doctor.name}, this is your admin. How can I assist you today?`,
          sender: "admin",
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          status: "sent",
          chatId: docRef.id,
        });
      } catch (error) {
        console.error("Error creating chat:", error);
        presentToast({
          message: "Failed to start chat",
          duration: 2000,
          color: "danger",
        });
      }
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
      });

      if (!photo || !photo.dataUrl) return;

      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      const objectUrl = URL.createObjectURL(file);

      const attachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        type: "image",
        url: objectUrl,
        name: file.name,
        isPlaying: false,
        currentTime: 0,
      };

      setAttachments((prev) => [...prev, attachment]);
    } catch (error) {
      console.error("Camera error:", error);
      presentToast({
        message: "Unable to take photo",
        duration: 2000,
        color: "danger",
      });
    }
  };

  const handleSendMessage = async () => {
    if (
      (newMessage.trim() === "" && attachments.length === 0) ||
      !selectedChat ||
      !currentUser
    )
      return;

    setIsSending(true);

    try {
      // Upload attachments first
      const uploadedAttachments: Attachment[] = [];
      for (const attachment of attachments) {
        if (attachment.url.startsWith("blob:")) {
          const uploadedAttachment = await uploadFile(attachment);
          uploadedAttachments.push(uploadedAttachment);
        } else {
          uploadedAttachments.push(attachment);
        }
      }

      // Create message data
      const messageData: any = {
        text: newMessage,
        sender: "admin",
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        status: "sent",
        chatId: selectedChat.id,
      };

      if (uploadedAttachments.length > 0) {
        messageData.attachments = uploadedAttachments;
      }

      // Add message to Firestore
      await addDoc(
        collection(db, "admin_chats", selectedChat.id, "messages"),
        messageData,
      );

      // Update chat session with the actual message text
      const displayMessage =
        newMessage ||
        (attachments.length > 0
          ? attachments[0].type === "image"
            ? "Photo"
            : attachments[0].type === "audio"
            ? "Voice message"
            : "Document"
          : "");

      await updateDoc(doc(db, "admin_chats", selectedChat.id), {
        lastMessage: displayMessage,
        lastMessageTime: serverTimestamp(),
      });

      setNewMessage("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      presentToast({
        message: "Failed to send message",
        duration: 2000,
        color: "danger",
      });
    } finally {
      setIsSending(false);
    }
  };

  const uploadFile = async (attachment: Attachment): Promise<Attachment> => {
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
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setAttachments((prev) =>
                prev.map((att) =>
                  att.id === attachment.id
                    ? { ...att, uploadProgress: progress }
                    : att,
                ),
              );
            },
            (error) => {
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                ...attachment,
                url: downloadURL,
                storagePath: storagePath,
                uploadProgress: 100,
              });
            },
          );
        })
        .catch(reject);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const fileType = file.type.split("/")[0];
      let type: "image" | "document" | "audio" = "document";

      if (fileType === "image") type = "image";
      else if (fileType === "audio") type = "audio";
      else if (file.type === "application/pdf") type = "document";

      const attachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        type,
        url: URL.createObjectURL(file),
        name: file.name,
        isPlaying: false,
        currentTime: 0,
      };

      setAttachments((prev) => [...prev, attachment]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio context for amplitude visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
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

      // Recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Amplitude visualization
      amplitudeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount,
          );
          analyserRef.current.getByteFrequencyData(dataArray);
          const amplitude = Math.max(...dataArray) / 255;
          setRecordingAmplitude((prev) => [...prev.slice(-50), amplitude]);
        }
      }, 100);
    } catch (error) {
      console.error("Error starting recording:", error);
      setAlertMessage(
        "Microphone access is required for voice messages. Please allow microphone permissions and try again.",
      );
      setShowAlert(true);
    }
  };

  const stopRecordingAndSend = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const stopRecordingWithoutSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      recordingStopActionRef.current = "cancel";
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const setupRecordingStopHandler = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        const stopAction = recordingStopActionRef.current;

        if (stopAction === "send") {
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

          if (selectedChat && currentUser) {
            const uploadedAttachment = await uploadFile(attachment);

            await addDoc(collection(db, "admin_chats", selectedChat.id, "messages"), {
              text: "",
              sender: "admin",
              senderId: currentUser.uid,
              timestamp: serverTimestamp(),
              status: "sent",
              chatId: selectedChat.id,
              attachments: [uploadedAttachment],
            });

            await updateDoc(doc(db, "admin_chats", selectedChat.id), {
              lastMessage: "Voice message",
              lastMessageTime: serverTimestamp(),
            });
          }

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
    }
  };

  const CANCEL_THRESHOLD = -110;
  const LOCK_THRESHOLD = -90;

  const handleRecordPointerDown = async (e: React.PointerEvent<HTMLIonButtonElement>) => {
    if (newMessage.trim() !== "" || attachments.length > 0 || isRecording) return;
    recordingGestureRef.current = { active: true, startX: e.clientX, startY: e.clientY, lastDeltaX: 0, lastDeltaY: 0, pointerId: e.pointerId, locked: false };
    setShowCancelRecording(false);
    setShowLockRecord(true);
    setRecordingSlideX(0);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    await startRecording();
  };

  const handleRecordPointerMove = (e: React.PointerEvent<HTMLIonButtonElement>) => {
    if (!recordingGestureRef.current.active || !isRecording || isRecordingLocked) return;
    const deltaX = e.clientX - recordingGestureRef.current.startX;
    const deltaY = e.clientY - recordingGestureRef.current.startY;
    recordingGestureRef.current.lastDeltaX = deltaX;
    recordingGestureRef.current.lastDeltaY = deltaY;
    const clampedX = Math.max(-120, Math.min(0, deltaX));
    setRecordingSlideX(clampedX);
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
    try { e.currentTarget.releasePointerCapture(recordingGestureRef.current.pointerId); } catch (err) {}
    if (!isRecording) return;
    const shouldCancel = recordingGestureRef.current.lastDeltaX <= CANCEL_THRESHOLD || showCancelRecording;
    if (isRecordingLocked || recordingGestureRef.current.locked) return;
    if (shouldCancel) { stopRecordingWithoutSend(); } else { stopRecordingAndSend(); }
  };

  // Audio playback functions
  const playAudio = (attachment: Attachment) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(attachment.url);
    } else {
      audioRef.current.src = attachment.url;
    }

    audioRef.current.onloadedmetadata = () => {
      setAttachments((prev) =>
        prev.map((att) =>
          att.id === attachment.id
            ? {
                ...att,
                isPlaying: true,
                duration: audioRef.current?.duration || 0,
              }
            : att,
        ),
      );
    };

    audioRef.current.ontimeupdate = () => {
      setAttachments((prev) =>
        prev.map((att) =>
          att.id === attachment.id
            ? { ...att, currentTime: audioRef.current?.currentTime || 0 }
            : att,
        ),
      );
    };

    audioRef.current.onended = () => {
      setAttachments((prev) =>
        prev.map((att) =>
          att.id === attachment.id
            ? { ...att, isPlaying: false, currentTime: 0 }
            : att,
        ),
      );
    };

    audioRef.current.play();
  };

  const pauseAudio = (attachment: Attachment) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAttachments((prev) =>
        prev.map((att) =>
          att.id === attachment.id ? { ...att, isPlaying: false } : att,
        ),
      );
    }
  };

  const pauseAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAttachments((prev) =>
        prev.map((att) => ({ ...att, isPlaying: false })),
      );
    }
  };

  const renderMessage = (msg: Message) => {
    const isAdmin = msg.sender === "admin";

    return (
      <div
        key={msg.id}
        className={`message ${isAdmin ? "patient-message" : "doctor-message"}`}
      >
        <div className="message-content">
          <p>{msg.text}</p>
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="message-attachments">
              {msg.attachments.map((attachment: Attachment, index: number) => (
                <div key={index} className="attachment">
                  {attachment.type === "image" && (
                    <div className="image-attachment" onClick={() => { setSelectedImage(attachment.url); setShowImageModal(true); }}>
                      <IonThumbnail><IonImg src={attachment.url} alt={attachment.name} /></IonThumbnail>
                      <IonLabel>{attachment.name}</IonLabel>
                      <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); downloadFile(attachment); }}><IonIcon icon={downloadOutline} /></IonButton>
                    </div>
                  )}
                  {attachment.type === "document" && (
                    <div className="document-attachment" onClick={() => { setSelectedDocument(attachment); setShowDocumentModal(true); }}>
                      <IonIcon icon={documentText} className="document-icon" />
                      <IonLabel>{attachment.name}</IonLabel>
                      <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); downloadFile(attachment); }}><IonIcon icon={downloadOutline} /></IonButton>
                    </div>
                  )}
                  {attachment.type === "audio" && (
                    <div className="audio-attachment">
                      <div className="audio-player">
                        <IonButton fill="clear" onClick={() => attachment.isPlaying ? pauseAudio(attachment) : playAudio(attachment)}>
                          <IonIcon icon={attachment.isPlaying ? pause : play} />
                        </IonButton>
                        <div className="audio-progress">
                          <IonProgressBar value={attachment.currentTime && attachment.duration ? attachment.currentTime / attachment.duration : 0} />
                          <span>{formatTime(attachment.currentTime || 0)} / {formatTime(attachment.duration || 0)}</span>
                        </div>
                        <IonButton fill="clear" size="small" onClick={() => downloadFile(attachment)}><IonIcon icon={downloadOutline} /></IonButton>
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
          {isAdmin && msg.status && (
            <IonIcon
              icon={msg.status === "read" ? checkmarkDone : checkmark}
              style={{ color: msg.status === "read" ? "#28c2f6" : "#8696a0", fontSize: "16px" }}
            />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <IonText>Loading...</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className={`consult-page${selectedDoctor ? " chat-open" : ""}`}>
      <IonHeader className="ion-no-border consult-header">
        <IonToolbar className="patient-dashboard-toolbar">
          {selectedDoctor ? (
            <>
              <IonButtons slot="start">
                <IonButton onClick={() => { setSelectedDoctor(null); setSelectedChat(null); setAttachments([]); setNewMessage(""); pauseAllAudio(); }}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <div className="patient-header-info">
                <div className="initials-avatar header-avatar-c" style={{ background: avatarColor(selectedDoctor.name) }}>
                  {selectedDoctor.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="header-details">
                  <IonTitle>{selectedDoctor.name}</IonTitle>
                  <IonText>
                    {selectedDoctor.online ? (
                      <span className="online-status">Online</span>
                    ) : (
                      <span className="last-seen">Last seen {selectedDoctor.lastSeen}</span>
                    )}
                  </IonText>
                </div>
              </div>
              <IonButtons slot="end">
                <IonButton className="call-button" onClick={() => setIsCallModalOpen(true)}><IonIcon icon={callOutline} /></IonButton>
                <IonButton className="call-button" onClick={() => { setRoomToken("room-" + Date.now()); setIsVideoModalOpen(true); }}><IonIcon icon={videocamOutline} /></IonButton>
              </IonButtons>
            </>
          ) : (
            <>
              <IonButtons slot="start">
                <IonBackButton defaultHref="/admin/dashboard" />
              </IonButtons>
              <IonTitle>Messages</IonTitle>
            </>
          )}
        </IonToolbar>

        {!selectedDoctor && (
          <IonToolbar className="consult-search-toolbar">
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value!)}
              placeholder="Search doctors or specialties"
              className="doctor-searchbar"
            />
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent ref={contentRef} className="consult-content">
        {!selectedDoctor ? (
          <>
            <div className="wa-doctor-list">
              {filteredDoctors.map((doctor) => {
                const existingChat = chatSessions.find(c => c.doctorId === doctor.id);
                const lastMsg = existingChat?.lastMessage || doctor.specialization;
                const lastTime = existingChat?.lastMessageTime ? formatMessageTime(existingChat.lastMessageTime) : "";
                const unread = existingChat?.unreadCount || 0;
                return (
                  <IonItem key={doctor.id} className="wa-doctor-item" button lines="full" onClick={() => handleSelectDoctor(doctor)}>
                    <div className="avatar-container-c" slot="start">
                      <div className="initials-avatar wa-avatar" style={{ background: avatarColor(doctor.name) }}>
                        {doctor.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`wa-online-dot ${doctor.online ? "online" : ""}`} />
                    </div>
                    <div className="wa-info">
                      <div className="wa-top">
                        <span className="wa-name">{doctor.name}</span>
                        {lastTime && <span className="wa-time">{lastTime}</span>}
                      </div>
                      <div className="wa-meta">
                        {doctor.specialization}{doctor.town ? ` · ${doctor.town}` : ""}
                      </div>
                      <div className="wa-bottom">
                        <span className="wa-preview">{lastMsg}</span>
                        {unread > 0 && <span className="wa-unread">{unread}</span>}
                      </div>
                    </div>
                  </IonItem>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="chat-container">
              <div className="messages">
                {messages.map((msg) => renderMessage(msg))}
                {isTyping && (
                  <div className="typing-indicator">
                    <div className="initials-avatar typing-avatar" style={{ background: avatarColor(selectedDoctor.name) }}>
                      {selectedDoctor.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="typing-bubble">
                      <div className="typing-dots">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          multiple
          onChange={handleFileSelect}
        />

        <IonModal isOpen={showImageModal} onDidDismiss={() => setShowImageModal(false)} className="image-preview-modal">
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowImageModal(false)}><IonIcon icon={close} /></IonButton>
              </IonButtons>
              <IonTitle>Image Preview</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => downloadFile({ id: "temp", type: "image", url: selectedImage, name: "image.jpg" } as Attachment)}>
                  <IonIcon icon={downloadOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-text-center">
            <IonImg src={selectedImage} className="preview-image" />
          </IonContent>
        </IonModal>

        <IonModal isOpen={showDocumentModal} onDidDismiss={() => setShowDocumentModal(false)} className="document-preview-modal">
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowDocumentModal(false)}><IonIcon icon={close} /></IonButton>
              </IonButtons>
              <IonTitle>{selectedDocument?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => selectedDocument && downloadFile(selectedDocument)}><IonIcon icon={downloadOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-text-center">
            <iframe src={selectedDocument?.url} className="document-preview" title={selectedDocument?.name} />
          </IonContent>
        </IonModal>

        <IonAlert isOpen={showAlert} onDidDismiss={() => setShowAlert(false)} header={"Microphone Access"} message={alertMessage} buttons={["OK"]} />
      </IonContent>

      {selectedDoctor && (
        <IonFooter>
          <IonToolbar className="message-input-container1">
            <IonGrid>
              {attachments.length > 0 && (
                <div className="attachments-preview">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-preview">
                      {attachment.type === "image" && (
                        <>
                          <IonThumbnail><IonImg src={attachment.url} alt={attachment.name} /></IonThumbnail>
                          <div className="attachment-info">
                            <IonText>{attachment.name}</IonText>
                            {attachment.uploadProgress !== undefined && <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn"><IonIcon icon={trashOutline} /></IonButton>
                        </>
                      )}
                      {attachment.type === "document" && (
                        <>
                          <IonIcon icon={documentText} className="document-icon" />
                          <div className="attachment-info">
                            <IonText>{attachment.name}</IonText>
                            {attachment.uploadProgress !== undefined && <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn"><IonIcon icon={trashOutline} /></IonButton>
                        </>
                      )}
                      {attachment.type === "audio" && (
                        <>
                          <IonIcon icon={mic} className="audio-icon" />
                          <div className="attachment-info">
                            <IonText>Voice note ({formatTime(attachment?.duration || 0)})</IonText>
                            {attachment.uploadProgress !== undefined && <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn"><IonIcon icon={trashOutline} /></IonButton>
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
                      <IonItem lines="none" color={"light"}>
                        <IonTextarea ref={messageInputRef} value={newMessage} placeholder="Type a message" onIonInput={(e) => setNewMessage(e.detail.value!)} rows={1} onKeyPress={handleKeyPress} autoGrow className="message-textarea" />
                      </IonItem>
                    </IonCol>
                    <IonCol size="1" className="send-col">
                      {newMessage.trim() === "" && attachments.length === 0 ? (
                        <IonButton ref={recordButtonRef} fill="clear" color="primary" className="record-btn" onPointerDown={handleRecordPointerDown} onPointerMove={handleRecordPointerMove} onPointerUp={handleRecordPointerUp} onPointerCancel={handleRecordPointerUp}>
                          <IonIcon icon={micOutline} />
                        </IonButton>
                      ) : (
                        <IonButton fill="clear" color="primary" onClick={handleSendMessage} disabled={isSending} className="send-btn">
                          {isSending ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />}
                        </IonButton>
                      )}
                    </IonCol>
                  </IonRow>
                ) : (
                  <IonRow className="recording-row">
                    <IonCol size="12">
                      <div className={`whatsapp-recording-bar ${showCancelRecording ? "cancel-ready" : ""}`} ref={recordContainerRef} style={{ transform: `translateX(${recordingSlideX}px)` }}>
                        <div className="recording-left">
                          <span className="recording-live-dot"></span>
                          <IonIcon icon={mic} className="recording-mic" />
                          <IonText className="recording-time">{formatTime(recordingTime)}</IonText>
                        </div>
                        <div className="recording-wave">
                          {(recordingAmplitude.length > 0 ? recordingAmplitude : [0.1, 0.25, 0.35, 0.5, 0.3, 0.2, 0.4]).map((amp, index) => (
                            <span key={index} className="recording-wave-bar" style={{ height: `${Math.max(18, amp * 34)}px` }} />
                          ))}
                          <IonText className="recording-slide-hint">
                            {showCancelRecording && !isRecordingLocked ? "Release to cancel" : isRecordingLocked ? "Locked" : showLockRecord ? "Slide up to lock" : "Slide left to cancel"}
                          </IonText>
                        </div>
                        <div className="recording-actions">
                          <IonButton fill="clear" color="danger" className="recording-action-btn cancel" onClick={stopRecordingWithoutSend}>
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                          <IonButton fill="solid" color="primary" className="recording-action-btn send" onClick={stopRecordingAndSend}>
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
      <AudioCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        targetId={selectedDoctor?.id || ""}
        targetCollection="doctors"
        onSwitchToVideo={() => { setIsCallModalOpen(false); setRoomToken("room-" + Date.now()); setIsVideoModalOpen(true); }}
      />
      <VideoChatModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        roomName={roomToken}
        token={roomToken}
      />
    </IonPage>
  );
};
export default SMS_doctor;
