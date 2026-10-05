/**
 * useChatMessaging.ts
 *
 * Custom hook for chat/messaging functionality
 * Extracted from Consult.tsx for better code organization
 */

import { useState, useCallback, useEffect } from "react";
import { db, auth, storage } from "../firebaseconfig";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendPushNotification } from "../utils/pushNotification";
import { errorHandler, ErrorType, ErrorSeverity } from "../utils/errorHandler";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "image" | "audio" | "file";
  attachmentUrl?: string;
  timestamp: any;
  read: boolean;
  appointmentId?: string;
}

export const useChatMessaging = (appointmentId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  // Send text message
  const sendMessage = useCallback(async (
    content: string,
    recipientId: string,
    recipientName: string
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    setSending(true);
    setError(null);

    try {
      const messageData = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "User",
        content,
        type: "text",
        timestamp: Timestamp.now(),
        read: false,
        appointmentId,
      };

      await addDoc(collection(db, "messages"), messageData);

      // Send push notification to recipient
      await sendPushNotification({
        recipientId,
        title: "New Message",
        body: `${currentUser.displayName}: ${content.substring(0, 50)}...`,
        data: {
          type: "new_message",
          senderId: currentUser.uid,
          appointmentId,
        },
      });
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to send message",
        ErrorSeverity.MEDIUM,
        { action: "sendMessage", recipientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "sendMessage" });
      setError("Failed to send message. Please try again.");
      throw err;
    } finally {
      setSending(false);
    }
  }, [currentUser, appointmentId]);

  // Send image message
  const sendImage = useCallback(async (
    file: File,
    recipientId: string,
    recipientName: string
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    setSending(true);
    setError(null);

    try {
      // Upload image to storage
      const storageRef = ref(storage, `chat_images/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const messageData = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "User",
        content: "Image",
        type: "image",
        attachmentUrl: downloadURL,
        timestamp: Timestamp.now(),
        read: false,
        appointmentId,
      };

      await addDoc(collection(db, "messages"), messageData);

      // Send push notification to recipient
      await sendPushNotification({
        recipientId,
        title: "New Image",
        body: `${currentUser.displayName} sent an image`,
        data: {
          type: "new_image",
          senderId: currentUser.uid,
          appointmentId,
        },
      });
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to send image",
        ErrorSeverity.MEDIUM,
        { action: "sendImage", recipientId }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "sendImage" });
      setError("Failed to send image. Please try again.");
      throw err;
    } finally {
      setSending(false);
    }
  }, [currentUser, appointmentId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!currentUser) return;

    try {
      const batch = messageIds.map((id) =>
        updateDoc(doc(db, "messages", id), { read: true })
      );
      await Promise.all(batch);
    } catch (err) {
      const error = errorHandler.createError(
        ErrorType.SERVER,
        "Failed to mark messages as read",
        ErrorSeverity.LOW,
        { action: "markAsRead", messageIds }
      );
      errorHandler.log(error, { userId: currentUser?.uid, action: "markAsRead" });
    }
  }, [currentUser]);

  // Subscribe to messages for an appointment
  useEffect(() => {
    if (!appointmentId || !currentUser) return;

    setLoading(true);
    const messagesQuery = query(
      collection(db, "messages"),
      where("appointmentId", "==", appointmentId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesList: Message[] = [];
        snapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(messagesList);
        setLoading(false);
      },
      (err) => {
        const error = errorHandler.createError(
          ErrorType.NETWORK,
          "Failed to subscribe to messages",
          ErrorSeverity.MEDIUM,
          { action: "subscribeMessages", appointmentId }
        );
        errorHandler.log(error, { userId: currentUser?.uid, action: "subscribeMessages" });
        setError("Failed to load messages. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appointmentId, currentUser]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    sendImage,
    markAsRead,
  };
};