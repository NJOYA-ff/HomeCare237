/**
 * familyService.ts
 *
 * Manages family / dependent sub-profiles for patients in HomeCare237.
 * Enables one smartphone user to manage appointments, vitals, and prescriptions
 * for children, elderly parents, and dependents.
 */
import { db } from "../../firebaseconfig";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

export type RelationshipType = "self" | "child" | "parent" | "spouse" | "other";

export interface FamilyMember {
  id: string;
  fullName: string;
  relationship: RelationshipType;
  age?: number;
  dateOfBirth?: string;
  gender: "male" | "female" | "other";
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  notes?: string;
  createdAt?: any;
}

export const getFamilyMembers = async (patientId: string): Promise<FamilyMember[]> => {
  try {
    const colRef = collection(db, "patients", patientId, "familyMembers");
    const snap = await getDocs(colRef);
    const members: FamilyMember[] = [];
    snap.forEach((d) => {
      members.push({ id: d.id, ...(d.data() as any) });
    });
    return members;
  } catch (err) {
    console.warn("[familyService] Firestore get fallback, checking localStorage:", err);
    try {
      const cached = localStorage.getItem(`hc_family_${patientId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
};

export const addFamilyMember = async (
  patientId: string,
  member: Omit<FamilyMember, "id">
): Promise<FamilyMember> => {
  const payload = {
    ...member,
    createdAt: Timestamp.now(),
  };

  try {
    const colRef = collection(db, "patients", patientId, "familyMembers");
    const docRef = await addDoc(colRef, payload);
    const newMember: FamilyMember = { id: docRef.id, ...payload };

    // Update local cache
    const existing = await getFamilyMembers(patientId);
    localStorage.setItem(`hc_family_${patientId}`, JSON.stringify([...existing, newMember]));

    return newMember;
  } catch (err) {
    console.warn("[familyService] Firestore add fallback to local:", err);
    const fallbackMember: FamilyMember = {
      id: `local-fam-${Date.now()}`,
      ...payload,
    };
    const existing = await getFamilyMembers(patientId);
    localStorage.setItem(`hc_family_${patientId}`, JSON.stringify([...existing, fallbackMember]));
    return fallbackMember;
  }
};

export const deleteFamilyMember = async (patientId: string, memberId: string): Promise<void> => {
  try {
    if (!memberId.startsWith("local-fam-")) {
      await deleteDoc(doc(db, "patients", patientId, "familyMembers", memberId));
    }
    const existing = await getFamilyMembers(patientId);
    const filtered = existing.filter((m) => m.id !== memberId);
    localStorage.setItem(`hc_family_${patientId}`, JSON.stringify(filtered));
  } catch (err) {
    console.error("[familyService] Failed to delete member:", err);
  }
};
