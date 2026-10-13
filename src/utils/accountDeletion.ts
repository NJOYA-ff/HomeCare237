/**
 * Account deletion helpers for patient and doctor self-service erasure.
 *
 * Order matters: Firestore data is wiped while the Auth session is still valid,
 * then the Auth user is deleted (which ends the session). Local quick-sign-in
 * credentials are cleared last so a deleted account cannot be revived via PIN.
 */

import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { auth, db } from "../firebaseconfig";
import {
  clearCredentials,
  disablePin,
  setBiometricEnabled,
} from "./BiometricAuthService";

/** Roles allowed to self-delete (admins are provisioned/managed separately). */
export type DeletableAccountRole = "patient" | "doctor";

export type AccountAuthMethod = "password" | "google" | "other";

export function getAccountAuthMethod(
  user: FirebaseUser | null = auth.currentUser,
): AccountAuthMethod {
  if (!user) return "other";
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes("password")) return "password";
  if (ids.includes("google.com")) return "google";
  return "other";
}

async function deleteQueryMatches(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<void> {
  const snap = await getDocs(query(collection(db, collectionName), ...constraints));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

async function deleteSubcollection(
  parentPath: string,
  subcollection: string,
): Promise<void> {
  const snap = await getDocs(collection(db, parentPath, subcollection));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Best-effort wipe of Firestore data owned by this account.
 * Failures on individual collections are logged and skipped so Auth deletion
 * can still proceed when rules or legacy docs block a subset.
 */
export async function deleteOwnedFirestoreData(
  uid: string,
  role: DeletableAccountRole,
): Promise<void> {
  const profileCollection = role === "patient" ? "patients" : "doctors";

  const tasks: Array<Promise<void>> = [
    deleteDoc(doc(db, profileCollection, uid)).catch((err) => {
      console.warn(`Failed to delete ${profileCollection}/${uid}:`, err);
    }),
    deleteDoc(doc(db, "userLocations", uid)).catch(() => undefined),
    deleteQueryMatches("notifications", where("recipientId", "==", uid)).catch(
      (err) => console.warn("notifications cleanup failed:", err),
    ),
    deleteQueryMatches("fcmTokens", where("userId", "==", uid)).catch(() =>
      undefined,
    ),
    deleteQueryMatches("fcmTokens", where("uid", "==", uid)).catch(() =>
      undefined,
    ),
  ];

  if (role === "patient") {
    tasks.push(
      deleteSubcollection(`patients/${uid}`, "medications").catch((err) =>
        console.warn("patient medications cleanup failed:", err),
      ),
      deleteSubcollection(`patients/${uid}`, "familyMembers").catch((err) =>
        console.warn("family members cleanup failed:", err),
      ),
      deleteQueryMatches("medications", where("patientId", "==", uid)).catch(
        (err) => console.warn("medications cleanup failed:", err),
      ),
      deleteQueryMatches("vitals", where("patientId", "==", uid)).catch((err) =>
        console.warn("vitals cleanup failed:", err),
      ),
      deleteQueryMatches("appointments", where("patientId", "==", uid)).catch(
        (err) => console.warn("appointments cleanup failed:", err),
      ),
      deleteQueryMatches("healthMetrics", where("patientId", "==", uid)).catch(
        () => undefined,
      ),
    );
  } else {
    tasks.push(
      deleteQueryMatches("appointments", where("doctorId", "==", uid)).catch(
        (err) => console.warn("doctor appointments cleanup failed:", err),
      ),
      deleteQueryMatches(
        "appointments",
        where("doctorUserId", "==", uid),
      ).catch(() => undefined),
    );
  }

  await Promise.all(tasks);
}

export async function reauthenticateForDeletion(
  password?: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to delete your account.");
  }

  const method = getAccountAuthMethod(user);

  if (method === "password") {
    if (!user.email) {
      throw new Error("No email is linked to this account.");
    }
    if (!password) {
      throw new Error("Password is required to delete your account.");
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return;
  }

  if (method === "google") {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    // Popup works on web; on native WebViews it may fail — surface a clear error.
    try {
      await reauthenticateWithPopup(user, provider);
    } catch (error) {
      if (Capacitor.isNativePlatform()) {
        throw new Error(
          "Please sign out, sign back in with Google, then try deleting your account again within a few minutes.",
        );
      }
      throw error;
    }
    return;
  }

  throw new Error(
    "This sign-in method cannot confirm account deletion in-app. Contact support.",
  );
}

export async function clearLocalAccountSecrets(): Promise<void> {
  await Promise.all([
    clearCredentials(),
    disablePin().catch(() => undefined),
    setBiometricEnabled(false).catch(() => undefined),
  ]);
}

/**
 * Full self-service account deletion for the signed-in patient or doctor.
 */
export async function deleteCurrentAccount(options: {
  role: DeletableAccountRole;
  password?: string;
}): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error("You must be signed in to delete your account.");
  }

  await reauthenticateForDeletion(options.password);
  await deleteOwnedFirestoreData(firebaseUser.uid, options.role);
  await deleteUser(firebaseUser);
  await clearLocalAccountSecrets();
}
