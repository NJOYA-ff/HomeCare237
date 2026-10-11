import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonAvatar,
  IonBadge,
  IonChip,
  IonButton,
  IonIcon,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  eyeOutline,
  closeOutline,
  timeOutline,
  personOutline,
  medkitOutline,
  arrowForwardOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  calendarOutline,
  documentTextOutline,
} from "ionicons/icons";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_AVATAR, handleImageError } from "../../utils/profileImageStorage";
import LoadingHelix from "../../components/LoadingHelix";
import { EmptyState } from "../../components/ui";
import "./Admin2.scss";
import "./Admin3.scss";

// ── Types ─────────────────────────────────────────────────────────────────────

type UrgencyLevel = "routine" | "urgent" | "emergency";
type ReferralStatus = "pending" | "accepted" | "rejected" | "completed";

interface Referral {
  id: string;
  referringDoctorId: string;
  referringDoctorName: string;
  receivingDoctorId: string;
  receivingDoctorName: string;
  receivingDoctorSpecialization: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  referralDate: string;
  reason: string;
  clinicalNotes: string;
  urgency: UrgencyLevel;
  status: ReferralStatus;
  additionalInstructions: string;
  createdAt: any;
  updatedAt: any;
  /** Resolved at display time */
  referringDoctorAvatar?: string;
  receivingDoctorAvatar?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: ReferralStatus): string {
  const map: Record<ReferralStatus, string> = {
    pending: "warning",
    accepted: "success",
    rejected: "danger",
    completed: "primary",
  };
  return map[status] ?? "medium";
}

function statusIcon(status: ReferralStatus): string {
  const map: Record<ReferralStatus, string> = {
    pending: timeOutline,
    accepted: checkmarkCircleOutline,
    rejected: closeCircleOutline,
    completed: checkmarkCircleOutline,
  };
  return map[status] ?? timeOutline;
}

function urgencyColor(urgency: UrgencyLevel): string {
  const map: Record<UrgencyLevel, string> = {
    routine: "primary",
    urgent: "warning",
    emergency: "danger",
  };
  return map[urgency] ?? "medium";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(value: any): string {
  try {
    const date: Date =
      value?.toDate ? value.toDate() : new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const Admin_Referrals: React.FC = () => {
  const { t } = useSettings();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReferralStatus>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | UrgencyLevel>("all");
  const [selected, setSelected] = useState<Referral | null>(null);

  // Avatar cache: doctorId → avatarUrl
  const [avatarCache, setAvatarCache] = useState<Record<string, string>>({});

  // ── Fetch all referrals (real-time) ────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, "referrals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Referral[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            referringDoctorId: data.referringDoctorId ?? "",
            referringDoctorName: data.referringDoctorName ?? "Unknown Doctor",
            receivingDoctorId: data.receivingDoctorId ?? "",
            receivingDoctorName: data.receivingDoctorName ?? "Unknown Doctor",
            receivingDoctorSpecialization: data.receivingDoctorSpecialization ?? "",
            patientId: data.patientId ?? "",
            patientName: data.patientName ?? "Unknown Patient",
            patientEmail: data.patientEmail ?? "",
            referralDate: data.referralDate?.toDate
              ? data.referralDate.toDate().toISOString()
              : (data.referralDate ?? ""),
            reason: data.reason ?? "",
            clinicalNotes: data.clinicalNotes ?? "",
            urgency: data.urgency ?? "routine",
            status: data.status ?? "pending",
            additionalInstructions: data.additionalInstructions ?? "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setReferrals(list);
        setLoading(false);

        // Resolve doctor avatars not yet in cache
        const unknownIds = new Set<string>();
        list.forEach((r) => {
          if (r.referringDoctorId && !avatarCache[r.referringDoctorId])
            unknownIds.add(r.referringDoctorId);
          if (r.receivingDoctorId && !avatarCache[r.receivingDoctorId])
            unknownIds.add(r.receivingDoctorId);
        });
        unknownIds.forEach(async (id) => {
          try {
            const snap = await getDoc(doc(db, "doctors", id));
            if (snap.exists()) {
              const avatar = snap.data().avatar || DEFAULT_AVATAR;
              setAvatarCache((prev) => ({ ...prev, [id]: avatar }));
            }
          } catch {
            // silent — fall back to DEFAULT_AVATAR
          }
        });
      },
      () => setLoading(false),
    );
    return () => unsub();
    // avatarCache intentionally excluded to avoid re-subscribing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived filtered list ──────────────────────────────────────────────────

  const filtered = referrals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.referringDoctorName.toLowerCase().includes(q) ||
        r.receivingDoctorName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Summary counts for segment tabs ───────────────────────────────────────

  const counts = referrals.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonHeader>
        {/* Title row */}
        <IonToolbar className="header-toolbar-p">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="patient-title">{t("referrals")}</IonTitle>
        </IonToolbar>

        {/* Searchbar */}
        <IonToolbar className="filter-toolbar">
          <IonSearchbar
            className="search-bar search-bar--full"
            value={search}
            onIonInput={(e) => setSearch(e.detail.value ?? "")}
            onIonClear={() => setSearch("")}
            placeholder="Search patient, doctor, reason…"
            debounce={200}
            animated
          />
        </IonToolbar>

        {/* Status filter tabs */}
        <IonToolbar>
          <IonSegment
            value={statusFilter}
            onIonChange={(e) => setStatusFilter(e.detail.value as any)}
            scrollable
          >
            <IonSegmentButton value="all">
              <IonLabel>All ({referrals.length})</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="pending">
              <IonLabel>Pending ({counts.pending ?? 0})</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="accepted">
              <IonLabel>Accepted ({counts.accepted ?? 0})</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="completed">
              <IonLabel>Completed ({counts.completed ?? 0})</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="rejected">
              <IonLabel>Rejected ({counts.rejected ?? 0})</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-bottom">
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              gap: 16,
            }}
          >
            <LoadingHelix />
            <p style={{ color: "var(--ion-color-medium)", fontSize: "0.9rem" }}>
              Loading referrals…
            </p>
          </div>
        ) : (
          <>
            {/* Urgency quick-filter */}
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "12px 16px 4px",
                flexWrap: "wrap",
              }}
            >
              {(["all", "routine", "urgent", "emergency"] as const).map((u) => (
                <IonChip
                  key={u}
                  color={urgencyFilter === u ? (u === "all" ? "primary" : urgencyColor(u)) : "medium"}
                  outline={urgencyFilter !== u}
                  onClick={() => setUrgencyFilter(u)}
                  style={{ cursor: "pointer" }}
                >
                  {u === "all" ? "All urgencies" : capitalize(u)}
                </IonChip>
              ))}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={documentTextOutline}
                title="No referrals found"
                description="No referrals match the current filters."
              />
            ) : (
              <IonList lines="none" style={{ padding: "8px 0" }}>
                {filtered.map((r) => (
                  <ReferralRow
                    key={r.id}
                    referral={r}
                    avatarCache={avatarCache}
                    onView={() => setSelected(r)}
                  />
                ))}
              </IonList>
            )}
          </>
        )}

        {/* Detail modal */}
        <IonModal
          isOpen={!!selected}
          onDidDismiss={() => setSelected(null)}
          breakpoints={[0, 0.6, 1]}
          initialBreakpoint={0.9}
        >
          {selected && (
            <ReferralDetail
              referral={selected}
              avatarCache={avatarCache}
              onClose={() => setSelected(null)}
            />
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface RowProps {
  referral: Referral;
  avatarCache: Record<string, string>;
  onView: () => void;
}

const ReferralRow: React.FC<RowProps> = ({ referral: r, avatarCache, onView }) => (
  <IonItem
    button
    detail={false}
    onClick={onView}
    style={{ "--padding-start": "12px", "--padding-end": "12px" }}
  >
    {/* Referring doctor avatar */}
    <IonAvatar slot="start" style={{ width: 40, height: 40, marginRight: 0 }}>
      <img
        src={avatarCache[r.referringDoctorId] || DEFAULT_AVATAR}
        alt={r.referringDoctorName}
        onError={handleImageError}
      />
    </IonAvatar>

    {/* Arrow */}
    <IonIcon
      icon={arrowForwardOutline}
      style={{ fontSize: 14, color: "var(--ion-color-medium)", margin: "0 6px" }}
    />

    {/* Receiving doctor avatar */}
    <IonAvatar style={{ width: 40, height: 40, marginRight: 12 }}>
      <img
        src={avatarCache[r.receivingDoctorId] || DEFAULT_AVATAR}
        alt={r.receivingDoctorName}
        onError={handleImageError}
      />
    </IonAvatar>

    <IonLabel>
      {/* Patient name */}
      <h2 style={{ fontWeight: 700, fontSize: "0.95rem" }}>
        <IonIcon icon={personOutline} style={{ marginRight: 4, verticalAlign: "middle" }} />
        {r.patientName}
      </h2>

      {/* Doctor names */}
      <p style={{ fontSize: "0.78rem", color: "var(--ion-color-medium)" }}>
        {r.referringDoctorName}
        <IonIcon icon={arrowForwardOutline} style={{ margin: "0 4px", verticalAlign: "middle" }} />
        {r.receivingDoctorName}
      </p>

      {/* Specialization + date */}
      <p style={{ fontSize: "0.75rem", color: "var(--ion-color-medium)" }}>
        {r.receivingDoctorSpecialization && (
          <span style={{ marginRight: 8 }}>
            <IonIcon icon={medkitOutline} style={{ marginRight: 2, verticalAlign: "middle" }} />
            {r.receivingDoctorSpecialization}
          </span>
        )}
        <IonIcon icon={calendarOutline} style={{ marginRight: 2, verticalAlign: "middle" }} />
        {formatDate(r.referralDate)}
      </p>

      {/* Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        <IonChip color={statusColor(r.status)} style={{ height: 22, fontSize: "0.72rem", margin: 0 }}>
          <IonIcon icon={statusIcon(r.status)} style={{ fontSize: 13 }} />
          <IonLabel>{capitalize(r.status)}</IonLabel>
        </IonChip>
        <IonChip color={urgencyColor(r.urgency)} outline style={{ height: 22, fontSize: "0.72rem", margin: 0 }}>
          {capitalize(r.urgency)}
        </IonChip>
      </div>
    </IonLabel>

    <IonButton
      fill="clear"
      slot="end"
      size="small"
      onClick={(e) => { e.stopPropagation(); onView(); }}
      aria-label="View referral details"
    >
      <IonIcon icon={eyeOutline} />
    </IonButton>
  </IonItem>
);

// ── Detail sheet ──────────────────────────────────────────────────────────────

interface DetailProps {
  referral: Referral;
  avatarCache: Record<string, string>;
  onClose: () => void;
}

const ReferralDetail: React.FC<DetailProps> = ({ referral: r, avatarCache, onClose }) => (
  <IonPage>
    <IonHeader className="ion-no-border">
      <IonToolbar>
        <IonTitle style={{ fontSize: "1rem" }}>Referral Details</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onClose} aria-label="Close">
            <IonIcon icon={closeOutline} />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent className="ion-padding">
      {/* Status + urgency */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <IonChip color={statusColor(r.status)}>
          <IonIcon icon={statusIcon(r.status)} />
          <IonLabel>{capitalize(r.status)}</IonLabel>
        </IonChip>
        <IonChip color={urgencyColor(r.urgency)} outline>
          {r.urgency === "emergency" && (
            <IonIcon icon={alertCircleOutline} style={{ marginRight: 4 }} />
          )}
          <IonLabel>{capitalize(r.urgency)}</IonLabel>
        </IonChip>
        <IonChip outline style={{ marginLeft: "auto" }}>
          <IonIcon icon={calendarOutline} style={{ marginRight: 4 }} />
          <IonLabel>{formatDate(r.referralDate)}</IonLabel>
        </IonChip>
      </div>

      {/* Patient */}
      <SectionCard title="Patient">
        <InfoRow label="Name" value={r.patientName} />
        {r.patientEmail && <InfoRow label="Email" value={r.patientEmail} />}
      </SectionCard>

      {/* Doctors */}
      <SectionCard title="Referring → Receiving Doctor">
        <IonGrid style={{ padding: 0 }}>
          <IonRow>
            <IonCol size="12" sizeMd="6">
              <DoctorMiniCard
                label="Referring"
                name={r.referringDoctorName}
                avatar={avatarCache[r.referringDoctorId] || DEFAULT_AVATAR}
              />
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <DoctorMiniCard
                label="Receiving"
                name={r.receivingDoctorName}
                specialization={r.receivingDoctorSpecialization}
                avatar={avatarCache[r.receivingDoctorId] || DEFAULT_AVATAR}
              />
            </IonCol>
          </IonRow>
        </IonGrid>
      </SectionCard>

      {/* Referral info */}
      <SectionCard title="Referral Information">
        <InfoRow label="Reason" value={r.reason || "—"} multiline />
        <InfoRow label="Clinical Notes" value={r.clinicalNotes || "—"} multiline />
        {r.additionalInstructions && (
          <InfoRow label="Additional Instructions" value={r.additionalInstructions} multiline />
        )}
      </SectionCard>

      {/* Timestamps */}
      <SectionCard title="Timestamps">
        <InfoRow label="Created" value={formatDate(r.createdAt)} />
        {r.updatedAt && <InfoRow label="Last Updated" value={formatDate(r.updatedAt)} />}
      </SectionCard>
    </IonContent>
  </IonPage>
);

// ── Micro-components ──────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <IonCard style={{ margin: "0 0 16px", borderRadius: 14 }}>
    <IonCardHeader style={{ paddingBottom: 4 }}>
      <IonCardTitle style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </IonCardTitle>
    </IonCardHeader>
    <IonCardContent>{children}</IonCardContent>
  </IonCard>
);

const InfoRow: React.FC<{ label: string; value: string; multiline?: boolean }> = ({
  label,
  value,
  multiline,
}) => (
  <div style={{ marginBottom: 10 }}>
    <IonText color="medium" style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
      {label}
    </IonText>
    <IonText style={{ fontSize: "0.88rem", lineHeight: multiline ? 1.55 : 1.3, whiteSpace: multiline ? "pre-wrap" : "normal" }}>
      {value}
    </IonText>
  </div>
);

const DoctorMiniCard: React.FC<{ label: string; name: string; specialization?: string; avatar: string }> = ({
  label,
  name,
  specialization,
  avatar,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
    <IonAvatar style={{ width: 40, height: 40, flexShrink: 0 }}>
      <img src={avatar} alt={name} onError={handleImageError} />
    </IonAvatar>
    <div>
      <IonText color="medium" style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </IonText>
      <IonText style={{ display: "block", fontWeight: 700, fontSize: "0.88rem" }}>{name}</IonText>
      {specialization && (
        <IonText color="medium" style={{ fontSize: "0.78rem" }}>{specialization}</IonText>
      )}
    </div>
  </div>
);

export default Admin_Referrals;
