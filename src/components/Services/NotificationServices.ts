import {
  PushNotifications,
  Token,
  ActionPerformed,
  PushNotificationSchema,
} from "@capacitor/push-notifications";
import {
  LocalNotifications,
  ScheduleOptions,
} from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { isPlatform } from "@ionic/react";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore";

/**
 * The channel ID must match:
 *  - strings.xml  → default_notification_channel_id
 *  - AndroidManifest meta-data → firebase_messaging_default_notification_channel_id
 *  - capacitor.config.ts → LocalNotifications.smallIcon
 */
const CHANNEL_ID   = "homecare237_default";
const CHANNEL_NAME = "HomeCare237 Notifications";
const SMALL_ICON   = "ic_notification";   // @mipmap/ic_notification
const ICON_COLOR   = "#2563EB";           // brand primary

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  id?: number;
}

class NotificationService {
  private isInitialized = false;
  private notificationListeners: ((
    notification: NotificationPayload
  ) => void)[] = [];

  // Initialize notifications
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (isPlatform("hybrid")) {
        // ── 1. Create the local-notification channel (Android 8+, API 26+) ──
        // Must be done BEFORE scheduling any notifications, and before
        // requesting push permission, so FCM background messages land here too.
        if (Capacitor.getPlatform() === "android") {
          try {
            await LocalNotifications.createChannel({
              id:          CHANNEL_ID,
              name:        CHANNEL_NAME,
              description: "Appointment reminders, medication alerts, and health updates.",
              importance:  5,          // IMPORTANCE_HIGH → shows heads-up notification
              visibility:  1,          // VISIBILITY_PUBLIC
              sound:       "beep.wav",
              vibration:   true,
              lights:      true,
              lightColor:  ICON_COLOR,
            });
            console.log("[NotificationService] Notification channel created:", CHANNEL_ID);
          } catch (channelErr) {
            // Channel may already exist — not fatal
            console.warn("[NotificationService] createChannel:", channelErr);
          }
        }

        // ── 2. Request push notification permission ──────────────────────────
        const permission = await PushNotifications.requestPermissions();

        if (permission.receive === "granted") {
          // Register with FCM (Android) / APNs (iOS) to get a push token
          await PushNotifications.register();
          this.setupListeners();
        } else {
          console.warn("[NotificationService] Push permission not granted:", permission.receive);
        }
      }

      this.isInitialized = true;
      console.log("[NotificationService] Initialized");
    } catch (error) {
      console.error("[NotificationService] Initialization error:", error);
    }
  }

  // Set up push notification listeners
  private setupListeners(): void {
    // On successful registration
    PushNotifications.addListener("registration", (token: Token) => {
      console.log("Push registration success, token:", token.value);
      // Send this token to your backend server
      this.sendTokenToServer(token.value);
    });

    // On registration error
    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("Push registration error:", error);
    });

    // When a push notification is received in foreground
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("Push received in foreground:", notification);
        this.notifyListeners({
          title: notification.title || "Notification",
          body: notification.body || "",
          data: notification.data,
        });
      }
    );

    // When a push notification is tapped/opened
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        console.log("Push action performed:", action);
        this.notifyListeners({
          title: action.notification.title || "Notification",
          body: action.notification.body || "",
          data: action.notification.data,
        });
      }
    );

    // App opened from notification (when app was closed)
    App.addListener("appUrlOpen", (data: any) => {
      if (data.url) {
        // Handle deep links from notifications
        console.log("App opened from URL:", data.url);
      }
    });
  }

  /**
   * Persist the FCM/APNs device token to the signed-in user's Firestore
   * document so server-side code (Cloud Functions / backend) can use it to
   * send targeted push notifications to this device.
   *
   * The token is written under the user's document in the `patients`,
   * `doctors`, or `admins` collection (whichever one the user was registered
   * in).  We also keep a secondary document in a flat `fcmTokens` collection
   * for easy server-side fan-out queries.
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.warn("[NotificationService] No authenticated user — cannot save FCM token");
        return;
      }

      const db = getFirestore();
      const platform = isPlatform("ios") ? "ios" : "android";
      const tokenData = {
        fcmToken: token,
        fcmTokenPlatform: platform,
        fcmTokenUpdatedAt: new Date().toISOString(),
      };

      // 1. Try to update the user document in each possible collection.
      //    setDoc with merge:true will not fail even if the doc doesn't exist
      //    in that collection — it will create it.  We only write to the first
      //    collection where the document already exists.
      const collections = ["patients", "doctors", "admins"];
      const { getDoc } = await import("firebase/firestore");

      let saved = false;
      for (const col of collections) {
        const ref = doc(db, col, user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await setDoc(ref, tokenData, { merge: true });
          saved = true;
          console.log(`[NotificationService] FCM token saved to ${col}/${user.uid}`);
          break;
        }
      }

      // 2. Always write to the flat fcmTokens collection so Cloud Functions
      //    can query all tokens without knowing which role collection to look in.
      await setDoc(doc(db, "fcmTokens", user.uid), {
        uid: user.uid,
        ...tokenData,
      }, { merge: true });

      if (!saved) {
        console.warn("[NotificationService] User document not found in any role collection — token saved only to fcmTokens");
      }
    } catch (error) {
      console.error("[NotificationService] Error saving FCM token to Firestore:", error);
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    notification: NotificationPayload
  ): Promise<void> {
    // Respect the user's notifications toggle
    if (localStorage.getItem("hc_notifications") === "false") return;

    try {
      // Request permission for local notifications (needed on Android 13+ and iOS)
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display !== "granted") {
        console.warn("[NotificationService] Local notification permission not granted");
        return;
      }

      // Respect the user's sound toggle
      const soundEnabled = localStorage.getItem("hc_sound") !== "false";

      const options: ScheduleOptions = {
        notifications: [
          {
            id:           notification.id ?? Date.now(),
            title:        notification.title,
            body:         notification.body,
            extra:        notification.data ?? {},
            schedule:     { at: new Date(Date.now() + 500) },
            sound:        soundEnabled ? "beep.wav" : undefined,
            // ── Android-specific fields ──────────────────────────────────
            // smallIcon: the white-on-transparent drawable from mipmap-*
            smallIcon:    SMALL_ICON,
            // iconColor: accent colour behind the small icon in the shade
            iconColor:    ICON_COLOR,
            // channelId: must match the channel created in initialize()
            channelId:    CHANNEL_ID,
            // largeIcon: show the round launcher icon as the large icon
            // (this is the full-colour app logo visible in the expanded view)
            largeIcon:    "ic_launcher_round",
            // ────────────────────────────────────────────────────────────
            attachments:  undefined,
            actionTypeId: "",
          },
        ],
      };

      await LocalNotifications.schedule(options);
      console.log("[NotificationService] Local notification scheduled:", notification.title);
    } catch (error) {
      console.error("[NotificationService] Error scheduling local notification:", error);
    }
  }

  // Send immediate local notification
  async sendNow(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.scheduleLocalNotification({
      title,
      body,
      data,
      id: Date.now(),
    });
  }

  // Get pending notifications
  async getPendingNotifications(): Promise<any> {
    const pending = await LocalNotifications.getPending();
    return pending.notifications;
  }

  // Cancel all pending local notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (!pending.notifications?.length) return;

      // LocalNotifications.cancel() expects { notifications: [{ id: number }] }
      // NOT { notifications: [number] } — that was the previous bug.
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({
          id: typeof n.id === "number" ? n.id : Number(n.id),
        })),
      });
    } catch (error) {
      console.error("[NotificationService] Error cancelling notifications:", error);
    }
  }

  // Subscribe to notification events
  subscribe(callback: (notification: NotificationPayload) => void): () => void {
    this.notificationListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.notificationListeners.indexOf(callback);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(notification: NotificationPayload): void {
    this.notificationListeners.forEach((listener) => {
      listener(notification);
    });
  }

  // Check if push notifications are available
  isPushAvailable(): boolean {
    return isPlatform("hybrid");
  }

  /**
   * Convenience wrapper — mirrors the standalone `sendPushNotification` helper
   * so callers that already import NotificationService can call
   * `NotificationService.sendPush(payload)` directly.
   *
   * Note: this fires only a LOCAL notification. For cross-device delivery
   * (i.e. writing to Firestore so another user's device receives it) use the
   * standalone `sendPushNotification` utility in `src/utils/pushNotification.ts`.
   */
  async sendPush(title: string, body: string, data?: Record<string, any>): Promise<void> {
    await this.sendNow(title, body, data);
  }
}

export default new NotificationService();
