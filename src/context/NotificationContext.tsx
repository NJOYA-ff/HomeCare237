import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import NotificationService, {
  NotificationPayload,
} from "../components/Services/NotificationServices";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseconfig";
import { useIonToast } from "@ionic/react";

interface NotificationContextType {
  notifications: NotificationPayload[];
  unreadCount: number;
  markAsRead: (id?: number | string) => Promise<void>;
  clearAll: () => void;
  sendLocalNotification: (
    title: string,
    body: string,
    data?: Record<string, any>
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [present] = useIonToast();

  useEffect(() => {
    // Initialize notification service
    NotificationService.initialize();

    // Subscribe to new notifications from the local NotificationService
    const localUnsubscribe = NotificationService.subscribe((notification) => {
      setNotifications((prev) => {
        const updated = [notification, ...prev];
        // persist
        localStorage.setItem("notifications", JSON.stringify(updated));
        return updated;
      });
      setUnreadCount((prev) => prev + 1);

      // Show toast for foreground notifications
      if (notification.title) {
        present({
          message: `${notification.title}: ${notification.body}`,
          duration: 3000,
          position: "top",
          buttons: [{ text: "View", handler: () => {} }],
        });
      }
    });

    // Load stored notifications (local only)
    loadStoredNotifications();

    // Set up Firestore listener for persisted notifications for the logged-in user
    const auth = getAuth();
    let firestoreUnsub: (() => void) | null = null;
    const prevNotifIds = new Set<string>();

    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Clean previous listener if any
      if (firestoreUnsub) {
        firestoreUnsub();
        firestoreUnsub = null;
      }

      if (!user) return;

      try {
        const q = query(
          collection(db, "notifications"),
          where("recipientId", "==", user.uid),
          orderBy("timestamp", "desc")
        );

        let isInitial = true;

        firestoreUnsub = onSnapshot(q, (querySnapshot) => {
          const docs = querySnapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          // Map to NotificationPayload and keep docId in data for deduping
          const firestoreNotifications: NotificationPayload[] = docs.map(
            (d) => ({
              title: d.title || "Notification",
              body: d.body || "",
              data: { ...(d.data || {}), docId: d.id, read: d.read, timestamp: d.timestamp },
            })
          );

          // Merge with existing local notifications: keep local-only items (no docId)
          setNotifications((prev) => {
            const localOnly = prev.filter((n) => !(n.data as any)?.docId);
            const merged = [...firestoreNotifications, ...localOnly];

            // Persist merged list
            try {
              localStorage.setItem("notifications", JSON.stringify(merged));
            } catch (err) {
              console.warn("Failed to persist merged notifications:", err);
            }

            // Determine unread count
            const unread = merged.filter((n) => !(n.data as any)?.read).length;
            setUnreadCount(unread);

            // For new items (after initial load) show a toast
            if (!isInitial) {
              const newDocs = docs.filter((d) => !prevNotifIds.has(d.id));
              newDocs.forEach((d) => {
                try {
                  present({
                    message: `${d.title || "Notification"}: ${d.body || ""}`,
                    duration: 3000,
                    position: "top",
                    buttons: [{ text: "View", handler: () => {} }],
                  });
                } catch (err) {
                  console.warn(
                    "Failed to present toast for firestore notification:",
                    err
                  );
                }
              });
            }

            // Update seen ids
            prevNotifIds.clear();
            docs.forEach((d) => prevNotifIds.add(d.id));

            isInitial = false;

            return merged;
          });
        });
      } catch (err) {
        console.error(
          "Failed to set up Firestore notifications listener:",
          err
        );
      }
    });

    return () => {
      // cleanup
      localUnsubscribe();
      authUnsub();
      if (firestoreUnsub) firestoreUnsub();
    };
  }, [present]);

  const loadStoredNotifications = () => {
    // Load from localStorage or backend
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (error) {
        console.error("Error loading stored notifications:", error);
      }
    }
  };

  const saveNotifications = (updatedNotifications: NotificationPayload[]) => {
    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));

    // Update unread count
    const unread = updatedNotifications.filter(
      (n) => !(n.data as any)?.read
    ).length;
    setUnreadCount(unread);
  };

  const markAsRead = async (id?: number | string) => {
    const targets = notifications.filter((notification) => {
      if (id === undefined) return true;
      const docId = (notification.data as any)?.docId;
      return notification.id === id || docId === id;
    });

    if (targets.length === 0) return;

    const updated = notifications.map((notification) => {
      const shouldMark = targets.some((target) => {
        const targetDocId = (target.data as any)?.docId;
        const currentDocId = (notification.data as any)?.docId;
        if (targetDocId && currentDocId) return targetDocId === currentDocId;
        return target.id === notification.id;
      });

      if (!shouldMark) return notification;

      return {
        ...notification,
        data: {
          ...notification.data,
          read: true,
        },
      };
    });

    saveNotifications(updated);

    const firestoreDocIds = targets
      .map((n) => (n.data as any)?.docId)
      .filter((docId): docId is string => typeof docId === "string");

    if (firestoreDocIds.length === 0) return;

    try {
      if (firestoreDocIds.length === 1) {
        await updateDoc(doc(db, "notifications", firestoreDocIds[0]), {
          read: true,
        });
      } else {
        const batch = writeBatch(db);
        firestoreDocIds.forEach((docId) => {
          batch.update(doc(db, "notifications", docId), { read: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Failed to persist read state in Firestore:", error);
    }
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const sendLocalNotification = async (
    title: string,
    body: string,
    data?: Record<string, any>
  ) => {
    await NotificationService.sendNow(title, body, data);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearAll,
        sendLocalNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
