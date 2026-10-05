/**
 * firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging service worker.
 * This file MUST be served from the root of the site (i.e. /firebase-messaging-sw.js)
 * so it can intercept push events for the whole origin.
 *
 * The service worker handles messages that arrive when the app is in the
 * background or the browser tab is closed.  Foreground messages are handled
 * inside the app by onMessage() in WebPushService.ts.
 */

/* global importScripts, firebase */

// ── Firebase SDK (compat build works inside service workers) ──────────────────
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

// ── Initialise with the same config used in the main app ─────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyBTITuiGdKTyYlgQ5CIoN890xHPRTZkghc",
  authDomain: "homecare-1c228.firebaseapp.com",
  projectId: "homecare-1c228",
  storageBucket: "homecare-1c228.firebasestorage.app",
  messagingSenderId: "770997904222",
  appId: "1:770997904222:web:855359e3b960dcb7c225cf",
});

const messaging = firebase.messaging();

/**
 * Background message handler.
 *
 * When a push message arrives while the app is in the background (or closed),
 * Firebase will show a default notification.  You can override that here to
 * customise the title, body, icon, and click action.
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const notificationTitle =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    "HomeCare237";

  const notificationOptions = {
    body:
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      "",
    icon: "/icons/icon-192.webp",
    badge: "/icons/icon-96.webp",
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Notification click handler.
 * Opens (or focuses) the app when the user taps the notification.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});
