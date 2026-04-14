import React, { useState, useRef } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon,
  IonButtons, IonBackButton, IonNote, IonAlert, IonModal,
  IonInput, IonTextarea, IonSelect, IonSelectOption, IonSegment,
  IonSegmentButton, IonChip, IonSpinner,
} from "@ionic/react";
import {
  closeOutline, sendOutline, notificationsOutline, addOutline,
  peopleOutline, medicalOutline,
} from "ionicons/icons";
import {
  collection, addDoc, getDocs, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import { useNotifications } from "../../context/NotificationContext";
import "../Patient/NotificationPage.scss";

const AdminNotifications: React.FC = () => {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [showClearAlert, setShowClearAlert] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [tab, setTab] = useState<"inbox" | "send">("inbox");
  const [recipientType, setRecipientType] = useState<"all" | "doctors" | "patients">("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendAlert, setSendAlert] = useState({ show: false, msg: "" });

  const formatDate = (timestamp?: any) => {
    if (!timestamp) return "Just now";
    let date: Date;
    if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
      try { date = timestamp.toDate(); } catch { return "Just now"; }
    } else if (typeof timestamp === "number") {
      date = new Date(timestamp);
    } else if (typeof timestamp === "string") {
      date = new Date(timestamp);
    } else return "Just now";

    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setSendAlert({ show: true, msg: "Title and message are required." });
      return;
    }
    setSending(true);
    try {
      const collections: string[] = [];
      if (recipientType === "all") collections.push("doctors", "patients");
      else collections.push(recipientType);

      for (const col of collections) {
        const snap = await getDocs(query(collection(db, col), orderBy("createdAt", "desc")));
        const batch = snap.docs.map((d) =>
          addDoc(collection(db, "notifications"), {
            recipientId: d.data().uid || d.id,
            title: title.trim(),
            body: body.trim(),
            read: false,
            timestamp: serverTimestamp(),
            sentBy: "admin",
            recipientRole: col === "doctors" ? "doctor" : "patient",
          })
        );
        await Promise.all(batch);
      }

      setTitle("");
      setBody("");
      setSendAlert({ show: true, msg: "Notification sent successfully!" });
    } catch (e) {
      console.error(e);
      setSendAlert({ show: true, msg: "Failed to send notification." });
    } finally {
      setSending(false);
    }
  };

  return (
    <IonPage className="notifications-page">
      <IonHeader class="ion-no-border">
        <IonToolbar className="patient-dashboard-toolbar notifications-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" icon={closeOutline} />
          </IonButtons>
          <IonTitle className="notifications-title">
            Notifications
            {unreadCount > 0 && (
              <IonBadge color="danger" style={{ marginLeft: 8 }}>{unreadCount}</IonBadge>
            )}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => markAsRead()}>Read all</IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar>
          <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as any)}>
            <IonSegmentButton value="inbox">
              <IonLabel>Inbox</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="send">
              <IonLabel>Send</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dashboard-patient notifications-content ion-padding">
        {tab === "inbox" ? (
          <IonList className="notification-list patient-surface-list">
            {notifications.length === 0 ? (
              <IonItem lines="none" className="empty-notification-state">
                <IonLabel className="ion-text-center">
                  <h2>No notifications yet</h2>
                  <p>Notifications will appear here</p>
                </IonLabel>
              </IonItem>
            ) : (
              notifications.map((n, i) => (
                <IonItem
                  key={i}
                  className={`notification-item ${!(n.data as any)?.read ? "unread" : "read"}`}
                  onClick={() => markAsRead((n.data as any)?.docId ?? n.id)}
                  detail={false}
                  lines="none"
                >
                  <IonLabel>
                    <h2>{n.title}</h2>
                    <p>{n.body}</p>
                  </IonLabel>
                  <IonNote slot="end" className="notification-time">
                    {formatDate(n.data?.timestamp as number)}
                  </IonNote>
                </IonItem>
              ))
            )}
          </IonList>
        ) : (
          /* ---- Send Panel ---- */
          <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 8 }}>
            {/* Recipient selector */}
            <p style={{ fontSize: "0.75rem", color: "var(--ion-color-medium)", marginBottom: 8, fontWeight: 600 }}>
              SEND TO
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {(["all", "doctors", "patients"] as const).map((r) => (
                <IonChip
                  key={r}
                  color={recipientType === r ? "primary" : "medium"}
                  outline={recipientType !== r}
                  onClick={() => setRecipientType(r)}
                  style={{ cursor: "pointer" }}
                >
                  <IonIcon icon={r === "doctors" ? medicalOutline : r === "patients" ? peopleOutline : notificationsOutline} />
                  <IonLabel style={{ textTransform: "capitalize" }}>{r === "all" ? "Everyone" : r}</IonLabel>
                </IonChip>
              ))}
            </div>

            <IonItem className="form-item" style={{ marginBottom: 14 }}>
              <IonLabel position="floating">Title*</IonLabel>
              <IonInput value={title} onIonInput={(e) => setTitle(e.detail.value!)} />
            </IonItem>

            <IonItem className="form-item" style={{ marginBottom: 20 }}>
              <IonLabel position="floating">Message*</IonLabel>
              <IonTextarea
                value={body}
                onIonInput={(e) => setBody(e.detail.value!)}
                rows={4}
                autoGrow
              />
            </IonItem>

            <IonButton expand="block" onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}>
              {sending ? <IonSpinner name="crescent" /> : (
                <><IonIcon slot="start" icon={sendOutline} />Send Notification</>
              )}
            </IonButton>
          </div>
        )}
      </IonContent>

      <IonAlert
        isOpen={showClearAlert}
        onDidDismiss={() => setShowClearAlert(false)}
        header="Clear All"
        message="Clear all notifications?"
        buttons={[{ text: "Cancel", role: "cancel" }, { text: "Clear", handler: clearAll }]}
      />

      <IonAlert
        isOpen={sendAlert.show}
        onDidDismiss={() => setSendAlert({ show: false, msg: "" })}
        header="Notice"
        message={sendAlert.msg}
        buttons={["OK"]}
      />
    </IonPage>
  );
};

export default AdminNotifications;
