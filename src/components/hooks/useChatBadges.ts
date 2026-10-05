/**
 * useChatBadges
 *
 * Real-time Firestore listener that returns a map of { [menuUrl]: count }
 * for the currently authenticated user.
 *
 * Chat badges (unread messages):
 *   /admin/sms_patient   – total unread msgs from patients
 *   /admin/sms_doctor    – total unread msgs from doctors
 *   /doc/consult         – total unread msgs from patients (doctor view)
 *   /doc/sms_admin       – total unread msgs from admin (doctor view)
 *   /patient/consult     – total unread msgs from doctors/admin (patient view)
 *
 * Appointment badges (pending / newly confirmed):
 *   /admin/appointments        – appointments with status "pending"
 *   /doc/appointments          – doctor's appointments with status "pending"
 *   /patient/book_appointment  – patient's appointments confirmed/accepted by doctor
 *
 * Referral badges (pending incoming):
 *   /doc/refer_patients  – referrals where receivingDoctorId == uid AND status "pending"
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseconfig";

type BadgeMap = Record<string, number>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Sum the `unreadCount` field across all documents in a snapshot. */
const sumUnread = (snapshot: any): number =>
  snapshot.docs.reduce(
    (acc: number, d: any) => acc + (Number(d.data().unreadCount) || 0),
    0,
  );

/** Count documents in a snapshot (each doc = 1 pending item). */
const countDocs = (snapshot: any): number => snapshot.size;

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useChatBadges = (): BadgeMap => {
  const [badges, setBadges] = useState<BadgeMap>({});

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setBadges({});
        return;
      }

      const uid = user.uid;
      const unsubs: (() => void)[] = [];

      /** Update a single URL's count (no-op if unchanged to avoid re-renders). */
      const setUrl = (url: string, count: number) => {
        setBadges((prev) => {
          if (prev[url] === count) return prev;
          return { ...prev, [url]: count };
        });
      };

      // Detect role via Firestore collection membership, then attach listeners
      (async () => {
        try {
          const adminSnap = await getDoc(doc(db, "admins", uid));
          if (adminSnap.exists()) {
            attachAdminListeners(uid, setUrl, unsubs);
            return;
          }

          const doctorSnap = await getDoc(doc(db, "doctors", uid));
          if (doctorSnap.exists()) {
            attachDoctorListeners(uid, setUrl, unsubs);
            return;
          }

          // Default: patient
          attachPatientListeners(uid, setUrl, unsubs);
        } catch (e) {
          console.error("useChatBadges: role detection failed", e);
        }
      })();

      return () => unsubs.forEach((u) => u());
    });

    return () => unsubAuth();
  }, []);

  return badges;
};

// ─── Admin listeners ────────────────────────────────────────────────────────────

function attachAdminListeners(
  uid: string,
  setUrl: (url: string, count: number) => void,
  unsubs: (() => void)[],
) {
  // ── Chats ──────────────────────────────────────────────────────────────────

  // sms_patient: chats where type == "admin" (patient-initiated chats with admin)
  unsubs.push(
    onSnapshot(
      query(collection(db, "chats"), where("type", "==", "admin")),
      (snap) => setUrl("/admin/sms_patient", sumUnread(snap)),
      (e) => console.error("useChatBadges admin/sms_patient:", e),
    ),
  );

  // sms_doctor: admin_chats where adminId == uid
  unsubs.push(
    onSnapshot(
      query(collection(db, "admin_chats"), where("adminId", "==", uid)),
      (snap) => setUrl("/admin/sms_doctor", sumUnread(snap)),
      (e) => console.error("useChatBadges admin/sms_doctor:", e),
    ),
  );

  // ── Appointments ───────────────────────────────────────────────────────────

  // All pending appointments (admin needs to action them)
  unsubs.push(
    onSnapshot(
      query(collection(db, "appointments"), where("status", "==", "pending")),
      (snap) => setUrl("/admin/appointments", countDocs(snap)),
      (e) => console.error("useChatBadges admin/appointments:", e),
    ),
  );
}

// ─── Doctor listeners ───────────────────────────────────────────────────────────

function attachDoctorListeners(
  uid: string,
  setUrl: (url: string, count: number) => void,
  unsubs: (() => void)[],
) {
  // ── Chats ──────────────────────────────────────────────────────────────────

  // consult: chats where doctorId == uid (patient → doctor unread)
  unsubs.push(
    onSnapshot(
      query(collection(db, "chats"), where("doctorId", "==", uid)),
      (snap) => setUrl("/doc/consult", sumUnread(snap)),
      (e) => console.error("useChatBadges doc/consult:", e),
    ),
  );

  // sms_admin: admin_chats where doctorId == uid (admin → doctor unread)
  unsubs.push(
    onSnapshot(
      query(collection(db, "admin_chats"), where("doctorId", "==", uid)),
      (snap) => setUrl("/doc/sms_admin", sumUnread(snap)),
      (e) => console.error("useChatBadges doc/sms_admin:", e),
    ),
  );

  // ── Appointments ───────────────────────────────────────────────────────────

  // Pending appointments for this doctor
  unsubs.push(
    onSnapshot(
      query(
        collection(db, "appointments"),
        where("doctorId", "==", uid),
        where("status", "==", "pending"),
      ),
      (snap) => setUrl("/doc/appointments", countDocs(snap)),
      (e) => console.error("useChatBadges doc/appointments:", e),
    ),
  );

  // ── Referrals ──────────────────────────────────────────────────────────────

  // Incoming referrals this doctor needs to accept
  unsubs.push(
    onSnapshot(
      query(
        collection(db, "referrals"),
        where("receivingDoctorId", "==", uid),
        where("status", "==", "pending"),
      ),
      (snap) => setUrl("/doc/refer_patients", countDocs(snap)),
      (e) => console.error("useChatBadges doc/refer_patients:", e),
    ),
  );
}

// ─── Patient listeners ──────────────────────────────────────────────────────────

function attachPatientListeners(
  uid: string,
  setUrl: (url: string, count: number) => void,
  unsubs: (() => void)[],
) {
  // ── Chats ──────────────────────────────────────────────────────────────────

  // consult: chats where patientId == uid (doctor/admin → patient unread)
  unsubs.push(
    onSnapshot(
      query(collection(db, "chats"), where("patientId", "==", uid)),
      (snap) => setUrl("/patient/consult", sumUnread(snap)),
      (e) => console.error("useChatBadges patient/consult:", e),
    ),
  );

  // ── Appointments ───────────────────────────────────────────────────────────

  // Appointments confirmed/accepted by doctor — patient should be notified
  unsubs.push(
    onSnapshot(
      query(
        collection(db, "appointments"),
        where("patientId", "==", uid),
        where("status", "in", ["confirmed", "accepted"]),
      ),
      (snap) => setUrl("/patient/book_appointment", countDocs(snap)),
      (e) => console.error("useChatBadges patient/book_appointment:", e),
    ),
  );
}
