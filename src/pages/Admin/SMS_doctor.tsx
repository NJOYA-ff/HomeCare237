import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonText,
  IonButton,
  IonBackButton,
  IonButtons,
  IonFooter,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonProgressBar,
  IonToast,
  IonBadge,
  IonChip,
  IonTextarea,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  setDoc,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import {
  send,
  attach,
  close,
  search,
  checkmarkDone,
  personCircleOutline,
} from "ionicons/icons";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token } from "@capacitor/push-notifications";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import "./Admin2.scss";
import { db, auth, storage } from "../../firebaseconfig";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  senderName: string;
  senderAvatar?: string;
  status: "sending" | "sent" | "delivered" | "read";
  type: "text" | "image" | "document";
  fileUrl?: string;
  fileName?: string;
}

interface doctor {
  id: string;
  name: string;
  avatar?: string;
  lastSeen?: Date;
  isOnline: boolean;
}

// Helper function to convert Firestore data to Message object
const parseMessage = (doc: QueryDocumentSnapshot<DocumentData>): Message => {
  const data = doc.data();
  const timestamp = data.timestamp;

  return {
    id: doc.id,
    text: data.text || "",
    senderId: data.senderId,
    timestamp:
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp),
    senderName: data.senderName,
    senderAvatar: data.senderAvatar,
    status: data.status || "delivered",
    type: data.type || "text",
    fileUrl: data.fileUrl,
    fileName: data.fileName,
  };
};

const SMS_doctor: React.FC = () => {
  const [currentdoctor, setCurrentdoctor] = useState<doctor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [fileToUpload, setFileToUpload] = useState<{
    file: File | null;
    type: "image" | "document";
  }>({ file: null, type: "image" });
  const contentRef = useRef<HTMLIonContentElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In a real app, you would get the doctor ID from navigation params
  const doctorId = "doctor_ID_EXAMPLE";

  // Initialize push notifications
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === "granted") {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener("registration", (token: Token) => {
        console.log("Push registration success, token: " + token.value);
        // Store the token in Firestore for the user
        if (auth.currentUser) {
          updateDoc(doc(db, "users", auth.currentUser.uid), {
            pushToken: token.value,
          });
        }
      });

      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          console.log("Push received: ", notification);
        }
      );
    }
  }, []);

  // Fetch doctor data and set up real-time listeners
  useEffect(() => {
    if (!doctorId) return;

    const fetchdoctor = async () => {
      try {
        const doctorDoc = await getDoc(doc(db, "doctors", doctorId));
        if (doctorDoc.exists()) {
          const doctorData = doctorDoc.data();
          setCurrentdoctor({
            id: doctorDoc.id,
            name: doctorData.name,
            avatar: doctorData.avatar,
            lastSeen: doctorData.lastSeen?.toDate(),
            isOnline: doctorData.isOnline || false,
          });
        }
      } catch (error) {
        console.error("Error fetching doctor:", error);
        showToastMessage("Failed to load doctor data");
      }
    };

    // Set up real-time listener for doctor status
    const doctorUnsubscribe = onSnapshot(
      doc(db, "doctors", doctorId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCurrentdoctor((prev) => ({
            ...prev!,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen?.toDate(),
          }));
        }
      }
    );

    fetchdoctor();

    return () => {
      doctorUnsubscribe();
    };
  }, [doctorId]);

  // Set up messages listener
  useEffect(() => {
    if (!doctorId) return;

    const messagesQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", doctorId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const message = parseMessage(change.doc);
          messagesData.push(message);

          // Mark messages as read when they are received
          if (
            message.senderId !== auth.currentUser?.uid &&
            message.status !== "read"
          ) {
            updateDoc(change.doc.ref, { status: "read" });
          }

          // Send push notification for new messages
          if (
            message.senderId !== auth.currentUser?.uid &&
            Capacitor.isNativePlatform()
          ) {
            sendPushNotification(message.senderName, message.text);
          }
        }
      });

      setMessages((prev) => [...prev, ...messagesData]);
      setLoading(false);

      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        contentRef.current?.scrollToBottom(300);
      }, 100);
    });

    return () => unsubscribe();
  }, [doctorId]);

  // Set up typing indicator listener
  useEffect(() => {
    if (!doctorId) return;

    const typingRef = doc(db, "chats", `${doctorId}_typing`);
    const unsubscribe = onSnapshot(typingRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsTyping(data.isTyping && data.userId !== auth.currentUser?.uid);
      }
    });

    return () => unsubscribe();
  }, [doctorId]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (
      (!newMessage.trim() && !fileToUpload.file) ||
      !doctorId ||
      !auth.currentUser
    )
      return;

    const adminUser = auth.currentUser;

    // Create a temporary message for immediate UI feedback
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      text: newMessage,
      senderId: adminUser.uid,
      timestamp: new Date(),
      senderName: "Admin",
      senderAvatar: "",
      status: "sending",
      type: fileToUpload.file ? fileToUpload.type : "text",
      fileUrl: undefined,
      fileName: fileToUpload.file?.name,
    };

    // Add temporary message to UI immediately
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      let messageData: any = {
        senderId: adminUser.uid,
        senderName: "Admin",
        senderAvatar: "",
        participants: [adminUser.uid, doctorId],
        timestamp: serverTimestamp(),
        status: "sending",
        type: "text",
        text: newMessage,
      };

      // If there's a file to upload, handle that first
      if (fileToUpload.file) {
        setUploadProgress(0);
        const fileRef = ref(
          storage,
          `chats/${doctorId}/${Date.now()}_${fileToUpload.file.name}`
        );
        const uploadTask = uploadBytes(fileRef, fileToUpload.file);

        // Simulate progress (Firebase Web SDK doesn't provide progress for uploadBytes)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const snapshot = await uploadTask;
        clearInterval(progressInterval);
        setUploadProgress(100);

        const downloadURL = await getDownloadURL(snapshot.ref);

        messageData = {
          ...messageData,
          type: fileToUpload.type,
          fileUrl: downloadURL,
          fileName: fileToUpload.file.name,
          text:
            fileToUpload.type === "image"
              ? "Sent an image"
              : `Sent a file: ${fileToUpload.file.name}`,
        };
      }

      // Add new message to Firestore
      const docRef = await addDoc(collection(db, "chats"), messageData);

      // Update status to sent
      await updateDoc(docRef, { status: "sent" });

      // Update last message timestamp in doctor's document
      await updateDoc(doc(db, "doctors", doctorId), {
        lastMessage: serverTimestamp(),
      });

      // Update typing status
      await setDoc(doc(db, "chats", `${doctorId}_typing`), {
        isTyping: false,
        userId: adminUser.uid,
      });

      // Remove the temporary message once the real one is sent
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      setFileToUpload({ file: null, type: "image" });
      setUploadProgress(0);
    } catch (error) {
      console.error("Error sending message:", error);
      showToastMessage("Failed to send message");
      setUploadProgress(0);
      // Remove the temporary message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  };

  // Handle file selection
  const handleFileSelect = async (type: "image" | "document") => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: type === "image" ? CameraSource.Prompt : CameraSource.Photos,
          presentationStyle: "popover",
        });

        if (image.webPath) {
          const file = await fetch(image.webPath).then((res) => res.blob());
          setFileToUpload({
            file: new File([file], `photo_${Date.now()}.jpg`),
            type,
          });
        }
      } catch (error) {
        console.error("Error selecting image:", error);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Handle file input change (web)
  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "document"
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload({ file: e.target.files[0], type });
    }
  };

  // Send push notification
  const sendPushNotification = async (sender: string, message: string) => {
    if (!currentdoctor) return;

    try {
      // In a real app, you would send this to your backend which would then send the push notification
      // This is just a simulation
      const doctorDoc = await getDoc(doc(db, "doctors", doctorId));
      if (doctorDoc.exists() && doctorDoc.data().pushToken) {
        console.log(
          `Sending push to ${currentdoctor.name}: ${sender}: ${message}`
        );
        // Actual push would be sent from your server
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  };

  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Search messages
  const filteredMessages = messages.filter(
    (message) =>
      message.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (message.fileName &&
        message.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mark messages as read when entering the chat
  useIonViewWillEnter(() => {
    if (doctorId && auth.currentUser) {
      // Mark all unread messages from this doctor as read
      const unreadMessages = messages.filter(
        (msg) => msg.senderId !== auth.currentUser?.uid && msg.status !== "read"
      );

      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach((msg) => {
          const msgRef = doc(db, "chats", msg.id);
          batch.update(msgRef, { status: "read" });
        });
        batch.commit();
      }
    }
  });

  // Update typing status
  const updateTypingStatus = useCallback(
    async (typing: boolean) => {
      if (!doctorId || !auth.currentUser) return;

      try {
        await setDoc(doc(db, "chats", `${doctorId}_typing`), {
          isTyping: typing,
          userId: auth.currentUser.uid,
        });
      } catch (error) {
        console.error("Error updating typing status:", error);
      }
    },
    [doctorId]
  );

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar className="SMS_doctor-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <div className="header-content">
            <IonAvatar slot="start" className="header-avatar">
              <img
                src={
                  currentdoctor?.avatar ||
                  "https://ionicframework.com/docs/img/demos/avatar.svg"
                }
                alt="doctor"
              />
              <IonBadge
                color={currentdoctor?.isOnline ? "success" : "medium"}
                className="online-badge"
              ></IonBadge>
            </IonAvatar>
            <div className="header-text">
              <IonTitle>{currentdoctor?.name || "doctor Chat"}</IonTitle>
              <IonText color="medium" className="header-status">
                {currentdoctor?.isOnline
                  ? "Online"
                  : currentdoctor?.lastSeen
                  ? `Last seen ${formatLastSeen(currentdoctor.lastSeen)}`
                  : "Offline"}
              </IonText>
            </div>
          </div>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowSearch(true)}>
              <IonIcon icon={search} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-content" scrollEvents={true}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            <AnimatePresence>
              <IonList lines="none" className="message-list">
                {filteredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`message-container ${
                      message.senderId === auth.currentUser?.uid
                        ? "sent"
                        : "received"
                    }`}
                  >
                    <IonItem className="message-item">
                      {message.senderId !== auth.currentUser?.uid && (
                        <IonAvatar slot="start" className="message-avatar">
                          <img
                            src={
                              message.senderAvatar ||
                              "assets/avatar-placeholder.png"
                            }
                            alt={message.senderName}
                          />
                        </IonAvatar>
                      )}
                      <div className="message-bubble">
                        {message.type === "image" && message.fileUrl ? (
                          <div className="message-image-container">
                            <img
                              src={message.fileUrl}
                              alt="Sent image"
                              className="message-image"
                              onClick={() =>
                                window.open(message.fileUrl, "_blank")
                              }
                            />
                          </div>
                        ) : message.type === "document" && message.fileUrl ? (
                          <div
                            className="message-document"
                            onClick={() =>
                              window.open(message.fileUrl, "_blank")
                            }
                          >
                            <IonIcon icon={attach} className="document-icon" />
                            <IonText className="document-name">
                              {message.fileName}
                            </IonText>
                          </div>
                        ) : (
                          <IonText className="message-text">
                            {message.text}
                          </IonText>
                        )}
                        <div className="message-meta">
                          <span className="message-time">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {message.senderId === auth.currentUser?.uid && (
                            <span className="message-status">
                              {message.status === "read" ? (
                                <IonIcon icon={checkmarkDone} color="primary" />
                              ) : message.status === "delivered" ? (
                                <IonIcon icon={checkmarkDone} color="medium" />
                              ) : message.status === "sent" ? (
                                <IonIcon
                                  icon={checkmarkDone}
                                  color="medium"
                                  style={{ opacity: 0.5 }}
                                />
                              ) : null}
                            </span>
                          )}
                        </div>
                      </div>
                    </IonItem>
                  </motion.div>
                ))}
              </IonList>
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="typing-indicator"
              >
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <IonText className="typing-text">
                  {currentdoctor?.name || "doctor"} is typing...
                </IonText>
              </motion.div>
            )}
          </>
        )}
      </IonContent>

      <IonFooter className="chat-footer">
        {uploadProgress > 0 && uploadProgress < 100 && (
          <IonProgressBar
            value={uploadProgress / 100}
            color="primary"
          ></IonProgressBar>
        )}
        <IonToolbar>
          <div className="message-input-container">
            <IonButton
              fill="clear"
              onClick={() => handleFileSelect("image")}
              className="attach-button"
            >
              <IonIcon icon={attach} />
            </IonButton>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept={fileToUpload.type === "image" ? "image/*" : "*/*"}
              onChange={(e) => handleFileInputChange(e, fileToUpload.type)}
            />
            <IonItem lines="none" className="input-item">
              {" "}
              <IonTextarea
                value={newMessage}
                placeholder="Type a message..."
                onIonChange={(e) => {
                  setNewMessage(e.detail.value!);
                  if (!isTyping && e.detail.value!.trim().length > 0) {
                    updateTypingStatus(true);
                  } else if (isTyping && e.detail.value!.trim().length === 0) {
                    updateTypingStatus(false);
                  }
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSendMessage()
                }
                className="message-input"
                autoGrow
                rows={1}
              />
            </IonItem>

            <IonButton
              fill="clear"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && !fileToUpload.file}
              className="send-button"
            >
              <IonIcon icon={send} className="send-icon" />
            </IonButton>
          </div>
        </IonToolbar>

        {fileToUpload.file && (
          <div className="file-preview">
            <IonChip color="primary">
              <IonLabel>{fileToUpload.file.name}</IonLabel>
              <IonIcon
                icon={close}
                onClick={() => setFileToUpload({ file: null, type: "image" })}
              />
            </IonChip>
          </div>
        )}
      </IonFooter>

      {/* Search Modal */}
      <IonModal isOpen={showSearch} onDidDismiss={() => setShowSearch(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowSearch(false)}>Close</IonButton>
            </IonButtons>
            <IonTitle>Search Messages</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonSearchbar
            value={searchQuery}
            onIonChange={(e) => setSearchQuery(e.detail.value!)}
            placeholder="Search messages"
            animated
          />

          <IonList>
            {filteredMessages.map((message) => (
              <IonItem
                key={`search-${message.id}`}
                onClick={() => {
                  setShowSearch(false);
                  // Scroll to message
                  const element = document.getElementById(
                    `message-${message.id}`
                  );
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                    element.classList.add("highlight-message");
                    setTimeout(
                      () => element.classList.remove("highlight-message"),
                      2000
                    );
                  }
                }}
              >
                <IonLabel>
                  <h3>{message.senderName}</h3>
                  <p>
                    {message.text ||
                      (message.fileName ? `File: ${message.fileName}` : "")}
                  </p>
                  <p>{message.timestamp.toLocaleString()}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
      />
    </IonPage>
  );
};

// Helper function to format last seen time
function formatLastSeen(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInMinutes < 24 * 60)
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  return `${Math.floor(diffInMinutes / (24 * 60))} days ago`;
}

export default SMS_doctor;
