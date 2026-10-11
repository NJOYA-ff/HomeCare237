/**
 * Legacy admin accounts (addDoc-era documents) can still sign in.
 *
 * Admin records created by older builds of Admin_doctor.tsx used addDoc(),
 * so the Firestore document ID is a random auto-ID: the Auth UID only lives
 * in the document's `uid` FIELD, and there is no `role` field at all (the
 * collection name was the role). A UID-keyed getDoc() therefore finds
 * nothing and sign-in failed with "User data not found in any database
 * collection" no matter how correct the routing was.
 *
 * These tests pin the fallback in AuthService.findUserInCollections():
 *   1. UID-keyed lookups are tried first (fast path for current accounts);
 *   2. on a miss, the collections are queried by the `uid` FIELD;
 *   3. a legacy `admins` document resolves to UserRole.Admin (never Doctor);
 *   4. identity (`User.id`) is the Auth UID, not the auto-ID document ID;
 *   5. if nothing matches anywhere, login still fails loudly instead of
 *      guessing a role.
 *
 * Harness mirrors App.noAutoLogin.test.tsx: import the real App module
 * with firebaseconfig / firebase/auth / firebase/firestore mocked, then
 * drive authService directly (no render needed).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(async () => {}),
  getRedirectResult: vi.fn(async () => null),
  signInWithEmailAndPassword: vi.fn(async () => ({
    user: { uid: "legacy-admin-uid" },
  })),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  getDocs: vi.fn(),
  saveCredentials: vi.fn(async () => {}),
  clearCredentials: vi.fn(async () => {}),
}));

/** Exactly what the old handleAdminSignup wrote: UID as a field, no `role`. */
const legacyAdminDocument = {
  id: "auto-generated-doc-id",
  data: () => ({
    name: "Legacy Admin",
    email: "legacy.admin@homecare237.cm",
    uid: "legacy-admin-uid",
    isActive: true,
    avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
  }),
};

vi.mock("../firebaseconfig", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
  messaging: null,
}));

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...actual,
    // Keep the SDK quiet in jsdom: no real Auth instance is wired up.
    getAuth: () => ({ currentUser: null, onAuthStateChanged: () => () => {} }),
    onAuthStateChanged: () => () => {},
    signOut: mocks.signOut,
    getRedirectResult: mocks.getRedirectResult,
    signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  };
});

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return {
    ...actual,
    doc: vi.fn(() => ({})),
    getDoc: mocks.getDoc,
    // The fallback path builds query(collection(db, name), where(...));
    // keep them as inert pass-throughs so getDocs can assert on the shape.
    collection: vi.fn((_db: unknown, name: string) => ({ path: name })),
    query: vi.fn((...parts: unknown[]) => parts),
    where: vi.fn((field: string, op: string, value: unknown) => ({
      field,
      op,
      value,
    })),
    getDocs: mocks.getDocs,
  };
});

// Only the credential helpers are replaced; the rest of the module stays real.
vi.mock("../utils/BiometricAuthService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/BiometricAuthService")>();
  return {
    ...actual,
    saveCredentials: mocks.saveCredentials,
    clearCredentials: mocks.clearCredentials,
  };
});

import { authService, UserRole } from "../App";

describe("legacy admin accounts (addDoc-era documents)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: every UID-keyed lookup misses, the field query finds the doc.
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.getDocs.mockResolvedValue({ docs: [legacyAdminDocument] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("finds the account by its uid FIELD and signs the admin in", async () => {
    const user = await authService.login1(
      "legacy.admin@homecare237.cm",
      "secret123",
      [UserRole.Doctor, UserRole.Admin]
    );

    expect(user).not.toBeNull();
    // Collection-derived role wins: a roleless `admins` doc is an Admin.
    expect(user!.role).toBe(UserRole.Admin);
    // Identity is the Auth UID, never the auto-ID document ID.
    expect(user!.id).toBe("legacy-admin-uid");

    // The UID-keyed fast path ran first…
    expect(mocks.getDoc).toHaveBeenCalled();
    // …then the fallback queried the `uid` field for this Auth UID.
    expect(mocks.getDocs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          field: "uid",
          op: "==",
          value: "legacy-admin-uid",
        }),
      ])
    );
  });

  it("never resolves a legacy admin document as a doctor", async () => {
    const user = await authService.login1(
      "legacy.admin@homecare237.cm",
      "secret123",
      [UserRole.Doctor, UserRole.Admin]
    );

    expect(user!.role).not.toBe(UserRole.Doctor);
    expect(user!.role).toBe(UserRole.Admin);
  });

  it("fails loudly when no document matches anywhere instead of guessing a role", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });

    await expect(
      authService.login1("nobody@homecare237.cm", "secret123", [
        UserRole.Doctor,
        UserRole.Admin,
      ])
    ).rejects.toThrow("User data not found in any database collection");

    // Fallback searched all three legacy-eligible collections.
    expect(mocks.getDocs).toHaveBeenCalledTimes(3);
  });
});
