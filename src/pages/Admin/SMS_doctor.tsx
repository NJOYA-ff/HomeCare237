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
import "./Admin2.scss";
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
  const recordContainerRef = useRef<HTMLIonGridElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const messageListenerInitializedRef = useRef(false);

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

  const setupRecordingStopHandler = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
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

        setAttachments((prev) => [...prev, attachment]);

        // Auto-send the recording
        if (selectedChat && currentUser) {
          const uploadedAttachment = await uploadFile(attachment);

          await addDoc(
            collection(db, "admin_chats", selectedChat.id, "messages"),
            {
              text: "",
              sender: "admin",
              senderId: currentUser.uid,
              timestamp: serverTimestamp(),
              status: "sent",
              chatId: selectedChat.id,
              attachments: [uploadedAttachment],
            },
          );

          await updateDoc(doc(db, "admin_chats", selectedChat.id), {
            lastMessage: "Voice message",
            lastMessageTime: serverTimestamp(),
          });
        }

        setRecordingTime(0);
        setIsRecording(false);
        setIsRecordingLocked(false);
        setShowLockRecord(false);

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
        className={`message ${isAdmin ? "admin-message" : "doctor-message"}`}
      >
        <div className="message-content">
          <p>{msg.text}</p>

          {msg.attachments && msg.attachments.length > 0 && (
            <div className="message-attachments">
              {msg.attachments.map((attachment: Attachment, index: number) => (
                <div key={index} className="attachment">
                  {attachment.type === "image" && (
                    <div
                      className="image-attachment"
                      onClick={() => {
                        setSelectedImage(attachment.url);
                        setShowImageModal(true);
                      }}
                    >
                      <IonThumbnail>
                        <IonImg src={attachment.url} alt={attachment.name} />
                      </IonThumbnail>
                      <IonLabel>{attachment.name}</IonLabel>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(attachment);
                        }}
                      >
                        <IonIcon icon={downloadt} />
                      </IonButton>
                    </div>
                  )}

                  {attachment.type === "document" && (
                    <div
                      className="document-attachment"
                      onClick={() => {
                        setSelectedDocument(attachment);
                        setShowDocumentModal(true);
                      }}
                    >
                      <IonIcon icon={documentText} className="document-icon" />
                      <IonLabel>{attachment.name}</IonLabel>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(attachment);
                        }}
                      >
                        <IonIcon icon={downloadOutline} />
                      </IonButton>
                    </div>
                  )}

                  {attachment.type === "audio" && (
                    <div className="audio-attachment">
                      <IonButton
                        fill="clear"
                        onClick={() => {
                          if (attachment.isPlaying) {
                            pauseAudio(attachment);
                          } else {
                            playAudio(attachment);
                          }
                        }}
                      >
                        <IonIcon icon={attachment.isPlaying ? pause : play} />
                      </IonButton>
                      <div className="audio-progress">
                        <IonProgressBar
                          value={
                            attachment.currentTime && attachment.duration
                              ? attachment.currentTime / attachment.duration
                              : 0
                          }
                        />
                        <IonText className="audio-time">
                          {formatTime(attachment.currentTime || 0)} /
                          {formatTime(attachment.duration || 0)}
                        </IonText>
                      </div>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(attachment);
                        }}
                      >
                        <IonIcon icon={downloadOutline} />
                      </IonButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="message-meta">
          <span className="message-time">
            {formatMessageTime(msg.timestamp)}
          </span>
          {isAdmin && msg.status && (
            <IonIcon
              icon={msg.status === "read" ? checkmarkDone : checkmark}
              className={`status-icon ${msg.status}`}
            />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <IonSpinner />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="consult-page">
      <IonHeader class="ion-no-border" className="consult-header">
        <IonToolbar>
          {selectedDoctor ? (
            <>
              <IonButtons slot="start">
                <IonButton
                  onClick={() => {
                    setSelectedDoctor(null);
                    setSelectedChat(null);
                  }}
                >
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <IonAvatar
                  style={{ width: "40px", height: "40px", marginRight: "12px" }}
                >
                  <img
                    src={
                      selectedDoctor.image ||
                      "https://ionicframework.com/docs/img/demos/avatar.svg"
                    }
                    alt={selectedDoctor.name}
                  />
                </IonAvatar>
                <div>
                  <IonText
                    style={{
                      display: "block",
                      fontWeight: "600",
                      fontSize: "16px",
                    }}
                  >
                    {selectedDoctor.name}
                  </IonText>
                  <IonText
                    style={{ display: "block", fontSize: "12px", opacity: 0.7 }}
                  >
                    {selectedDoctor.specialization}
                  </IonText>
                </div>
              </div>
              <IonButtons slot="end">
                <IonButton>
                  <IonIcon icon={callOutline} />
                </IonButton>
                <IonButton>
                  <IonIcon icon={videocamOutline} />
                </IonButton>
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
          <IonToolbar>
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value!)}
              placeholder="Search doctors or specialties"
              className="doctor-searchbar"
            />
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent fullscreen ref={contentRef} className="consult-content">
        {!selectedDoctor ? (
          <>
            <IonList>
              {filteredDoctors.map((doctor) => (
                <IonItem
                  key={doctor.id}
                  onClick={() => handleSelectDoctor(doctor)}
                  button
                  className={`doctor-item ${animateCards ? "animate" : ""}`}
                >
                  <IonAvatar slot="start">
                    <img
                      src={
                        doctor.image ||
                        "https://ionicframework.com/docs/img/demos/avatar.svg"
                      }
                      alt={doctor.name}
                    />
                  </IonAvatar>
                  <IonGrid className="doctor-grid">
                    <IonCardTitle className="doctor-name-c">
                      {doctor.name}
                    </IonCardTitle>
                    <IonCardSubtitle className="doctor-specialty-c">
                      {doctor.specialization}
                    </IonCardSubtitle>

                    <div className="doctor-details-c">
                      <IonChip color="primary" className="rating-chip">
                        <IonIcon icon={star} />
                        <IonLabel>{doctor.rating}</IonLabel>
                      </IonChip>

                      <IonChip className="experience-chip">
                        <IonLabel>
                          {doctor.yearsOfExperience} Experience
                        </IonLabel>
                      </IonChip>
                    </div>

                    <div className="doctor-footer">
                      <IonText className="distance-text">
                        <IonIcon icon={location} />
                        {doctor.town}
                      </IonText>
                    </div>
                  </IonGrid>
                </IonItem>
              ))}
            </IonList>
          </>
        ) : (
          <>
            <div className="chat-container">
              <div className="messages">
                {messages.map((msg) => renderMessage(msg))}

                {isTyping && (
                  <div className="typing-indicator">
                    <IonAvatar className="typing-avatar">
                      <img
                        src="https://ionicframework.com/docs/img/demos/avatar.svg"
                        alt={selectedDoctor.name}
                      />
                    </IonAvatar>
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

            {/* Message input and attachments */}
            <IonFooter>
              <IonToolbar className="message-input-container1">
                <IonGrid>
                  {attachments.length > 0 && (
                    <div className="attachments-preview">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="attachment-preview">
                          {attachment.type === "image" && (
                            <div className="preview-item">
                              <IonThumbnail>
                                <IonImg
                                  src={attachment.url}
                                  alt={attachment.name}
                                />
                              </IonThumbnail>
                              <IonText>{attachment.name}</IonText>
                              {attachment.uploadProgress !== undefined && (
                                <IonProgressBar
                                  value={attachment.uploadProgress / 100}
                                />
                              )}
                              <IonButton
                                fill="clear"
                                color="danger"
                                onClick={() => removeAttachment(attachment.id)}
                              >
                                <IonIcon icon={close} />
                              </IonButton>
                            </div>
                          )}
                          {attachment.type === "document" && (
                            <div className="preview-item">
                              <IonIcon icon={documentText} />
                              <IonText>{attachment.name}</IonText>
                              {attachment.uploadProgress !== undefined && (
                                <IonProgressBar
                                  value={attachment.uploadProgress / 100}
                                />
                              )}
                              <IonButton
                                fill="clear"
                                color="danger"
                                onClick={() => removeAttachment(attachment.id)}
                              >
                                <IonIcon icon={close} />
                              </IonButton>
                            </div>
                          )}
                          {attachment.type === "audio" && (
                            <div className="preview-item">
                              <IonIcon icon={mic} />
                              <IonText>
                                Voice message (
                                {formatTime(attachment.duration || 0)})
                              </IonText>
                              {attachment.uploadProgress !== undefined && (
                                <IonProgressBar
                                  value={attachment.uploadProgress / 100}
                                />
                              )}
                              <IonButton
                                fill="clear"
                                color="danger"
                                onClick={() => removeAttachment(attachment.id)}
                              >
                                <IonIcon icon={close} />
                              </IonButton>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <IonGrid className="input-grid">
                    <IonRow className="ion-align-items-center input-row">
                      <IonCol size="1" className="attachment-col">
                        <IonButton
                          fill="clear"
                          color="medium"
                          onClick={openAttachmentActionSheet}
                          className="attachment-btn"
                        >
                          <IonIcon icon={attach} color="primary" />
                        </IonButton>
                      </IonCol>
                      <IonCol size="10" className="text-input-col">
                        <IonItem lines="none" color={"light"}>
                          <IonTextarea
                            ref={messageInputRef}
                            value={newMessage}
                            placeholder="Type your message here..."
                            onIonInput={(e) => setNewMessage(e.detail.value!)}
                            rows={1}
                            onKeyPress={handleKeyPress}
                            autoGrow
                            className="message-textarea"
                          />
                        </IonItem>
                      </IonCol>
                      <IonCol size="1" className="send-col">
                        {newMessage.trim() === "" &&
                        attachments.length === 0 ? (
                          <IonButton
                            ref={recordButtonRef}
                            fill="clear"
                            color="primary"
                            className="record-btn"
                            onClick={
                              isRecording
                                ? stopRecordingAndSend
                                : startRecording
                            }
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
                            {isSending ? (
                              <IonSpinner name="crescent" />
                            ) : (
                              <IonIcon icon={sendOutline} />
                            )}
                          </IonButton>
                        )}
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonGrid>
              </IonToolbar>
            </IonFooter>

            {/* Recording UI */}
            {isRecording && (
              <IonGrid className="recording-overlay" ref={recordContainerRef}>
                <IonRow className="ion-justify-content-center ion-align-items-center recording-container">
                  <IonCol size="12" className="ion-text-center">
                    <div className="recording-visualization">
                      {recordingAmplitude.map((amp, index) => (
                        <div
                          key={index}
                          className="amplitude-bar"
                          style={{ height: `${amp * 100}%` }}
                        />
                      ))}
                    </div>
                    <IonText className="recording-time">
                      {formatTime(recordingTime)}
                    </IonText>
                    <IonText className="recording-text">
                      {isRecordingLocked
                        ? "Recording locked - Tap to send"
                        : "Recording... Slide up to lock"}
                    </IonText>
                    <div className="recording-actions">
                      <IonButton
                        fill="clear"
                        color="danger"
                        onClick={() => {
                          setIsRecording(false);
                          setRecordingTime(0);
                          if (mediaRecorderRef.current) {
                            mediaRecorderRef.current.stop();
                            mediaRecorderRef.current.stream
                              .getTracks()
                              .forEach((track) => track.stop());
                          }
                        }}
                      >
                        <IonIcon icon={trashOutline} />
                      </IonButton>
                      <IonButton
                        fill="clear"
                        color="primary"
                        onClick={stopRecordingAndSend}
                      >
                        <IonIcon icon={sendOutline} />
                      </IonButton>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            )}
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

        <IonModal
          isOpen={showImageModal}
          onDidDismiss={() => setShowImageModal(false)}
          className="image-preview-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowImageModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>Image Preview</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={() =>
                    downloadFile({
                      id: "temp",
                      type: "image",
                      url: selectedImage,
                      name: "image.jpg",
                    } as Attachment)
                  }
                >
                  <IonIcon icon={downloadOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-text-center">
            <IonImg src={selectedImage} className="preview-image" />
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={showDocumentModal}
          onDidDismiss={() => setShowDocumentModal(false)}
          className="document-preview-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowDocumentModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
              <IonTitle>{selectedDocument?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={() =>
                    selectedDocument && downloadFile(selectedDocument)
                  }
                >
                  <IonIcon icon={downloadOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-text-center">
            <iframe
              src={selectedDocument?.url}
              className="document-preview"
              title={selectedDocument?.name}
            />
          </IonContent>
        </IonModal>
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={"Microphone Access"}
          message={alertMessage}
          buttons={["OK"]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SMS_doctor;
