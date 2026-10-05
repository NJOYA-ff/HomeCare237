/**
 * medicationService.ts
 *
 * Shared helpers for the patient **Medication Tracker** feature:
 *  - Medication document model
 *  - Deterministic local-notification ids
 *  - Scheduling / cancelling daily dose reminders (Capacitor LocalNotifications)
 *  - De-duplicating prescriptions the doctor already published
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import { isPlatform } from "@ionic/react";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  /** Array of daily "HH:mm" reminder times. */
  times: string[];
  startDate: string;
  endDate?: string;
  notes?: string;
  status: "active" | "paused" | "completed";
  remindersEnabled: boolean;
  /** Where the medication came from. */
  source: "manual" | "prescription";
  /** Id of the diagnosis document (when imported from a prescription). */
  diagnosisId?: string;
  /** Doctor info embedded when imported from a prescription. */
  prescribedBy?: string;
  doctorId?: string;
  refillRequested: boolean;
  createdAt: any;
}

export interface MedicationDoseStatus {
  /** ISO HH:mm of the scheduled dose. */
  time: string;
  status: "pending" | "taken" | "skipped";
}

/** Stable numeric notification id derived from the medication id + slot index. */
export const notificationIdFor = (medId: string, slot: number): number => {
  let hash = 2166136261;
  for (let i = 0; i < medId.length; i++) {
    hash ^= medId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 100000) + slot * 7 + 1;
};

const toHHMM = (time: string): string => {
  const t = time || "08:00";
  const parts = t.split(":");
  return `${parts[0].padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}`;
};

/**
 * Schedule a repeating daily local notification for a medication dose.
 * Repeats are only supported on native (iOS/Android); on web this is a no-op
 * so the PWA keeps working without the plugin.
 */
export const scheduleDoseReminder = async (
  med: Medication,
  slotIndex: number,
): Promise<boolean> => {
  if (!med.remindersEnabled || med.status !== "active") return false;
  if (!isPlatform("hybrid")) return false;

  const [hour, minute] = toHHMM(med.times[slotIndex] || "08:00")
    .split(":")
    .map(Number);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdFor(med.id, slotIndex),
          title: "Medication Reminder",
          body: `Time for your dose: ${med.name}${med.dosage ? ` — ${med.dosage}` : ""}`,
          schedule: {
            at: nextTime(hour, minute),
            repeats: true,
            allowWhileIdle: true,
          },
          extra: { type: "medication", medicationId: med.id, slot: slotIndex },
          sound: localStorage.getItem("hc_sound") !== "false" ? "beep.wav" : undefined,
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn("[medicationService] Failed to schedule reminder:", err);
    return false;
  }
};

/** First future Date matching `hour:minute` (used as the repeat anchor time). */
const nextTime = (hour: number, minute: number): Date => {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
};

/** Reschedule every dose of a medication (e.g. after editing times). */
export const scheduleAllReminders = async (med: Medication): Promise<void> => {
  await cancelAllReminders(med.id);
  if (!med.remindersEnabled || med.status !== "active") return;
  for (let i = 0; i < (med.times?.length || 0); i++) {
    await scheduleDoseReminder(med, i);
  }
};

/** Cancel all scheduled reminders for a medication. */
export const cancelAllReminders = async (medId: string): Promise<void> => {
  if (!isPlatform("hybrid")) return;
  try {
    const ids: number[] = Array.from({ length: 12 }, (_, i) =>
      notificationIdFor(medId, i),
    );
    await LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id })),
    });
  } catch (err) {
    console.warn("[medicationService] Failed to cancel reminders:", err);
  }
};

/**
 * Flatten the prescriptions embedded in the patient's diagnosis documents into
 * the `Medication` shape so they can be proposed in "My Medicines".
 */
export const prescriptionsToMedications = (
  diagnoses: any[],
): Medication[] => {
  const result: Medication[] = [];
  for (const diag of diagnoses || []) {
    for (const rx of diag?.prescriptions || []) {
      if (rx?.medication) {
        result.push({
          id: `${diag.id || "rx"}_${rx.medication.replace(/\s+/g, "_")}`,
          name: rx.medication,
          dosage: rx.dosage || "",
          frequency: rx.frequency || "",
          times: [],
          startDate: rx.startDate || diag.date || new Date().toISOString(),
          endDate: rx.endDate || undefined,
          notes: rx.instructions || "",
          status: rx.status === "active" ? "active" : "paused",
          remindersEnabled: false,
          source: "prescription",
          diagnosisId: diag.id,
          prescribedBy: diag.doctor?.name || "",
          doctorId: diag.doctor?.id || "",
          refillRequested: false,
          createdAt: null,
        });
      }
    }
  }
  return result;
};

/** Default times used for common frequencies. */
export const timesForFrequency = (frequency: string): string[] => {
  const f = (frequency || "").toLowerCase();
  if (f.includes("once") || f.includes("1") || /1\s*time|daily|jd|par\s+jour/.test(f)) {
    return ["08:00"];
  }
  if (f.includes("twice") || f.includes("2") || /2\s*times|b\.?i\.?d/.test(f)) {
    return ["08:00", "20:00"];
  }
  if (f.includes("3") || f.includes("thrice") || /t\.?i\.?d/.test(f)) {
    return ["08:00", "14:00", "20:00"];
  }
  if (f.includes("4")) return ["08:00", "12:00", "16:00", "20:00"];
  return ["08:00"];
};

export const todayKey = (): string => new Date().toISOString().slice(0, 10);