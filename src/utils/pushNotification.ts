/**
 * pushNotification.ts
 *
 * Shared utility for sending push notifications in HomeCare237.
 * Every call:
 *   1. Writes a document to the Firestore `notifications` collection so the
 *      recipient sees the notification in their in-app notification centre
 *      (even when offline / on another device).
 *   2. Fires a local (on-device) notification via NotificationService so the
 *      current user hears a sound / sees a banner immediately when they are
 *      using the app.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import NotificationService from "../components/Services/NotificationServices";

export interface PushPayload {
  /** Firestore UID of the user who should receive the notification. */
  recipientId: string;
  /** Short notification title (shown in banner / notification centre). */
  title: string;
  /** Body text of the notification. */
  body: string;
  /** Optional extra data attached to the Firestore document. */
  data?: Record<string, any>;
}

/**
 * Send a push notification to a user.
 *
 * - Writes to Firestore `notifications` collection (picked up by
 *   NotificationContext's real-time listener on any device the user is
 *   signed in to).
 * - Also fires a local notification on the *current* device so the person
 *   acting (e.g. a doctor accepting an appointment) gets immediate feedback.
 *
 * Both steps are attempted independently – a failure in one does not prevent
 * the other.
 */
export async function sendPushNotification(payload: PushPayload): Promise<void> {
  const { recipientId, title, body, data = {} } = payload;

  // 1. Persist to Firestore so the recipient receives it on any device
  try {
    await addDoc(collection(db, "notifications"), {
      recipientId,
      title,
      body,
      data,
      timestamp: serverTimestamp(),
      read: false,
    });
  } catch (err) {
    console.warn("[pushNotification] Failed to write Firestore notification:", err);
  }

  // 2. Only fire a local notification if the recipient is the current user (e.g., self-reminder),
  // avoiding alerting the sender with a notification intended for someone else.
  try {
    const currentUid = auth.currentUser?.uid;
    if (currentUid && recipientId === currentUid) {
      await NotificationService.sendNow(title, body, { recipientId, ...data });
    }
  } catch (err) {
    console.warn("[pushNotification] Failed to fire local notification:", err);
  }
}
