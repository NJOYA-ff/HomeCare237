/**
 * WebPushService.ts
 *
 * Handles Firebase Cloud Messaging for PWA / browser (non-Capacitor) users.
 *
 * Responsibilities:
 *  1. Registers the firebase-messaging-sw.js service worker.
 *  2. Requests notification permission from the browser.
 *  3. Retrieves the FCM token and persists it to Firestore so the backend
 *     can target this browser session.
 *  4. Sets up an onMessage() handler so foreground push messages are surfaced
 *     to the NotificationContext subscribers.
 *
 * NOTE: This module is intentionally a no-op when running inside a Capacitor
 * native WebView because @capacitor/push-notifications handles that platform.
 * The isPlatform("hybrid") guard ensures we never double-register tokens.
 */

import { getToken, onMessage, Messaging } from "firebase/messaging";
import { isPlatform } from "@ionic/react";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WebPushMessageHandler = (payload: {
  title: string;
  body: string;
  data?: Record<string, any>;
}) => void;

// ── Service ───────────────────────────────────────────────────────────────────

class WebPushService {
  private unsubscribeOnMessage: (() => void) | null = null;
  private handlers: WebPushMessageHandler[] = [];

  /**
   * Initialise web push.
   *
   * Must be called after Firebase auth is ready and the user is signed in so
   * the token can be associated with the correct Firestore user document.
   *
   * @param messagingInstance – the Messaging instance from firebaseconfig.ts
   * @param vapidKey          – your VAPID / Web Push certificate key from the
   *                            Firebase Console → Project Settings → Cloud Messaging
   */
  async init(messagingInstance: Messaging, vapidKey: string): Promise<void> {
    // Only run in the browser – native Capacitor uses @capacitor/push-notifications
    if (isPlatform("hybrid")) return;

    // Validate the VAPID key before doing anything — Firebase throws an
    // opaque InvalidAccessError if it is missing, empty, or still a placeholder.
    if (
      !vapidKey ||
      vapidKey.trim() === "" ||
      vapidKey === "your_vapid_key_here"
    ) {
      console.info(
        "[WebPushService] VAPID key not configured — skipping web push registration.\n" +
        "To enable PWA push notifications:\n" +
        "  1. Go to Firebase Console → Project Settings → Cloud Messaging → Web Push certificates\n" +
        "  2. Click 'Generate key pair' if none exists\n" +
        "  3. Copy the Key pair value\n" +
        "  4. Set VITE_FIREBASE_VAPID_KEY=<key> in your .env file\n" +
        "  5. Restart the dev server"
      );
      return;
    }

    // Service workers are required for web push
    if (!("serviceWorker" in navigator)) {
      console.warn("[WebPushService] Service workers are not supported in this browser");
      return;
    }

    try {
      // Register (or reuse) the FCM service worker
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );
      console.log("[WebPushService] Service worker registered:", registration.scope);

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("[WebPushService] Notification permission denied");
        return;
      }

      // Get the FCM token
      const token = await getToken(messagingInstance, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log("[WebPushService] FCM web token:", token);
        await this.saveTokenToFirestore(token);
      } else {
        console.warn("[WebPushService] No FCM token returned");
      }

      // Handle foreground messages
      const unsub = onMessage(messagingInstance, (payload) => {
        console.log("[WebPushService] Foreground message:", payload);
        const title =
          payload.notification?.title ||
          (payload.data?.title as string) ||
          "HomeCare237";
        const body =
          payload.notification?.body ||
          (payload.data?.body as string) ||
          "";
        this.notifyHandlers({ title, body, data: payload.data as Record<string, any> });
      });

      // Replace any previous listener
      if (this.unsubscribeOnMessage) this.unsubscribeOnMessage();
      this.unsubscribeOnMessage = unsub;
    } catch (err) {
      console.error("[WebPushService] Initialisation error:", err);
    }
  }

  /** Clean up the foreground message listener. */
  destroy(): void {
    if (this.unsubscribeOnMessage) {
      this.unsubscribeOnMessage();
      this.unsubscribeOnMessage = null;
    }
  }

  /** Subscribe to foreground push messages. Returns an unsubscribe function. */
  subscribe(handler: WebPushMessageHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private notifyHandlers(payload: { title: string; body: string; data?: Record<string, any> }): void {
    this.handlers.forEach((h) => h(payload));
  }

  private async saveTokenToFirestore(token: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.warn("[WebPushService] No authenticated user — cannot save web FCM token");
        return;
      }

      const firestore = getFirestore();
      const tokenData = {
        fcmWebToken: token,
        fcmWebTokenUpdatedAt: new Date().toISOString(),
      };

      // Write to the user's role collection document
      const collections = ["patients", "doctors", "admins"];
      for (const col of collections) {
        const ref = doc(firestore, col, user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await setDoc(ref, tokenData, { merge: true });
          break;
        }
      }

      // Also write to the flat fcmTokens collection for easy server-side lookup
      await setDoc(
        doc(firestore, "fcmTokens", user.uid),
        { uid: user.uid, ...tokenData },
        { merge: true }
      );
    } catch (err) {
      console.error("[WebPushService] Error saving web FCM token:", err);
    }
  }
}

export const webPushService = new WebPushService();
