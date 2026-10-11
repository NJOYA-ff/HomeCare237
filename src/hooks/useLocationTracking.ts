/**
 * useLocationTracking.ts
 *
 * Tracks the device's real-time GPS position, reverse-geocodes it to
 * town / division / subdivision, and persists to Firestore.
 *
 * Platform strategy:
 *  • Native (Android / iOS) — uses @capacitor/geolocation so the request
 *    goes through the native OS permission system and the real GPS chip.
 *    The plugin calls requestPermissions() before starting the watcher so
 *    the user sees the system prompt automatically.
 *  • Web (browser / Capacitor dev-server) — falls back to the standard
 *    navigator.geolocation API.
 *
 * maximumAge is set to 0 so the OS MUST return a fresh GPS reading and
 * cannot serve a stale cached position from a previous session.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Geolocation,
  type CallbackID,
} from "@capacitor/geolocation";
import {
  updateLocation,
  stopSharingLocation,
  reverseGeocode,
  type UserRole,
  type GeocodedLocation,
} from "../components/Services/locationService";

export type LocationPermission = "prompt" | "granted" | "denied" | "unsupported";

export interface UseLocationTrackingOptions {
  uid: string | null;
  role: UserRole;
  name: string;
  avatar?: string;
}

export interface UseLocationTrackingReturn {
  /** City/town name, e.g. "Buea". Null until first geocode succeeds. */
  town: string | null;
  /** Administrative division, e.g. "Fako". Null until geocoded. */
  division: string | null;
  /** Region/subdivision, e.g. "Southwest". Null until geocoded. */
  subdivision: string | null;
  /** True once the GPS watcher has received at least one fix. */
  isTracking: boolean;
  /** Raw lat/lng of last GPS fix — displayed so user can verify accuracy. */
  position: GeolocationPosition | null;
  /** Current permission state for the Geolocation API. */
  permissionState: LocationPermission;
  /** Human-readable error, or null when healthy. */
  error: string | null;
}

/** Minimum ms between Nominatim requests (rate-limit: 1 req/s). */
const GEOCODE_INTERVAL_MS = 30_000;

/** True when running inside a native Capacitor app (Android or iOS). */
const IS_NATIVE = Capacitor.isNativePlatform();

// ─── Thin adapter so geocode + Firestore code stays platform-agnostic ─────────

interface SimpleCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

/** Convert a Capacitor position to the GeolocationPosition shape the rest of
 *  the app already expects (used only for the `position` state value). */
function makeWebPosition(coords: SimpleCoords, timestamp: number): GeolocationPosition {
  return {
    coords: {
      latitude:         coords.latitude,
      longitude:        coords.longitude,
      accuracy:         coords.accuracy,
      altitude:         null,
      altitudeAccuracy: null,
      heading:          coords.heading,
      speed:            coords.speed,
      // toJSON is required by the GeolocationCoordinates interface
      toJSON() {
        return {
          latitude:         coords.latitude,
          longitude:        coords.longitude,
          accuracy:         coords.accuracy,
          altitude:         null,
          altitudeAccuracy: null,
          heading:          coords.heading,
          speed:            coords.speed,
        };
      },
    },
    timestamp,
    toJSON() { return this; },
  } as unknown as GeolocationPosition;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocationTracking({
  uid,
  role,
  name,
  avatar,
}: UseLocationTrackingOptions): UseLocationTrackingReturn {
  const [town, setTown]               = useState<string | null>(null);
  const [division, setDivision]       = useState<string | null>(null);
  const [subdivision, setSubdivision] = useState<string | null>(null);
  const [isTracking, setIsTracking]   = useState(false);
  const [position, setPosition]       = useState<GeolocationPosition | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermission>("prompt");
  const [error, setError]             = useState<string | null>(null);

  const optsRef            = useRef({ uid, role, name, avatar });
  optsRef.current          = { uid, role, name, avatar };

  // Capacitor watcher ID (string) or web watcher ID (number)
  const watchIdRef         = useRef<CallbackID | number | null>(null);
  const lastGeocodeTimeRef = useRef<number>(0);
  const latestCoordsRef    = useRef<SimpleCoords | null>(null);

  // ── Geocode + Firestore write ───────────────────────────────────────────────

  const doGeocode = useCallback(async (coords: SimpleCoords) => {
    const now = Date.now();
    if (now - lastGeocodeTimeRef.current < GEOCODE_INTERVAL_MS) return;
    lastGeocodeTimeRef.current = now;

    console.log(
      `[Location][${IS_NATIVE ? "native" : "web"}] GPS fix: ` +
      `lat=${coords.latitude.toFixed(5)}, lng=${coords.longitude.toFixed(5)}, ` +
      `accuracy=${coords.accuracy.toFixed(0)}m`,
    );

    const geo: GeocodedLocation = await reverseGeocode(
      coords.latitude,
      coords.longitude,
    );

    console.log("[Location] Geocoded:", geo);

    if (geo.town && geo.town !== "Unknown") setTown(geo.town);
    if (geo.division)    setDivision(geo.division);
    if (geo.subdivision) setSubdivision(geo.subdivision);

    const { uid: u, role: r, name: n, avatar: av } = optsRef.current;
    if (u) {
      try {
        // updateLocation expects GeolocationCoordinates; we cast SimpleCoords
        // which has all the same fields it actually reads.
        await updateLocation(
          u, r, n,
          coords as unknown as GeolocationCoordinates,
          av, geo,
        );
      } catch (e) {
        console.warn("[Location] Firestore write failed:", e);
      }
    }
  }, []);

  // ── Success handler (shared by both platforms) ──────────────────────────────

  const handleSuccess = useCallback(
    (coords: SimpleCoords, timestamp: number) => {
      const webPos = makeWebPosition(coords, timestamp);
      setPosition(webPos);
      setIsTracking(true);
      setError(null);
      setPermissionState("granted");
      latestCoordsRef.current = coords;
      doGeocode(coords);
    },
    [doGeocode],
  );

  // ── GPS watcher ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function startNativeWatcher() {
      // ── Request permission first on native ─────────────────────────────────
      try {
        const perm = await Geolocation.requestPermissions();
        // perm.location: "granted" | "denied" | "prompt"
        const state = perm.location as LocationPermission;
        if (!cancelled) setPermissionState(state);

        if (state === "denied") {
          if (!cancelled) {
            setError("Location permission denied. Please enable it in Settings → App permissions.");
            setIsTracking(false);
          }
          return;
        }
      } catch (e) {
        console.warn("[Location] requestPermissions() failed:", e);
        // Continue anyway — some Android versions throw but the watch still works
      }

      // ── Start the native watcher ───────────────────────────────────────────
      console.log("[Location] Starting Capacitor GPS watcher (native)");

      try {
        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout:            30_000,
            maximumAge:         0,
          },
          (pos, err) => {
            if (cancelled) return;

            if (err || !pos) {
              setIsTracking(false);
              const msg = err?.message ?? "Unknown location error";
              console.warn("[Location] Capacitor GPS error:", msg);

              if (msg.includes("denied") || msg.includes("permission")) {
                setPermissionState("denied");
                setError("Location permission denied. Please enable it in Settings → App permissions.");
              } else if (msg.includes("unavailable")) {
                setError("Location unavailable. Make sure GPS is enabled.");
              } else if (msg.includes("timeout") || msg.includes("timed out")) {
                setError("Location timed out. Retrying…");
              } else {
                setError("Unable to determine location.");
              }
              return;
            }

            handleSuccess(
              {
                latitude:  pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy:  pos.coords.accuracy,
                heading:   pos.coords.heading   ?? null,
                speed:     pos.coords.speed     ?? null,
              },
              pos.timestamp,
            );
          },
        );

        if (!cancelled) {
          watchIdRef.current = id;
        } else {
          // Component unmounted before the watcher resolved — clean up immediately
          Geolocation.clearWatch({ id });
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[Location] watchPosition failed:", e);
          setError("Could not start location tracking.");
        }
      }
    }

    function startWebWatcher() {
      if (!("geolocation" in navigator)) {
        setPermissionState("unsupported");
        setError("Geolocation is not supported on this device.");
        return;
      }

      // Probe existing permission without prompting
      if ("permissions" in navigator) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((status) => {
            if (!cancelled) setPermissionState(status.state as LocationPermission);
            status.onchange = () => {
              if (!cancelled) setPermissionState(status.state as LocationPermission);
            };
          })
          .catch(() => {});
      }

      console.log("[Location] Starting navigator.geolocation watcher (web)");

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          handleSuccess(
            {
              latitude:  pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy:  pos.coords.accuracy,
              heading:   pos.coords.heading,
              speed:     pos.coords.speed,
            },
            pos.timestamp,
          );
        },
        (geoError) => {
          if (cancelled) return;
          setIsTracking(false);
          console.warn("[Location] Web GPS error:", geoError.code, geoError.message);
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              setPermissionState("denied");
              setError("Location permission denied. Please enable it in your browser settings.");
              break;
            case geoError.POSITION_UNAVAILABLE:
              setError("Location unavailable. Make sure GPS is enabled.");
              break;
            case geoError.TIMEOUT:
              setError("Location timed out. Retrying…");
              break;
            default:
              setError("Unable to determine location.");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge:         0,
          timeout:            30_000,
        },
      );

      watchIdRef.current = id;
    }

    if (IS_NATIVE) {
      startNativeWatcher();
    } else {
      startWebWatcher();
    }

    return () => {
      cancelled = true;
      console.log("[Location] Stopping GPS watcher");

      if (IS_NATIVE) {
        if (watchIdRef.current !== null) {
          Geolocation.clearWatch({ id: watchIdRef.current as CallbackID });
          watchIdRef.current = null;
        }
      } else {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
          watchIdRef.current = null;
        }
      }
    };
  }, [handleSuccess]);

  // ── Write to Firestore when uid arrives after first GPS fix ────────────────

  useEffect(() => {
    if (!uid || !latestCoordsRef.current) return;
    const coords = latestCoordsRef.current;
    if (!town) {
      lastGeocodeTimeRef.current = 0; // force immediate geocode
      doGeocode(coords);
    } else {
      updateLocation(
        uid, role, name,
        coords as unknown as GeolocationCoordinates,
        avatar,
        { town: town ?? "", division: division ?? "", subdivision: subdivision ?? "" },
      ).catch(() => {});
    }
  // Only re-run when uid transitions null → value
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ── Mark offline on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      const { uid: u } = optsRef.current;
      if (u) stopSharingLocation(u).catch(() => {});
    };
  }, []);

  return { town, division, subdivision, isTracking, position, permissionState, error };
}
