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
} from "@ionic/react";
import {
  attach,
  medical,
  close,
  play,
  document,
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
  timeOutline,
} from "ionicons/icons";
import { useIonToast } from "@ionic/react";
import "../Doctor/Consult.scss";
import { db, auth, storage } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

// Updated interfaces to match Doc_Consult component
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition?: string;
  lastConsultation?: string;
  image: string;
  bloodType?: string;
  allergies?: string[];
  emergencyContact?: any;
  online: boolean;
  email?: string;
  phone?: string;
  userId: string;
}

interface Message {
  id: string;
  text: string;
  sender: "patient" | "doctor" | "admin";
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
  adminId: string;
  patientId: string;
  patient?: Patient;
  lastMessage?: string;
  lastMessageTime: any;
  unreadCount: number;
}

const SMS_patient: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
  const [showCancelRecording, setShowCancelRecording] = useState(false);
  const [recordingSlideX, setRecordingSlideX] = useState(0);

  // Firebase states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const amplitudeIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const messageListenerInitializedRef = useRef(false);
  const contentRef = useRef<HTMLIonContentElement>(null);
  const messageInputRef = useRef<HTMLIonTextareaElement>(null);
  const progressIntervalRef = useRef<any>(null);
  const recordButtonRef = useRef<HTMLIonButtonElement>(null);
  const recordContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingGestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastDeltaX: 0,
    lastDeltaY: 0,
    pointerId: 0,
    locked: false,
  });
  const recordingStopActionRef = useRef<"send" | "cancel">("send");

  const [animateCards, setAnimateCards] = useState(false);
  const [presentToast] = useIonToast();
  const [presentActionSheet] = useIonActionSheet();

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

  // Initialize current user and load patients
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadPatients();
        loadChatSessions(user.uid);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Load patients from Firebase
  const loadPatients = async () => {
    try {
      const patientsRef = collection(db, "patients");
      const patientsSnapshot = await getDocs(patientsRef);
      const patientsData = patientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Patient[];
      setPatients(patientsData);
    } catch (error) {
      console.error("Error loading patients:", error);
      presentToast({
        message: "Failed to load patients",
        duration: 2000,
        color: "danger",
      });
    }
  };

  // Load chat sessions for current admin
  const loadChatSessions = (adminId: string) => {
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("adminId", "==", adminId),
      orderBy("lastMessageTime", "desc"),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessions: ChatSession[] = [];

      for (const document of snapshot.docs) {
        const chatData = document.data();
        let patientData = chatData.patient;

        // If patient data is missing and patientId exists, fetch it from patients collection
        if (!patientData && chatData.patientId) {
          try {
            const patientDoc = await getDoc(
              doc(db, "patients", chatData.patientId),
            );
            if (patientDoc.exists()) {
              patientData = {
                id: patientDoc.id,
                ...patientDoc.data(),
              };
            }
          } catch (error) {
            console.error("Error fetching patient data:", error);
          }
        }

        // Only add session if we have patient data or patientId
        if (patientData || chatData.patientId) {
          sessions.push({
            id: document.id,
            ...chatData,
            patient: patientData,
          } as ChatSession);
        }
      }

      setChatSessions(sessions);
    });

    return unsubscribe;
  };

  // Load messages for selected chat
  useEffect(() => {
    if (selectedChat) {
      const messagesRef = collection(db, "chats", selectedChat.id, "messages");
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
          // For new messages, send notification if from patient
          messagesData.forEach((msg) => {
            if (
              !seenMessageIdsRef.current.has(msg.id) &&
              msg.sender === "patient"
            ) {
              seenMessageIdsRef.current.add(msg.id);
            }
          });
        }

        setMessages(messagesData);

        // Mark messages as read
        markMessagesAsRead();
      });

      return unsubscribe;
    }
  }, [selectedChat, selectedPatient]);

  const markMessagesAsRead = async () => {
    if (selectedChat && currentUser) {
      const unreadMessages = messages.filter(
        (msg) => msg.senderId !== currentUser.uid && msg.status !== "read",
      );

      for (const message of unreadMessages) {
        await updateDoc(
          doc(db, "chats", selectedChat.id, "messages", message.id),
          {
            status: "read",
          },
        );
      }

      // Update chat unread count
      await updateDoc(doc(db, "chats", selectedChat.id), {
        unreadCount: 0,
      });
    }
  };

  // Helper functions
  const formatEmergencyContact = (emergencyContact: any): string => {
    if (!emergencyContact) return "Not provided";
    if (typeof emergencyContact === "string") return emergencyContact;
    return `${emergencyContact.name} (${emergencyContact.relationship}): ${emergencyContact.phone}`;
  };

  const formatAllergies = (allergies: string[] | undefined): string => {
    if (!allergies || allergies.length === 0) return "None";
    return Array.isArray(allergies) ? allergies.join(", ") : "None";
  };

  useIonViewWillEnter(() => {
    setAnimateCards(true);
  });

  useIonViewWillLeave(() => {
    // Blur any focused element to prevent aria-hidden accessibility issues
    const activeElement = globalThis.document?.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    setAnimateCards(false);
    if (isRecording) {
      stopRecordingWithoutSend();
    }
    pauseAllAudio();
  });

  useEffect(() => {
    if (contentRef.current && selectedChat) {
      setTimeout(() => {
        contentRef.current?.scrollToBottom(300);
      }, 100);
    }
  }, [messages, selectedChat]);

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (patient.condition &&
        patient.condition.toLowerCase().includes(searchText.toLowerCase())),
  );

  const handleSelectPatient = async (patient: Patient) => {
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
      (chat) => chat.patientId === patient.id,
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      setSelectedPatient(patient);
    } else {
      // Create new chat session
      try {
        const chatData = {
          adminId: currentUser.uid,
          patientId: patient.id,
          patient: patient,
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          unreadCount: 0,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "chats"), chatData);
        const newChat: ChatSession = {
          id: docRef.id,
          ...chatData,
          lastMessageTime: new Date(),
        };

        setSelectedChat(newChat);
        setSelectedPatient(patient);

        // Add welcome message
        await addDoc(collection(db, "chats", docRef.id, "messages"), {
          text: `Hello, I'm an admin. How can I help you today?`,
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
        collection(db, "chats", selectedChat.id, "messages"),
        messageData,
      );

      // Update chat session
      const displayMessage =
        newMessage ||
        (attachments.length > 0
          ? attachments[0].type === "image"
            ? "Photo"
            : attachments[0].type === "audio"
            ? "Voice message"
            : "Document"
          : "");

      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: displayMessage,
        lastMessageTime: serverTimestamp(),
        unreadCount: selectedChat.unreadCount + 1,
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
      const storagePath = `chats/${selectedChat?.id}/attachments/${attachment.id}_${attachment.name}`;
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

  // Take photo using Capacitor Camera and add as attachment
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

  const stopRecordingWithoutSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      recordingStopActionRef.current = "cancel";
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const stopRecordingAndSend = async () => {
    if (mediaRecorderRef.current && isRecording) {
      recordingStopActionRef.current = "send";
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const setupRecordingStopHandler = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        const stopAction = recordingStopActionRef.current;

        if (stopAction === "send") {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
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

          // Auto-send the recording
          if (selectedChat && currentUser) {
            const uploadedAttachment = await uploadFile(attachment);

            await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
              text: "",
              sender: "admin",
              senderId: currentUser.uid,
              timestamp: serverTimestamp(),
              status: "sent",
              chatId: selectedChat.id,
              attachments: [uploadedAttachment],
            });

            await updateDoc(doc(db, "chats", selectedChat.id), {
              lastMessage: "Voice message",
              lastMessageTime: serverTimestamp(),
              unreadCount: selectedChat.unreadCount + 1,
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

        if (amplitudeIntervalRef.current) {
          clearInterval(amplitudeIntervalRef.current);
        }

        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    }
  };

  const CANCEL_THRESHOLD = -110;
  const LOCK_THRESHOLD = -90;

  const handleRecordPointerDown = async (
    e: React.PointerEvent<HTMLIonButtonElement>,
  ) => {
    if (newMessage.trim() !== "" || attachments.length > 0 || isRecording) return;

    recordingGestureRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastDeltaX: 0,
      lastDeltaY: 0,
      pointerId: e.pointerId,
      locked: false,
    };

    setShowCancelRecording(false);
    setShowLockRecord(true);
    setRecordingSlideX(0);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Pointer capture failed:", err);
    }

    await startRecording();
  };

  const handleRecordPointerMove = (
    e: React.PointerEvent<HTMLIonButtonElement>,
  ) => {
    if (!recordingGestureRef.current.active || !isRecording || isRecordingLocked)
      return;

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

  const handleRecordPointerUp = (
    e: React.PointerEvent<HTMLIonButtonElement>,
  ) => {
    if (!recordingGestureRef.current.active) return;

    recordingGestureRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(recordingGestureRef.current.pointerId);
    } catch (err) {
      console.warn("Pointer release failed:", err);
    }

    if (!isRecording) return;

    const shouldCancel =
      recordingGestureRef.current.lastDeltaX <= CANCEL_THRESHOLD ||
      showCancelRecording;

    if (isRecordingLocked || recordingGestureRef.current.locked) {
      return;
    }

    if (shouldCancel) {
      stopRecordingWithoutSend();
    } else {
      stopRecordingAndSend();
    }
  };

  // Audio playback functions
  const playAudio = (attachment: Attachment) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(attachment.url);
    } else {
      audioRef.current.src = attachment.url;
    }

    audioRef.current.onloadedmetadata = () => {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((att) =>
            att.id === attachment.id
              ? {
                  ...att,
                  isPlaying: true,
                  duration: audioRef.current?.duration || 0,
                }
              : att,
          ),
        })),
      );
    };

    audioRef.current.ontimeupdate = () => {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((att) =>
            att.id === attachment.id
              ? { ...att, currentTime: audioRef.current?.currentTime || 0 }
              : att,
          ),
        })),
      );
    };

    audioRef.current.onended = () => {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((att) =>
            att.id === attachment.id
              ? { ...att, isPlaying: false, currentTime: 0 }
              : att,
          ),
        })),
      );
    };

    audioRef.current.play();
  };

  const pauseAudio = (attachment: Attachment) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((att) =>
            att.id === attachment.id ? { ...att, isPlaying: false } : att,
          ),
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
          attachments: msg.attachments?.map((att) => ({
            ...att,
            isPlaying: false,
          })),
        })),
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const removeAttachment = (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (attachment) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setSelectedChat(null);
    setAttachments([]);
    setNewMessage("");
    pauseAllAudio();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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

  const renderMessage = (msg: Message) => {
    const isAdmin = msg.sender === "admin";
    const isPatient = msg.sender === "patient";

    return (
      <div
        key={msg.id}
        className={`message-wrapper ${isAdmin ? "doctor-wrapper" : "patient-wrapper"}`}
      >
        <div className={`message ${isAdmin ? "doctor-message-d" : "patient-message-d"}`}>
          <div className="message-content">
            {isAdmin && <div className="admin-badge"><IonChip color="warning">Admin</IonChip></div>}
            <p>{msg.text}</p>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="message-attachments">
                {msg.attachments.map((att, index: number) => (
                  <div key={index} className="attachment">
                    {att.type === "image" && (
                      <div className="image-attachment" onClick={() => { setSelectedImage(att.url); setShowImageModal(true); }}>
                        <IonThumbnail><IonImg src={att.url} alt={att.name} /></IonThumbnail>
                        <div className="attachment-details">
                          <IonLabel>{att.name}</IonLabel>
                          <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); downloadFile(att); }}><IonIcon icon={downloadOutline} /></IonButton>
                        </div>
                      </div>
                    )}
                    {att.type === "document" && (
                      <div className="document-attachment" onClick={() => { setSelectedDocument(att); setShowDocumentModal(true); }}>
                        <IonIcon icon={document} size="large" />
                        <div className="attachment-details">
                          <IonLabel>{att.name}</IonLabel>
                          <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); downloadFile(att); }}><IonIcon icon={downloadOutline} /></IonButton>
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
                            <IonProgressBar value={att.currentTime && att.duration ? att.currentTime / att.duration : 0} className="audio-progress-bar" />
                            <div className="audio-time"><span>{formatTime(att.currentTime || 0)} / {formatTime(att.duration || 0)}</span></div>
                          </div>
                          <IonButton fill="clear" size="small" className="download-btn" onClick={() => downloadFile(att)}><IonIcon icon={downloadOutline} /></IonButton>
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
                style={{ color: msg.status === "read" ? "var(--ion-color-tertiary)" : "var(--ion-color-medium)", fontSize: "16px" }}
              />
            )}
          </div>
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
    <IonPage className={`consult-page${selectedPatient ? " chat-open" : ""}`}>
      <IonHeader class="ion-no-border" className="consult-header">
        <IonToolbar>
          {selectedPatient ? (
            <>
              <IonButtons slot="start">
                <IonButton onClick={handleBack}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <div className="patient-header-info">
                <div className="initials-avatar header-avatar-c" style={{background: avatarColor(selectedPatient.name)}}>{selectedPatient.name.split(" ").map((p: string) => p[0]).join("").slice(0,2).toUpperCase()}</div>
                <div className="header-details">
                  <IonTitle>{selectedPatient.name}</IonTitle>
                  <IonText>
                    {selectedPatient.online ? (
                      <span className="online-status">Online</span>
                    ) : (
                      <span className="last-seen">Last seen {selectedPatient.lastConsultation}</span>
                    )}
                  </IonText>
                </div>
              </div>
              <IonButtons slot="end">
                <IonButton className="call-button"><IonIcon icon={callOutline} /></IonButton>
                <IonButton className="call-button"><IonIcon icon={videocamOutline} /></IonButton>
              </IonButtons>
            </>
          ) : (
            <>
              <IonButtons slot="start">
                <IonBackButton defaultHref="/admin/dashboard" />
              </IonButtons>
              <IonTitle>Patient Messages</IonTitle>
            </>
          )}
        </IonToolbar>

        {!selectedPatient && (
          <IonToolbar>
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value!)}
              placeholder="Search patients or conditions"
              className="doctor-search"
            />
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent ref={contentRef} className="consult-content">
        {!selectedPatient ? (
          <>
            {loading ? (
              <div className="loading-container">
                <IonSpinner name="crescent" />
                <IonText><p>Loading patients...</p></IonText>
              </div>
            ) : (
              <div className="wa-patient-list">
                {filteredPatients.map((patient) => {
                  const existingChat = chatSessions.find(c => c.patientId === patient.id);
                  const lastMsg = existingChat?.lastMessage || patient.condition || "";
                  const lastTime = existingChat?.lastMessageTime ? formatMessageTime(existingChat.lastMessageTime) : "";
                  const unread = existingChat?.unreadCount || 0;
                  return (
                    <IonItem key={patient.id} className="wa-patient-item" button lines="full" onClick={() => handleSelectPatient(patient)}>
                      <div className="avatar-container-c" slot="start">
                        <div className="initials-avatar wa-avatar" style={{ background: avatarColor(patient.name) }}>
                          {patient.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`wa-online-dot ${patient.online ? "online" : ""}`} />
                      </div>
                      <div className="wa-info">
                        <div className="wa-top">
                          <span className="wa-name">{patient.name}</span>
                          {lastTime && <span className="wa-time">{lastTime}</span>}
                        </div>
                        <div className="wa-meta">
                          {patient.gender}{patient.condition ? ` · ${patient.condition}` : ""}
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
            )}
          </>
        ) : (
          <>
            {/* Patient Medical Info Bar */}
            <div className="medical-info-bar">
              <IonGrid className="medical-info-grid">
                <IonRow>
                  <IonCol size="6">
                    <IonText className="medical-info-item">
                      <strong>Blood Type:</strong> {selectedPatient.bloodType}
                    </IonText>
                  </IonCol>
                  <IonCol size="6">
                    <IonText className="medical-info-item">
                      <strong>Age:</strong> {selectedPatient.age}
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonText className="medical-info-item">
                      <strong>Allergies:</strong>{" "}
                      {formatAllergies(selectedPatient.allergies)}
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonText className="medical-info-item">
                      <strong>Emergency Contact:</strong>{" "}
                      {formatEmergencyContact(selectedPatient.emergencyContact)}
                    </IonText>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            <div className="chat-container">
              <div className="messages">
                {messages.map((msg) => renderMessage(msg))}

                {isTyping && (
                  <div className="typing-indicator">
                    <div className="initials-avatar typing-avatar" style={{background: avatarColor(selectedPatient.name)}}>{selectedPatient.name.split(" ").map((p: string) => p[0]).join("").slice(0,2).toUpperCase()}</div>
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
          </>
        )}

        {/* Modals */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          multiple
          onChange={handleFileSelect}
        />

        {/* Image Preview Modal */}
        <IonModal isOpen={showImageModal} onDidDismiss={() => setShowImageModal(false)} className="image-preview-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Image Preview</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowImageModal(false)} className="modal-close-btn"><IonIcon icon={close} /></IonButton>
                <IonButton onClick={() => downloadFile({ id: "temp", type: "image", url: selectedImage, name: "image.jpg" } as Attachment)}><IonIcon icon={downloadOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="image-container">
              <img src={selectedImage} alt="Preview" className="preview-image" />
            </div>
          </IonContent>
        </IonModal>

        {/* Document Preview Modal */}
        <IonModal isOpen={showDocumentModal} onDidDismiss={() => setShowDocumentModal(false)} className="document-preview-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedDocument?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDocumentModal(false)} className="modal-close-btn"><IonIcon icon={close} /></IonButton>
                <IonButton onClick={() => selectedDocument && downloadFile(selectedDocument)}><IonIcon icon={downloadOutline} /></IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="document-container">
              {selectedDocument && (
                <iframe src={selectedDocument.url} title="Document preview" width="100%" height="100%" className="document-iframe">
                  <p>Your browser does not support PDF viewing. Please download the PDF to view it.</p>
                </iframe>
              )}
            </div>
          </IonContent>
        </IonModal>

        <IonAlert isOpen={showAlert} onDidDismiss={() => setShowAlert(false)} header={"Microphone Access"} message={alertMessage} buttons={["OK"]} />
      </IonContent>
      {selectedPatient && (
        <IonFooter>
          <IonToolbar className="message-input-container1">
            <IonGrid className="message-input-container1">
              {attachments.length > 0 && (
                <div className="attachments-preview">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-preview">
                      {attachment.type === "image" && (
                        <>
                          <IonThumbnail><img src={attachment.url} alt={attachment.name} /></IonThumbnail>
                          <div className="attachment-info">
                            <IonText>{attachment.name}</IonText>
                            {attachment.uploadProgress !== undefined && <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn"><IonIcon icon={trashOutline} /></IonButton>
                        </>
                      )}
                      {attachment.type === "document" && (
                        <>
                          <IonIcon icon={document} className="document-icon" />
                          <div className="attachment-info">
                            <IonText>{attachment.name}</IonText>
                            {attachment.uploadProgress !== undefined && <IonProgressBar value={attachment.uploadProgress / 100} className="upload-progress" />}
                          </div>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => removeAttachment(attachment.id)} className="remove-attachment-btn"><IonIcon icon={trashOutline} /></IonButton>
                        </>
                      )}
                      {attachment.type === "audio" && (
                        <>
                          <IonIcon icon={play} className="audio-icon" />
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
                        <IonTextarea ref={messageInputRef} value={newMessage} placeholder="Type your message here..." onIonInput={(e) => setNewMessage(e.detail.value!)} rows={1} onKeyPress={handleKeyPress} autoGrow className="message-textarea" />
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
                          <IonButton fill="clear" color="danger" className="recording-action-btn cancel" onClick={() => { stopRecordingWithoutSend(); }}>
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
    </IonPage>
  );
};

export default SMS_patient;
