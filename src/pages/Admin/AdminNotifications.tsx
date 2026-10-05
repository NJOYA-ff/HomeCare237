import LoadingHelix from "../../components/LoadingHelix";
import React, { useState } from "react";
import {
  IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon,
  IonNote, IonInput, IonTextarea, IonToast, IonSegment,
  IonSegmentButton, IonChip, } from "@ionic/react";
import {
  closeOutline, sendOutline, notificationsOutline,
  medicalOutline, peopleOutline, trashOutline,
} from "ionicons/icons";
import {
  collection, addDoc, getDocs, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import { useNotifications } from "../../context/NotificationContext";
import {
  ConfirmDialog,
  EmptyState,
  FormField,
  PageShell,
} from "../../components/ui";
import "../Patient/NotificationPage.scss";

const AdminNotifications: React.FC = () => {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [showClearAlert, setShowClearAlert] = useState(false);
  const [tab, setTab] = useState<"inbox" | "send">("inbox");
  const [recipientType, setRecipientType] = useState<"all" | "doctors" | "patients">("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendAlert, setSendAlert] = useState<{
    show: boolean;
    msg: string;
    tone: "success" | "danger";
  }>({ show: false, msg: "", tone: "success" });

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
      setSendAlert({ show: true, msg: "Title and message are required.", tone: "danger" });
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
      setSendAlert({ show: true, msg: "Notification sent successfully!", tone: "success" });
    } catch (e) {
      console.error(e);
      setSendAlert({ show: true, msg: "Failed to send notification.", tone: "danger" });
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell
      className="notifications-page"
      title="Notifications"
      titleExtra={
        unreadCount > 0 ? (
          <IonBadge color="danger" style={{ marginLeft: 8 }}>{unreadCount}</IonBadge>
        ) : undefined
      }
      defaultHref="/admin/dashboard"
      backIcon={closeOutline}
      endActions={
        <>
          <IonButton onClick={() => markAsRead()}>Read all</IonButton>
          <IonButton
            fill="clear"
            color="medium"
            onClick={() => setShowClearAlert(true)}
            aria-label="Clear all notifications"
            title="Clear all notifications"
          >
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonButton>
        </>
      }
      toolbarExtra={
        <IonToolbar>
          <IonSegment color="primary" value={tab} onIonChange={(e) => setTab(e.detail.value as any)}>
            <IonSegmentButton value="inbox">
              <IonLabel>Inbox</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="send">
              <IonLabel>Send</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      }
      toolbarClassName="patient-dashboard-toolbar notifications-toolbar"
      titleClassName="notifications-title"
      contentClassName="dashboard-patient notifications-content ion-padding"
      layout="flush"
      contentExtras={
        <>
          <ConfirmDialog
            isOpen={showClearAlert}
            header="Clear all notifications?"
            message="This removes every notification from the inbox for this account."
            confirmLabel="Clear"
            destructive
            onConfirm={clearAll}
            onCancel={() => setShowClearAlert(false)}
          />
          <IonToast
            isOpen={sendAlert.show}
            onDidDismiss={() => setSendAlert({ show: false, msg: "", tone: "success" })}
            message={sendAlert.msg}
            color={sendAlert.tone}
            duration={2600}
            position="top"
          />
        </>
      }
    >
        {tab === "inbox" ? (
          notifications.length === 0 ? (
            <EmptyState
              icon={notificationsOutline}
              title="No notifications yet"
              description="Alerts about appointments, diagnoses and account activity will appear here."
              actionLabel="Compose a notification"
              onAction={() => setTab("send")}
            />
          ) : (
            <IonList className="notification-list patient-surface-list">
              {notifications.map((n, i) => (
                <IonItem
                  key={(n.data as any)?.docId ?? n.id ?? `notification-${i}`}
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
              ))}
            </IonList>
          )
        ) : (
          /* ---- Send Panel ---- */
          <div className="hc-form-panel">
            {/* Recipient selector */}
            <span className="hc-label" id="notification-recipients-label">
              Send to
            </span>
            <div
              className="hc-chip-row"
              role="group"
              aria-labelledby="notification-recipients-label"
            >
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

            <FormField label="Title" required helper="Shown as the notification heading.">
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value!)}
                placeholder="Notification title"
              />
            </FormField>

            <FormField label="Message" required helper="Keep it short — one or two sentences.">
              <IonTextarea
                value={body}
                onIonInput={(e) => setBody(e.detail.value!)}
                rows={4}
                autoGrow
                placeholder="Write your message here…"
              />
            </FormField>

            <IonButton expand="block" onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}>
              {sending ? <LoadingHelix color="white" /> : (
                <><IonIcon slot="start" icon={sendOutline} />Send Notification</>
              )}
            </IonButton>
          </div>
        )}
    </PageShell>
  );
};

export default AdminNotifications;
