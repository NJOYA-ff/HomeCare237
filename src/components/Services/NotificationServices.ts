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
import { isPlatform } from "@ionic/react";

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
      // Request permissions
      if (isPlatform("hybrid")) {
        const permission = await PushNotifications.requestPermissions();

        if (permission.receive === "granted") {
          // Register with Apple/Google to receive push via FCM
          await PushNotifications.register();

          // Set up listeners
          this.setupListeners();
        }
      }

      this.isInitialized = true;
      console.log("Notification service initialized");
    } catch (error) {
      console.error("Error initializing notifications:", error);
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

  // Send token to your backend
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // Replace with your backend endpoint
      const response = await fetch(
        "https://your-backend.com/api/register-device",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            platform: isPlatform("ios") ? "ios" : "android",
            userId: "current-user-id", // Get from your auth system
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to register device token");
      }

      console.log("Token sent to server successfully");
    } catch (error) {
      console.error("Error sending token to server:", error);
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    notification: NotificationPayload
  ): Promise<void> {
    try {
      // Request permission for local notifications
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display !== "granted") {
        console.warn("Local notification permission not granted");
        return;
      }

      const options: ScheduleOptions = {
        notifications: [
          {
            id: notification.id || Date.now(),
            title: notification.title,
            body: notification.body,
            extra: notification.data || {},
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule for 1 second later
            sound: "beep.wav",
            attachments: undefined,
            actionTypeId: "",
          },
        ],
      };

      await LocalNotifications.schedule(options);
      console.log("Local notification scheduled");
    } catch (error) {
      console.error("Error scheduling local notification:", error);
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

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      // Retrieve pending notifications and cancel them by id
      const pending = await LocalNotifications.getPending();
      const ids = (pending.notifications || []).map((n: any) =>
        typeof n.id === "number" ? n.id : Number(n.id)
      );

      if (ids.length > 0) {
        await LocalNotifications.cancel({ notifications: ids });
      }
    } catch (error) {
      console.error("Error cancelling notifications:", error);
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
}

export default new NotificationService();
