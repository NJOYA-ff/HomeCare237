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
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { EmptyState } from "../../components/ui";
import {
  trashOutline,
  checkmarkDoneOutline,
  closeOutline,
  notificationsOutline,
} from "ionicons/icons";
import { useNotifications } from "../../context/NotificationContext";
import "../Patient/NotificationPage.scss";

const DoctorNotifications: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    sendLocalNotification,
  } = useNotifications();

  const seenDocIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(false);
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

  // Mirror behavior from patient page: send a local notification for newly received items
  useEffect(() => {
    if (!mountedRef.current) {
      notifications.forEach((n) => {
        const docId = (n.data as any)?.docId;
        if (docId) seenDocIdsRef.current.add(docId);
      });
      mountedRef.current = true;
      return;
    }

    notifications.forEach((n) => {
      const docId = (n.data as any)?.docId;
      if (docId && !seenDocIdsRef.current.has(docId)) {
        try {
          sendLocalNotification(
            n.title || "Notification",
            n.body || "",
            n.data as any,
          );
        } catch (err) {
          console.warn(
            "Failed to send local notification from DoctorNotifications:",
            err,
          );
        }
        seenDocIdsRef.current.add(docId);
      }
    });
  }, [notifications, sendLocalNotification]);

  return (
    <IonPage className="notifications-page">
      <IonHeader class="ion-no-border">
        <IonToolbar className="patient-dashboard-toolbar notifications-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doc/dashboard" icon={closeOutline} />
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
              onClick={() => markAsRead()}
              color={"dark"}
            >
              Read all
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard-patient notifications-content ion-padding">
        <IonList className="notification-list patient-surface-list">
          {notifications.length === 0 ? (
            <EmptyState
              icon={notificationsOutline}
              title="No notifications yet"
              description="Appointment requests, referrals, and patient updates will appear here."
            />
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

      <MessageBox
        isOpen={showClearAlert}
        title="Clear All Notifications"
        message="Are you sure you want to clear all notifications?"
        tone="danger"
        actions={[
          {
            label: "Cancel",
            color: "medium",
            onClick: () => setShowClearAlert(false),
          },
          {
            /* Clearing wipes every notification for good, so the confirm action
               carries the danger colour. */
            label: "Clear",
            color: "danger",
            onClick: () => {
              setShowClearAlert(false)
              clearAll();
            },
          },
        ]}
        onDismiss={() => setShowClearAlert(false)}
      />
    </IonPage>
  );
};

export default DoctorNotifications;
