import React, { useEffect, useRef } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonNote,
  IonAlert,
} from "@ionic/react";
import {
  trashOutline,
  checkmarkDoneOutline,
  close,
  closeOutline,
} from "ionicons/icons";
import { useNotifications } from "../../context/NotificationContext";
import "./NotificationPage.scss";

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    sendLocalNotification,
  } = useNotifications();
  const seenDocIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(false);

  // When the notifications list changes, trigger a local notification only for newly pushed Firestore notifications
  useEffect(() => {
    // On initial mount, mark existing notifications as seen so we don't spam the user
    if (!mountedRef.current) {
      notifications.forEach((n) => {
        const docId = (n.data as any)?.docId;
        if (docId) seenDocIdsRef.current.add(docId);
      });
      mountedRef.current = true;
      return;
    }

    // For subsequent updates, send a local notification for any new docId
    notifications.forEach((n) => {
      const docId = (n.data as any)?.docId;
      if (docId && !seenDocIdsRef.current.has(docId)) {
        try {
          // Use the provider helper to send a local/device notification
          sendLocalNotification(
            n.title || "Notification",
            n.body || "",
            n.data as any,
          );
        } catch (err) {
          console.warn(
            "Failed to send local notification from NotificationPage:",
            err,
          );
        }
        seenDocIdsRef.current.add(docId);
      }
    });
  }, [notifications, sendLocalNotification]);
  const [showClearAlert, setShowClearAlert] = React.useState(false);

  const formatDate = (timestamp?: any) => {
    if (!timestamp) return "Just now";

    let date: Date;

    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
      try {
        date = timestamp.toDate();
      } catch (e) {
        console.error("Error converting Firebase timestamp:", e);
        return "Just now";
      }
    }
    // Handle millisecond timestamps (number)
    else if (typeof timestamp === "number") {
      date = new Date(timestamp);
    }
    // Handle ISO string timestamps
    else if (typeof timestamp === "string") {
      date = new Date(timestamp);
    } else {
      return "Just now";
    }

    // Format the date
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    // Show relative time for recent notifications
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    // Fall back to locale string for older dates
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <IonPage className="notifications-page">
      <IonHeader class="ion-no-border">
        <IonToolbar className="patient-dashboard-toolbar notifications-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" icon={closeOutline} />
          </IonButtons>
          <IonTitle className="notifications-title">
            Notifications
            {unreadCount > 0 && (
              <IonBadge color="danger" style={{ marginLeft: "8px" }}>
                {unreadCount}
              </IonBadge>
            )}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              className="read-all-btn"
              color={"dark"}
              onClick={() => markAsRead()}
            >
              Read all
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard-patient notifications-content ion-padding">
        <IonList className="notification-list patient-surface-list">
          {notifications.length === 0 ? (
            <IonItem lines="none" className="empty-notification-state">
              <IonLabel className="ion-text-center">
                <h2>No notifications yet</h2>
                <p>Notifications will appear here</p>
              </IonLabel>
            </IonItem>
          ) : (
            notifications.map((notification, index) => (
              <IonItem
                key={index}
                className={`notification-item ${
                  !(notification.data as any)?.read ? "unread" : "read"
                }`}
                onClick={() =>
                  markAsRead(
                    (notification.data as any)?.docId ?? notification.id,
                  )
                }
                detail={false}
                lines="none"
              >
                <IonLabel>
                  <h2>{notification.title}</h2>
                  <br />
                  <p>{notification.body}</p>
                </IonLabel>
                <IonNote slot="end" className="notification-time">
                  {formatDate(notification.data?.timestamp as number)}
                </IonNote>
              </IonItem>
            ))
          )}
        </IonList>
      </IonContent>

      <IonAlert
        isOpen={showClearAlert}
        onDidDismiss={() => setShowClearAlert(false)}
        header="Clear All Notifications"
        message="Are you sure you want to clear all notifications?"
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
          },
          {
            text: "Clear",
            handler: clearAll,
          },
        ]}
      />
    </IonPage>
  );
};

export default NotificationsPage;
