// src/components/VoiceFlowChatModal.tsx
import React, { useState, useRef, useEffect } from "react";
import { db, auth, storage } from "../../firebaseconfig";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { User } from "firebase/auth";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonItem,
  IonLabel,
  IonList,
  IonAvatar,
  IonSpinner,
  IonFooter,
  IonGrid,
  IonRow,
  IonCol,
  IonTextarea,
  IonChip,
  IonCard,
  IonCardContent,
  IonImg,
} from "@ionic/react";
import {
  send,
  close,
  search,
  person,
  medical,
  heart,
  arrowUp,
  warning,
  informationCircle,
} from "ionicons/icons";
import { VoiceFlowService } from "../../components/Services/AiModelService";
import "./ChatInterface.scss";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  type?: "general" | "symptom" | "advice" | "warning";
  firebaseId?: string; // Firebase document ID
}

interface VoiceFlowChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  versionID?: string;
}

const VoiceFlowChatModal: React.FC<VoiceFlowChatModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  versionID = "production",
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const contentRef = useRef<HTMLIonContentElement>(null);
  const voiceFlowService = useRef(
    new VoiceFlowService(apiKey, versionID),
  ).current;

  // Get current user from Firebase Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        // Get user name from displayName or email
        const name = user.displayName || user.email?.split("@")[0] || "User";
        setUserName(name);

        // Load conversation history when user is authenticated
        if (isOpen) {
          loadConversationHistory(user.uid);
        }
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  const scrollToBottom = () => {
    setTimeout(() => {
      contentRef.current?.scrollToBottom(300);
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Load conversation history from Firebase
  const loadConversationHistory = (userId: string) => {
    try {
      const messagesRef = collection(db, "healthChats");
      const q = query(
        messagesRef,
        where("userId", "==", userId),
        orderBy("timestamp", "asc"),
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loadedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            id: doc.id,
            firebaseId: doc.id,
            role: data.role,
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date(),
            type: data.type || "general",
          });
        });

        // Only update if we have messages from Firebase
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        } else if (messages.length === 0) {
          // Add welcome message only if no history exists
          addWelcomeMessage();
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading conversation history:", error);
      addWelcomeMessage();
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: "welcome",
      role: "assistant",
      content: `Hello${
        userName !== "User" ? ` ${userName}` : ""
      }! I'm your Health Assistant. I can help you with health-related questions, symptom information, wellness tips, and general medical guidance. Please remember I'm an AI assistant and not a substitute for professional medical advice. For emergencies, always contact your healthcare provider or emergency services.`,
      timestamp: new Date(),
      type: "general",
    };
    setMessages([welcomeMessage]);
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      setError(null);
      if (messages.length === 0) {
        loadConversationHistory(currentUser.uid);
      }
    }
  }, [isOpen, currentUser]);

  const determineMessageType = (
    content: string,
  ): "general" | "symptom" | "advice" | "warning" => {
    const lowerContent = content.toLowerCase();

    if (
      lowerContent.includes("emergency") ||
      lowerContent.includes("urgent") ||
      lowerContent.includes("see a doctor") ||
      lowerContent.includes("contact your")
    ) {
      return "warning";
    }

    if (
      lowerContent.includes("symptom") ||
      lowerContent.includes("pain") ||
      lowerContent.includes("fever") ||
      lowerContent.includes("headache")
    ) {
      return "symptom";
    }

    if (
      lowerContent.includes("advice") ||
      lowerContent.includes("tip") ||
      lowerContent.includes("recommend") ||
      lowerContent.includes("should")
    ) {
      return "advice";
    }

    return "general";
  };

  // Save message to Firebase
  const saveMessageToFirebase = async (
    userId: string,
    userName: string,
    message: Omit<Message, "id">,
  ) => {
    try {
      const messagesRef = collection(db, "healthChats");
      const docRef = await addDoc(messagesRef, {
        userId,
        userName,
        role: message.role,
        content: message.content,
        type: message.type || "general",
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving message to Firebase:", error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentUser) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Save user message to Firebase
    const firebaseId = await saveMessageToFirebase(
      currentUser.uid,
      userName,
      userMessage,
    );
    if (firebaseId) {
      userMessage.firebaseId = firebaseId;
    }

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    // Create assistant message placeholder for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      type: "general",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Use VoiceFlow streaming with current user ID
      await voiceFlowService.sendMessageStream(
        currentUser.uid, // Use Firebase user ID
        inputMessage.trim(),
        (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
      );

      // Determine message type and mark streaming as complete
      const finalContent =
        messages.find((msg) => msg.id === assistantMessageId)?.content || "";
      const messageType = determineMessageType(finalContent);

      // Save assistant response to Firebase
      const assistantFirebaseMessage = {
        id: assistantMessageId,
        role: "assistant" as const,
        content: finalContent,
        timestamp: new Date(),
        type: messageType,
      };

      const assistantFirebaseId = await saveMessageToFirebase(
        currentUser.uid,
        "Health Assistant",
        assistantFirebaseMessage,
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
                type: messageType,
                firebaseId: assistantFirebaseId || undefined,
              }
            : msg,
        ),
      );
    } catch (error) {
      // Remove streaming message and show error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessageId),
      );
      setError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred. Please check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    if (!currentUser) return;

    try {
      await voiceFlowService.resetConversation(currentUser.uid);

      // Note: In a real app, you might want to:
      // 1. Delete messages from Firebase (optional)
      // 2. Or just clear local state and keep history

      setMessages([]);
      setError(null);

      // Add fresh welcome message
      addWelcomeMessage();
    } catch (error) {
      console.warn("Failed to reset VoiceFlow conversation:", error);
    }
  };

  const getMessageClass = (type: string) => {
    switch (type) {
      case "warning":
        return "message-warning";
      case "symptom":
        return "message-symptom";
      case "advice":
        return "message-advice";
      default:
        return "message-general";
    }
  };

  // Loading component
  const LoadingIndicator = () => (
    <div className="loading-indicator">
      <div className="loading-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      className="health-assistant-modal"
    >
      <IonHeader class="ion-no-border">
        <IonToolbar className="health-toolbar">
          <IonAvatar slot="start">
            <IonImg src={"https://cdn.voiceflow.com/assets/logo.png"} />
          </IonAvatar>
          <IonTitle className="assistant-title">Health Assistant</IonTitle>

          <IonButton slot="end" fill="clear" onClick={onClose} color={"dark"}>
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-content">
        {error && (
          <div className="error-banner">
            <IonIcon icon={warning} />
            <IonText>
              <small>{error}</small>
            </IonText>
          </div>
        )}

        {/* Authentication Notice */}
        {!currentUser && (
          <IonCard className="auth-notice">
            <IonCardContent>
              <IonIcon icon={warning} />
              <strong>Please sign in</strong> to save and access your
              conversation history.
            </IonCardContent>
          </IonCard>
        )}

        {/* Emergency Notice */}
        <IonCard className="emergency-notice">
          <IonCardContent>
            <IonIcon icon={warning} />
            <strong>Important:</strong> For medical emergencies, call your local
            emergency number immediately.
          </IonCardContent>
        </IonCard>

        {messages.length <= 1 ? (
          <div className="empty-state">
            <IonAvatar slot="start">
              <IonImg src={"https://cdn.voiceflow.com/assets/logo.png"} />
            </IonAvatar>
            <IonText>
              {currentUser && (
                <IonText color="medium" className="user-greeting">
                  <h1>Hello, {userName} I'am your health assistant</h1>
                </IonText>
              )}
              <p>
                I'm here to provide health information and wellness guidance.
                Ask me about symptoms, treatments, or healthy living tips.
              </p>
              {currentUser && (
                <p className="welcome-user">Welcome back, {userName}!</p>
              )}
            </IonText>

            <div className="disclaimer">
              <IonText color="medium">
                <small>
                  Remember: This is for informational purposes only. Always
                  consult healthcare professionals for medical advice.
                </small>
              </IonText>
            </div>
          </div>
        ) : (
          <IonGrid className="message-list">
            {messages
              .filter((msg) => msg.id !== "welcome")
              .map((message) => (
                <div
                  key={message.firebaseId || message.id}
                  className={`message-container ${
                    message.role
                  }-message ${getMessageClass(message.type || "general")}`}
                >
                  <IonItem lines="none" className="message-item">
                    <IonLabel className="message-content">
                      <div className="message-text">
                        {message.content}
                        {message.isStreaming && message.content === "" ? (
                          <LoadingIndicator />
                        ) : null}
                      </div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {message.type === "warning" && (
                          <span className="message-tag">Important</span>
                        )}
                      </div>
                    </IonLabel>
                  </IonItem>
                </div>
              ))}
          </IonGrid>
        )}
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonGrid>
            <IonRow className="input-row">
              <IonCol size="10">
                <IonItem lines="none" className="input-container">
                  <IonTextarea
                    placeholder={`${userName}, describe your health question or concern...`}
                    value={inputMessage}
                    onIonInput={(e) => setInputMessage(e.detail.value!)}
                    onKeyPress={handleKeyPress}
                    className="message-input"
                    disabled={isLoading || !currentUser}
                    autoGrow={true}
                    rows={1}
                    maxlength={1000}
                  />
                </IonItem>
              </IonCol>
              <IonCol size="2">
                <IonButton
                  expand="block"
                  fill="solid"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading || !currentUser}
                  className="send-button"
                  shape="round"
                >
                  {isLoading ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <IonIcon icon={arrowUp} color="light" />
                  )}
                </IonButton>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol>
                <div className="chat-actions">
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={clearChat}
                    disabled={messages.length <= 1 || !currentUser}
                    className="clear-chat-button"
                  >
                    Clear Conversation
                  </IonButton>
                  <IonText color="medium" className="api-info">
                    Powered by VoiceFlow
                  </IonText>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};

export default VoiceFlowChatModal;
