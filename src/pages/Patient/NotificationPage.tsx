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

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" icon={closeOutline} />
          </IonButtons>
          <IonTitle>
            Notifications
            {unreadCount > 0 && (
              <IonBadge color="danger" style={{ marginLeft: "8px" }}>
                {unreadCount}
              </IonBadge>
            )}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => markAsRead()}>Read all</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent class="ion-padding">
        <IonList className="notification-list">
          {notifications.length === 0 ? (
            <IonItem lines="none">
              <IonLabel className="ion-text-center">
                <h2>No notifications yet</h2>
                <p>Notifications will appear here</p>
              </IonLabel>
            </IonItem>
          ) : (
            notifications.map((notification, index) => (
              <IonItem
                key={index}
                className={
                  !(notification.data as any)?.read ? "unread" : "read"
                }
                onClick={() => markAsRead(notification.id)}
                detail={false}
                lines="none"
              >
                <IonLabel>
                  <h2>{notification.title}</h2>
                  <br />
                  <p>{notification.body}</p>

                  {notification.data && (
                    <p className="notification-data">
                      {JSON.stringify(notification.data)}
                    </p>
                  )}
                </IonLabel>
                <IonNote slot="end">
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
