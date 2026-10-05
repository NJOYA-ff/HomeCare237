import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// Firebase configuration
//
// Vite only exposes variables prefixed with `VITE_` to the client bundle, and
// only values present when the dev server / build starts.  These names must
// match the `VITE_REACT_APP_FIREBASE_*` keys defined in `.env` / `.env.local`
// (see the "firebase" section there).  Editing those files requires a dev
// server restart before the new values are picked up.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_REACT_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_REACT_APP_FIREBASE_MEASUREMENT_ID,
};

/**
 * Fail fast when the environment is incomplete.
 *
 * `initializeApp()` silently accepts an `undefined` apiKey — the failure only
 * surfaces later inside `getAuth()` as the very unhelpful
 * `FirebaseError: Firebase: Error (auth/invalid-api-key).`  Throwing here
 * instead makes the real cause (a missing/misnamed `.env` key) obvious.
 *
 * `measurementId` is intentionally not required: Analytics is optional.
 */
const REQUIRED_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

const missingKeys = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  throw new Error(
    `[firebaseconfig] Missing Firebase configuration value(s): ${missingKeys.join(", ")}. ` +
      "Add the matching VITE_REACT_APP_FIREBASE_* entries to .env (or .env.local) " +
      "and restart the Vite dev server so they are picked up."
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  console.warn("[firebaseconfig] Offline persistence fallback:", err);
  db = getFirestore(app);
}

const auth = getAuth(app);
const storage = getStorage(app);

/**
 * Firebase Cloud Messaging instance – only available in browser environments
 * that support the service worker API.  On native Capacitor (Android/iOS) this
 * is intentionally null; push notifications are handled by the native
 * @capacitor/push-notifications plugin instead.
 *
 * Usage:
 *   import { messaging } from "./firebaseconfig";
 *   if (messaging) { ... }
 */
let messaging: ReturnType<typeof getMessaging> | null = null;

(async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
    }
  } catch {
    // Service workers are not available (e.g. running in a Capacitor WebView)
  }
})();

export { auth, db, storage, messaging };
