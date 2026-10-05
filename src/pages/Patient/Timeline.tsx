import { EmptyState, SkeletonGroup, SkeletonList } from "../../components/ui";
import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonButton,
  IonChip,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/react";
import { motion } from "framer-motion";
import {
  calendarOutline,
  documentTextOutline,
  pulseOutline,
  happyOutline,
  timeOutline,
  arrowForward,
} from "ionicons/icons";
import { db, auth } from "../../firebaseconfig";
import type { FirebaseError } from "firebase/app";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { toDate } from "../../components/Services/patientVitals";
import "./Timeline.scss";

type Kind = "appointment" | "diagnosis" | "vital" | "checkin";

interface TimelineItem {
  id: string;
  kind: Kind;
  date: Date;
  title: string;
  subtitle: string;
  statusText?: string;
  link?: string;
}

const KIND_META: Record<Kind, { icon: any; color: string }> = {
  appointment: { icon: calendarOutline, color: "primary" },
  diagnosis: { icon: documentTextOutline, color: "tertiary" },
  vital: { icon: pulseOutline, color: "success" },
  checkin: { icon: happyOutline, color: "warning" },
};

const KIND_LABELS: Record<Kind, string> = {
  appointment: "Appointments",
  diagnosis: "Diagnoses",
  vital: "Vitals",
  checkin: "Check-ins",
};

const Timeline: React.FC = () => {
  const uid = auth.currentUser?.uid;
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | "all">("all");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const collected: TimelineItem[] = [];

        // Appointments
        const apptSnap = await getDocs(
          query(
            collection(db, "appointments"),
            where("patientId", "==", uid),
            orderBy("date", "desc"),
            limit(60),
          ),
        );
        apptSnap.forEach((d) => {
          const a = d.data() as any;
          const dt = toDate(a.date) || (a.createdAt ? toDate(a.createdAt) : null);
          if (!dt) return;
          collected.push({
            id: `appt-${d.id}`,
            kind: "appointment",
            date: dt,
            title: `Appointment with Dr. ${a.doctorName || "Doctor"}`,
            subtitle: `${a.type || "Hospital"} visit · ${a.status || ""}`,
            statusText: a.status,
            link: "/patient/book_appointment?tab=myAppointments",
          });
        });

        // Diagnoses
        const diagSnap = await getDocs(
          query(
            collection(db, "diagnoses"),
            where("patientId", "==", uid),
            orderBy("date", "desc"),
            limit(40),
          ),
        );
        diagSnap.forEach((d) => {
          const dia = d.data() as any;
          const dt = toDate(dia.date);
          if (!dt) return;
          collected.push({
            id: `diag-${d.id}`,
            kind: "diagnosis",
            date: dt,
            title: dia.condition || "Diagnosis",
            subtitle: `Dr. ${dia.doctor?.name || "Doctor"} · ${
              dia.doctor?.specialty || "Specialist"
            }`,
            statusText: dia.status,
            link: "/patient/diagnoses",
          });
        });

        // Vitals (healthMetrics)
        const metricSnap = await getDocs(
          query(
            collection(db, "healthMetrics"),
            where("patientId", "==", uid),
            orderBy("timestamp", "desc"),
            limit(60),
          ),
        );
        metricSnap.forEach((d) => {
          const m = d.data() as any;
          const dt = toDate(m.timestamp);
          if (!dt) return;
          collected.push({
            id: `vital-${d.id}`,
            kind: "vital",
            date: dt,
            title: `${m.name} reading`,
            subtitle: `${m.value} ${m.unit}${m.notes ? ` · ${m.notes}` : ""}`,
            statusText: m.status,
            link: "/patient/vitals",
          });
        });

        // Check-ins (healthHistory)
        // This query (patientId + orderBy timestamp + limit) can require a composite
        // index. If the index isn't ready yet, fall back gracefully so the rest of
        // the feed still renders.
        (async () => {
          try {
            const histSnap = await getDocs(
              query(
                collection(db, "healthHistory"),
                where("patientId", "==", uid),
                orderBy("timestamp", "desc"),
                limit(40),
              ),
            );
            histSnap.forEach((d) => {
              const h = d.data() as any;
              const dt = toDate(h.timestamp);
              if (!dt) return;
              if (h.type && h.type !== "checkin" && h.type !== "status_change") return;
              const mood = h.mood
                ? moodLabel(h.mood)
                : h.type === "status_change"
                  ? "Status update"
                  : h.note || "";
              collected.push({
                id: `checkin-${d.id}`,
                kind: "checkin",
                date: dt,
                title:
                  h.type === "status_change" ? "Health status updated" : "Daily check-in",
                subtitle:
                  mood +
                  (Array.isArray(h.symptoms) && h.symptoms.length
                    ? ` · ${h.symptoms.join(", ")}`
                    : ""),
                link: "/patient/dashboard",
              });
            });
          } catch (histErr) {
            const firebaseErr = histErr as FirebaseError;
            if (
              firebaseErr.code === "failed-precondition" &&
              firebaseErr.message.includes("requires an index")
            ) {
              console.warn(
                "[Timeline] healthHistory index not ready yet — check-ins hidden until index is created. " +
                  "Create it here: https://console.firebase.google.com/v1/r/project/homecare-1c228/firestore/indexes?create_composite=ClNwcm9qZWN0cy9ob21lY2FyZS0xYzIyOC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXBwb2ludG1lbnRzL2luZGV4ZXMvXxABGg0KCXBhdGllbnRJZBABGggKBGRhdGUQAhoMCghfX25hbWVfXxAC",
              );
              // Optionally insert a visible placeholder when check-ins would have shown
              collected.push({
                id: "checkin-placeholder",
                kind: "checkin",
                date: new Date(),
                title: "Check-ins (index pending)",
                subtitle:
                  "Timed health check-ins will appear here once the required Firestore index is ready.",
                link: "/patient/dashboard",
              });
            } else {
              console.error("[Timeline] Failed to load check-ins:", histErr);
            }
          }
        })();

        collected.sort((a, b) => b.date.getTime() - a.date.getTime());
        setItems(collected);
      } catch (err) {
        console.error("Error loading timeline:", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter],
  );

  const fmtDate = (d: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (diff === 0)
      return `Today · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (diff === 1)
      return `Yesterday · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusChipColor = (status?: string): string => {
    switch (status) {
      case "normal":
      case "completed":
      case "accepted":
      case "resolved":
        return "success";
      case "warning":
      case "pending":
      case "followup":
      case "active":
        return "warning";
      case "critical":
      case "rejected":
      case "cancelled":
        return "danger";
      default:
        return "medium";
    }
  };

  return (
    <IonPage className="timeline-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>Health Records</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => setTimeout(() => e.detail.complete(), 700)}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="timeline-filters">
          <IonChip
            outline={filter !== "all"}
            color="primary"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "chip-active" : ""}
          >
            <IonLabel>All</IonLabel>
          </IonChip>
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
            <IonChip
              key={k}
              outline={filter !== k}
              color={KIND_META[k].color}
              onClick={() => setFilter(k)}
              className={filter === k ? "chip-active" : ""}
            >
              <IonIcon icon={KIND_META[k].icon} />
              <IonLabel>{KIND_LABELS[k]}</IonLabel>
            </IonChip>
          ))}
        </div>

        {loading && (
          <div className="timeline-list">
            <SkeletonGroup label="Loading your health history">
              <SkeletonList rows={5} />
            </SkeletonGroup>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          filter === "all" ? (
            <EmptyState
              icon={timeOutline}
              title="No health records yet"
              description="Your appointments, diagnoses, vitals and check-ins will appear here as they happen."
            />
          ) : (
            <EmptyState
              icon={KIND_META[filter].icon}
              title={`No ${KIND_LABELS[filter].toLowerCase()} yet`}
              description="Nothing recorded in this category so far. Switch the filter to see the rest of your history."
              actionLabel="Show all records"
              onAction={() => setFilter("all")}
            />
          )
        )}

        <div className="timeline-list">
          {filtered.map((item) => {
            const meta = KIND_META[item.kind];
            return (
              <IonCard className="timeline-card" key={item.id}>
                <IonCardContent>
                  <div className="timeline-row">
                    <div className={`timeline-icon tl-${item.kind}`}>
                      <IonIcon icon={meta.icon} />
                    </div>
                    <div className="timeline-main">
                      <p className="timeline-date">{fmtDate(item.date)}</p>
                      <h3>{item.title}</h3>
                      <p className="timeline-sub">{item.subtitle}</p>
                    </div>
                    {item.link ? (
                      <IonButton
                        fill="clear"
                        size="small"
                        routerLink={item.link}
                        aria-label="Open record"
                      >
                        <IonIcon icon={arrowForward} />
                      </IonButton>
                    ) : (
                      item.statusText && (
                        <IonChip
                          color={statusChipColor(item.statusText)}
                          outline
                        >
                          <IonLabel>{item.statusText}</IonLabel>
                        </IonChip>
                      )
                    )}
                  </div>
                </IonCardContent>
              </IonCard>
            );
          })}
        </div>
      </IonContent>
    </IonPage>
  );
};

const moodLabel = (mood: number | string): string => {
  const m = typeof mood === "string" ? parseInt(mood, 10) : mood;
  const labels = [
    "",
    "Excellent",
    "Good",
    "Okay",
    "Not great",
    "Unwell",
  ];
  if (m >= 1 && m <= 5) return labels[m];
  return "Feeling checked in";
};

export default Timeline;