/**
 * locationService.ts
 *
 * Handles reading and writing user location data to Firestore.
 * Locations are stored under the `userLocations` collection with the
 * authenticated user's UID as the document ID.
 *
 * Firestore document shape  (collection: userLocations / doc: <uid>):
 * {
 *   uid:         string,
 *   role:        'patient' | 'doctor' | 'admin',
 *   name:        string,
 *   lat:         number,
 *   lng:         number,
 *   accuracy:    number,
 *   heading:     number | null,
 *   speed:       number | null,
 *   isSharing:   boolean,
 *   town:        string,       // e.g. "Buea"
 *   division:    string,       // e.g. "Fako"
 *   subdivision: string,       // e.g. "Southwest"
 *   updatedAt:   Timestamp,
 * }
 */

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  Timestamp,
  type Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseconfig";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "patient" | "doctor" | "admin";

export interface LocationRecord {
  uid: string;
  role: UserRole;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  isSharing: boolean;
  updatedAt: Timestamp;
  /** Reverse-geocoded city/town name, e.g. "Buea" */
  town?: string;
  /** Administrative division (county in Nominatim), e.g. "Fako", "Mfoundi" */
  division?: string;
  /** Region / subdivision (state in Nominatim), e.g. "Southwest", "Centre" */
  subdivision?: string;
  /** Optional profile image */
  avatar?: string;
}

/** Structured geocode result returned by reverseGeocode() */
export interface GeocodedLocation {
  /** City/town name, e.g. "Buea", "Yaoundé", "Douala" */
  town: string;
  /** Administrative division, e.g. "Fako", "Mfoundi", "Wouri" */
  division: string;
  /** Region, e.g. "Southwest", "Centre", "Littoral" */
  subdivision: string;
}

const COLLECTION = "userLocations";

// ─── Reverse geocoding ────────────────────────────────────────────────────────

/**
 * Resolve a lat/lng to town, division, and subdivision using Nominatim (OSM).
 *
 * Nominatim field mapping for Cameroon:
 *   town        → top-level `name`   (e.g. "Yaoundé III") stripped of Roman numeral suffix
 *   division    → address.county     (e.g. "Fako", "Mfoundi", "Wouri")
 *   subdivision → address.state      (e.g. "Southwest", "Centre", "Littoral")
 *
 * Roman numeral stripping handles arrondissement names:
 *   "Yaoundé III" → "Yaoundé"
 *   "Douala V"    → "Douala"
 *   "Limbé II"    → "Limbé"
 *   "Buea"        → "Buea"   (unchanged)
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodedLocation> {
  const fallback: GeocodedLocation = { town: "Unknown", division: "", subdivision: "" };

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json` +
      `&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "HomeCare237/1.0 (homecare237@healthcare.cm)",
      },
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const a = data?.address ?? {};

    // ── Town/City ─────────────────────────────────────────────────────────
    const rawName: string =
      data?.name  ||
      a.city      ||
      a.town      ||
      a.village   ||
      a.suburb    ||
      (data?.display_name?.split(",")[0] ?? "");

    const town = rawName.replace(/\s+[IVXLC]+$/i, "").trim() || "Unknown";

    // ── Division (administrative county) ──────────────────────────────────
    const division: string = a.county || "";

    // ── Subdivision (region/state) ─────────────────────────────────────────
    const subdivision: string = a.state || "";

    return { town, division, subdivision };
  } catch {
    return fallback;
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist the user's current position and geocoded location to Firestore.
 */
export async function updateLocation(
  uid: string,
  role: UserRole,
  name: string,
  coords: GeolocationCoordinates,
  avatar?: string,
  geo?: GeocodedLocation,
): Promise<void> {
  const record: LocationRecord = {
    uid,
    role,
    name,
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
    heading: coords.heading,
    speed: coords.speed,
    isSharing: true,
    updatedAt: Timestamp.now(),
    ...(avatar           ? { avatar }                      : {}),
    ...(geo?.town        ? { town: geo.town }              : {}),
    ...(geo?.division    ? { division: geo.division }      : {}),
    ...(geo?.subdivision ? { subdivision: geo.subdivision } : {}),
  };

  await setDoc(doc(db, COLLECTION, uid), record, { merge: true });
}

/**
 * Mark the user as no longer sharing their location.
 */
export async function stopSharingLocation(uid: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, uid), {
    isSharing: false,
    updatedAt: Timestamp.now(),
  });
}

// ─── Read (one-shot) ──────────────────────────────────────────────────────────

export async function getUserLocation(
  uid: string,
): Promise<LocationRecord | null> {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  return snap.exists() ? (snap.data() as LocationRecord) : null;
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToLocations(
  onUpdate: (locations: LocationRecord[]) => void,
  role?: UserRole,
): Unsubscribe {
  const baseQuery = collection(db, COLLECTION);
  const q = role
    ? query(baseQuery, where("isSharing", "==", true), where("role", "==", role))
    : query(baseQuery, where("isSharing", "==", true));

  return onSnapshot(q, (snap) => {
    const records: LocationRecord[] = [];
    snap.forEach((d) => records.push(d.data() as LocationRecord));
    onUpdate(records);
  });
}

export function subscribeToUserLocation(
  uid: string,
  onUpdate: (location: LocationRecord | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTION, uid), (snap) => {
    onUpdate(snap.exists() ? (snap.data() as LocationRecord) : null);
  });
}
