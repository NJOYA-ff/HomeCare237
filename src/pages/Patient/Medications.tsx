import { EmptyState, SkeletonCard, SkeletonGroup } from "../../components/ui";
import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonBadge,
  IonText,
  IonModal,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonToast,
  IonRefresher,
  IonRefresherContent,
  IonToggle,
} from "@ionic/react";
import { MessageBox } from "../../components/ui/MessageBox";
import { motion } from "framer-motion";
import {
  addOutline,
  trashOutline,
  createOutline,
  notificationsOutline,
  notificationsOffOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  checkmarkDone,
  closeOutline,
  documentTextOutline,
  medkitOutline,
  cartOutline,
  downloadOutline,
} from "ionicons/icons";
import { db, auth } from "../../firebaseconfig";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import {
  Medication,
  scheduleAllReminders,
  cancelAllReminders,
  timesForFrequency,
  todayKey,
  prescriptionsToMedications,
} from "../../components/Services/medicationService";
import { useNotifications } from "../../context/NotificationContext";
import "./Medications.scss";

interface AdherenceLog {
  id: string;
  medId: string;
  date: string;
  time: string;
  status: "taken" | "skipped";
}

const DEFAULT_DOSES = ["08:00", "20:00"];

const Medications: React.FC = () => {
  const { sendLocalNotification } = useNotifications();
  const uid = auth.currentUser?.uid;

  const [meds, setMeds] = useState<Medication[]>([]);
  const [prescriptions, setPrescriptions] = useState<Medication[]>([]);
  const [adherence, setAdherence] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<"mine" | "rx">("mine");

  // Add / edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once a day");
  const [dosesPerDay, setDosesPerDay] = useState(1);
  const [times, setTimes] = useState<string[]>(DEFAULT_DOSES.slice(0, 1));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reminders, setReminders] = useState(true);
  const [saving, setSaving] = useState(false);

  // Alerts / toasts
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = todayKey();

  // ── Load my medicines (real-time) ────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "patients", uid, "medications"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Medication[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) } as Medication);
        });
        setMeds(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading medications:", err);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  // ── Load active/pending prescriptions from diagnoses (proposed medicines) ─
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "diagnoses"),
            where("patientId", "==", uid),
            orderBy("date", "desc"),
          ),
        );
        const diagnoses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPrescriptions(prescriptionsToMedications(diagnoses));
      } catch (err) {
        console.warn("[Medications] Could not load prescriptions:", err);
      }
    })();
  }, [uid]);

  // ── Load today's adherence logs ──────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "patients", uid, "medicationLogs"),
      where("date", "==", today),
    );
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, Record<string, string>> = {};
      snap.forEach((d) => {
        const log = d.data() as AdherenceLog;
        if (!map[log.medId]) map[log.medId] = {};
        map[log.medId][log.time] = log.status;
      });
      setAdherence(map);
    });
    return unsub;
  }, [uid, today]);

  // ── Add / edit helpers ───────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setDosage("");
    setFrequency("Once a day");
    setDosesPerDay(1);
    setTimes(["08:00"]);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setNotes("");
    setReminders(true);
    setShowModal(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingId(med.id);
    setName(med.name);
    setDosage(med.dosage || "");
    setFrequency(med.frequency || "Once a day");
    const n = Math.max(1, med.times?.length || 1);
    setDosesPerDay(n > 4 ? 4 : n);
    setTimes((med.times?.length ? med.times : ["08:00"]).slice(0, 4));
    setStartDate(med.startDate || new Date().toISOString().slice(0, 10));
    setEndDate(med.endDate || "");
    setNotes(med.notes || "");
    setReminders(med.remindersEnabled !== false);
    setShowModal(true);
  };

  /** Change dose count → regenerate sensible default times (keeps edits). */
  const changeDoseCount = (n: number) => {
    setDosesPerDay(n);
    const defaults = timesForFrequency(
      n === 1 ? "1 time" : n === 2 ? "2 times" : n === 3 ? "3 times" : "4 times",
    );
    const next = times.slice(0, n);
    while (next.length < n) next.push(defaults[next.length % defaults.length]);
    setTimes(next);
  };

  const saveMed = async () => {
    if (!uid || name.trim() === "") {
      setAlertMessage("Medication name is required.");
      setShowAlert(true);
      return;
    }
    if (times.length === 0 || times.every((tm) => !tm || tm.trim() === "")) {
      setAlertMessage("Add at least one daily dose time.");
      setShowAlert(true);
      return;
    }
    setSaving(true);
    try {
      const cleanTimes = times
        .filter((tm) => tm && tm.trim() !== "")
        .map((tm) =>
          tm.length === 5
            ? tm
            : tm.length > 5
              ? `${tm.slice(0, 2)}:${tm.slice(3, 5)}`
              : tm,
        );

      const payload = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        times: cleanTimes,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || "",
        notes: notes.trim(),
        status: "active" as const,
        remindersEnabled: reminders,
        refillRequested: false,
        updatedAt: Timestamp.now(),
      };

      let medId = editingId;
      if (editingId) {
        await updateDoc(
          doc(db, "patients", uid, "medications", editingId),
          payload,
        );
      } else {
        const ref = await addDoc(
          collection(db, "patients", uid, "medications"),
          { ...payload, source: "manual", createdAt: Timestamp.now() },
        );
        medId = ref.id;
      }

      if (medId) {
        await scheduleAllReminders({
          id: medId,
          ...payload,
          source: "manual",
          createdAt: null,
        } as Medication);
      }
      setToastMsg(
        editingId
          ? "Medication updated."
          : reminders
            ? "Medication added. Reminders are set."
            : "Medication added. Reminders disabled.",
      );
      setShowToast(true);
      setShowModal(false);
    } catch (err) {
      console.error("Error saving medication:", err);
      setAlertMessage("Could not save the medication. Please try again.");
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteMed = async (id: string) => {
    if (!uid) return;
    try {
      await cancelAllReminders(id);
      await deleteDoc(doc(db, "patients", uid, "medications", id));
      setConfirmDeleteId(null);
      setToastMsg("Medication deleted.");
      setShowToast(true);
    } catch (err) {
      console.error("Error deleting medication:", err);
      setAlertMessage("Could not delete the medication.");
      setShowAlert(true);
    }
  };

  const toggleReminders = async (med: Medication) => {
    if (!uid) return;
    const next = !med.remindersEnabled;
    try {
      if (next) {
        await scheduleAllReminders({ ...med, remindersEnabled: true });
      } else {
        await cancelAllReminders(med.id);
      }
      await updateDoc(doc(db, "patients", uid, "medications", med.id), {
        remindersEnabled: next,
      });
      setToastMsg(next ? "Reminders enabled." : "Reminders disabled.");
      setShowToast(true);
    } catch (err) {
      console.error("Error toggling reminders:", err);
    }
  };

  const markDose = async (
    med: Medication,
    time: string,
    status: "taken" | "skipped",
  ) => {
    if (!uid) return;
    try {
      const logsQ = query(
        collection(db, "patients", uid, "medicationLogs"),
        where("medId", "==", med.id),
        where("date", "==", today),
        where("time", "==", time),
      );
      const existing = await getDocs(logsQ);
      if (!existing.empty) {
        existing.forEach((d) => {
          void updateDoc(doc(db, "patients", uid, "medicationLogs", d.id), {
            status,
            loggedAt: Timestamp.now(),
          });
        });
      } else {
        await addDoc(collection(db, "patients", uid, "medicationLogs"), {
          medId: med.id,
          medName: med.name,
          date: today,
          time,
          status,
          loggedAt: Timestamp.now(),
        });
      }
      await sendLocalNotification(
        status === "taken" ? "Dose logged" : "Dose skipped",
        `${med.name} ${status === "taken" ? "taken" : "skipped"} at ${time}.`,
        { type: "adherence", medicationId: med.id },
      );
    } catch (err) {
      console.error("Error logging dose:", err);
    }
  };

  const requestRefill = async (med: Medication) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "patients", uid, "medications", med.id), {
        refillRequested: true,
      });
      if (med.doctorId) {
        const { sendPushNotification } = await import(
          "../../utils/pushNotification"
        );
        await sendPushNotification({
          recipientId: med.doctorId,
          title: "Refill Request",
          body: `${med.name} (${med.dosage}) — refill requested.`,
          data: { type: "refill", medicationId: med.id, patientId: uid },
        });
      }
      setToastMsg("Refill requested. Your doctor has been notified.");
      setShowToast(true);
    } catch (err) {
      console.error("Error requesting refill:", err);
    }
  };

  const importPrescription = async (rx: Medication) => {
    if (!uid || !rx.name) return;
    try {
      const times =
        rx.times && rx.times.length
          ? rx.times
          : timesForFrequency(rx.frequency);
      await addDoc(collection(db, "patients", uid, "medications"), {
        name: rx.name,
        dosage: rx.dosage,
        frequency: rx.frequency,
        times,
        startDate: rx.startDate || new Date().toISOString().slice(0, 10),
        endDate: rx.endDate || "",
        notes: rx.notes || "",
        status: "active",
        remindersEnabled: false,
        source: "prescription",
        diagnosisId: rx.diagnosisId,
        prescribedBy: rx.prescribedBy,
        doctorId: rx.doctorId,
        refillRequested: false,
        createdAt: Timestamp.now(),
      });
      setToastMsg(
        `${rx.name} added to your medicines. Turn on reminders to get dose alerts.`,
      );
      setShowToast(true);
      setSegment("mine");
    } catch (err) {
      console.error("Error importing prescription:", err);
      setAlertMessage("Could not add the prescription to your medicines.");
      setShowAlert(true);
    }
  };

  const importedKey = (rx: Medication): string =>
    `${rx.diagnosisId || "rx"}_${rx.name}`;

  const alreadyImported = (rx: Medication): boolean =>
    meds.some(
      (m) =>
        m.source === "prescription" && importedKey(m) === importedKey(rx),
    );

  const fmtTime = (tm: string): string => {
    try {
      const [h, m] = tm.split(":");
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m));
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return tm;
    }
  };

  const completionToday = (med: Medication): number => {
    const logs = adherence[med.id] || {};
    const done = med.times.filter((tm) => logs[tm] === "taken").length;
    return med.times.length ? Math.round((done / med.times.length) * 100) : 0;
  };

  if (loading) {
    return (
      <IonPage className="medications-page">
        <IonHeader class="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/patient/dashboard" />
            </IonButtons>
            <IonTitle>My Medicines</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="meds-shell">
            <SkeletonGroup label="Loading your medicines">
              <SkeletonCard metric />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </SkeletonGroup>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="medications-page">
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>My Medicines</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openAddModal}>
              <IonIcon slot="start" icon={addOutline} />
              Add
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => setTimeout(() => e.detail.complete(), 600)}
        >
          <IonRefresherContent />
        </IonRefresher>
        {loading && (
          <div className="meds-shell">
            <SkeletonGroup label="Loading your medicines">
              <SkeletonCard metric />
              <SkeletonCard lines={3} />
            </SkeletonGroup>
          </div>
        )}

        <IonSegment
          className="meds-segment"
          color="primary"
          value={segment}
          onIonChange={(e) => setSegment(e.detail.value as any)}
        >
          <IonSegmentButton value="mine">My Medicines</IonSegmentButton>
          <IonSegmentButton value="rx">Prescriptions</IonSegmentButton>
        </IonSegment>

        {segment === "mine" && (
          <div className="meds-shell">
            {meds.length === 0 ? (
              <EmptyState
                icon={medkitOutline}
                title="No medicines yet"
                description="Add your daily medication or import one from the Prescriptions tab to start tracking doses & reminders."
                actionLabel="Add a medication"
                onAction={openAddModal}
              />
            ) : (
              meds.map((med) => {
                const logs = adherence[med.id] || {};
                const pct = completionToday(med);
                return (
                  <IonCard className="med-card" key={med.id}>
                    <IonCardContent>
                      <div className="med-head">
                        <div className="med-head-main">
                          <h3>{med.name}</h3>
                          <p>
                            {med.dosage}
                            {med.frequency ? ` · ${med.frequency}` : ""}
                          </p>
                          {med.prescribedBy && (
                            <p className="med-prescriber">
                              Prescribed by {med.prescribedBy}
                            </p>
                          )}
                        </div>
                        <div className="med-head-actions">
                          <IonButton
                            fill="clear"
                            size="small"
                            className={
                              med.remindersEnabled ? "rem-on" : "rem-off"
                            }
                            aria-label="Toggle reminders"
                            onClick={() => toggleReminders(med)}
                          >
                            <IonIcon
                              icon={
                                med.remindersEnabled
                                  ? notificationsOutline
                                  : notificationsOffOutline
                              }
                            />
                          </IonButton>
                          <IonButton
                            fill="clear"
                            size="small"
                            aria-label="Edit medication"
                            onClick={() => openEditModal(med)}
                          >
                            <IonIcon icon={createOutline} />
                          </IonButton>
                          <IonButton
                            fill="clear"
                            size="small"
                            color="danger"
                            aria-label="Delete medication"
                            onClick={() => setConfirmDeleteId(med.id)}
                          >
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </div>
                      </div>

                      <div className="med-times">
                        {med.times.map((tm) => {
                          const status = logs[tm] || "pending";
                          return (
                            <div
                              className={`dose-pill dose-${status}`}
                              key={tm}
                            >
                              <span className="dose-time">{fmtTime(tm)}</span>
                              {status === "pending" ? (
                                <div className="dose-actions">
                                  <IonButton
                                    fill="clear"
                                    size="small"
                                    color="success"
                                    aria-label={`Mark ${tm} taken`}
                                    onClick={() => markDose(med, tm, "taken")}
                                  >
                                    <IonIcon icon={checkmarkCircleOutline} />
                                  </IonButton>
                                  <IonButton
                                    fill="clear"
                                    size="small"
                                    color="warning"
                                    aria-label={`Skip ${tm}`}
                                    onClick={() => markDose(med, tm, "skipped")}
                                  >
                                    <IonIcon icon={closeCircleOutline} />
                                  </IonButton>
                                </div>
                              ) : (
                                <IonChip
                                  color={
                                    status === "taken" ? "success" : "medium"
                                  }
                                  outline
                                >
                                  <IonLabel>{status}</IonLabel>
                                </IonChip>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="med-footer">
                        <div className="med-progress">
                          <div
                            className="med-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="med-progress-label">
                          {pct}% today
                        </span>
                        {med.refillRequested ? (
                          <IonBadge color="warning">
                            Refill requested
                          </IonBadge>
                        ) : (
                          <IonButton
                            fill="clear"
                            size="small"
                            color="primary"
                            onClick={() => requestRefill(med)}
                          >
                            <IonIcon slot="start" icon={cartOutline} />
                            Refill
                          </IonButton>
                        )}
                      </div>
                    </IonCardContent>
                  </IonCard>
                );
              })
            )}
          </div>
        )}

        {segment === "rx" && (
          <div className="rx-shell">
            {prescriptions.length === 0 ? (
              <EmptyState
                icon={documentTextOutline}
                title="No prescriptions found"
                description="Medications your doctor prescribed inside a diagnosis will appear here so you can add them to your tracker with one tap."
              />
            ) : (
              prescriptions.map((rx) => {
                const done = alreadyImported(rx);
                return (
                  <IonCard className="rx-card" key={rx.id}>
                    <IonCardContent>
                      <div className="rx-head">
                        <h3>{rx.name}</h3>
                        {rx.prescribedBy && (
                          <p className="rx-doctor">Dr. {rx.prescribedBy}</p>
                        )}
                      </div>
                      <div className="rx-meta">
                        {rx.dosage && (
                          <IonChip outline color="primary">
                            <IonLabel>{rx.dosage}</IonLabel>
                          </IonChip>
                        )}
                        {rx.frequency && (
                          <IonChip outline color="primary">
                            <IonLabel>{rx.frequency}</IonLabel>
                          </IonChip>
                        )}
                        {rx.notes && <p className="rx-notes">{rx.notes}</p>}
                      </div>
                      <IonButton
                        expand="block"
                        fill={done ? "solid" : "outline"}
                        disabled={done}
                        onClick={() => importPrescription(rx)}
                      >
                        <IonIcon
                          slot="start"
                          icon={done ? checkmarkDone : downloadOutline}
                        />
                        {done ? "Added to my medicines" : "Add to my medicines"}
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                );
              })
            )}
          </div>
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          position="top"
          duration={3200}
        />
                <MessageBox
          isOpen={showAlert}
          title="Medications"
          message={alertMessage}
          tone="danger"
          actions={[
            {
              label: "OK",
              color: "primary",
              onClick: () => setShowAlert(false),
            },
          ]}
          onDismiss={() => setShowAlert(false)}
        />
        <MessageBox
          isOpen={!!confirmDeleteId}
          title="Delete medication?"
          message="This will also cancel its reminders. You cannot undo this."
          tone="danger"
          actions={[
            {
              label: "Cancel",
              color: "medium",
              onClick: () => setConfirmDeleteId(null),
            },
            {
              /* Undoable=false and it cancels reminders too, so the confirm action
                 carries the danger colour. */
              label: "Delete",
              color: "danger",
              onClick: () => {
                if (confirmDeleteId) void deleteMed(confirmDeleteId);
              },
            },
          ]}
          onDismiss={() => setConfirmDeleteId(null)}
        />

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader class="ion-no-border">
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
              <IonTitle>
                {editingId ? "Edit medication" : "Add medication"}
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">Medication name *</IonLabel>
              <IonInput
                value={name}
                onIonInput={(e) => setName(e.detail.value || "")}
                placeholder="e.g. Amoxicillin"
              />
            </IonItem>

            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">Dosage</IonLabel>
              <IonInput
                value={dosage}
                onIonInput={(e) => setDosage(e.detail.value || "")}
                placeholder="e.g. 500mg"
              />
            </IonItem>

            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">Frequency</IonLabel>
              <IonSelect
                value={frequency}
                onIonChange={(e) => setFrequency(e.detail.value)}
              >
                <IonSelectOption value="Once a day">Once a day</IonSelectOption>
                <IonSelectOption value="Twice a day">Twice a day</IonSelectOption>
                <IonSelectOption value="3 times a day">3 times a day</IonSelectOption>
                <IonSelectOption value="4 times a day">4 times a day</IonSelectOption>
                <IonSelectOption value="Every other day">Every other day</IonSelectOption>
                <IonSelectOption value="Once a week">Once a week</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">Doses per day</IonLabel>
              <IonSelect
                value={dosesPerDay}
                onIonChange={(e) => changeDoseCount(Number(e.detail.value))}
              >
                <IonSelectOption value={1}>1</IonSelectOption>
                <IonSelectOption value={2}>2</IonSelectOption>
                <IonSelectOption value={3}>3</IonSelectOption>
                <IonSelectOption value={4}>4</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonList className="times-editor" lines="none">
              <IonText className="times-title">Dose times (24h)</IonText>
              {times.map((tm, idx) => (
                <IonItem className="form-item" lines="none" key={`time-${idx}`}>
                  <IonLabel position="stacked">Dose {idx + 1}</IonLabel>
                  <IonInput
                    type="time"
                    value={tm}
                    onIonInput={(e) => {
                      const next = times.slice();
                      next[idx] = e.detail.value || "";
                      setTimes(next);
                    }}
                  />
                </IonItem>
              ))}
            </IonList>

            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">Notes / instructions</IonLabel>
              <IonTextarea
                rows={2}
                value={notes}
                onIonInput={(e) => setNotes(e.detail.value || "")}
                placeholder="Take with food…"
              />
            </IonItem>

            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">Start date</IonLabel>
              <IonInput
                type="date"
                value={startDate}
                onIonInput={(e) => setStartDate(e.detail.value || "")}
              />
            </IonItem>

            <IonItem className="form-item" lines="none">
              <IonLabel position="stacked">End date (optional)</IonLabel>
              <IonInput
                type="date"
                value={endDate}
                onIonInput={(e) => setEndDate(e.detail.value || "")}
              />
            </IonItem>

            <IonItem lines="none" className="reminder-toggle-item">
              <IonIcon
                slot="start"
                icon={reminders ? notificationsOutline : notificationsOffOutline}
                color={reminders ? "primary" : "medium"}
              />
              <IonLabel>Dose reminders</IonLabel>
              <IonToggle
                slot="end"
                checked={reminders}
                onIonChange={(e) => setReminders(e.detail.checked)}
              />
            </IonItem>

            <IonButton
              expand="block"
              className="med-save-btn"
              onClick={saveMed}
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Add medication"}
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Medications;
