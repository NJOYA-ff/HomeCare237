/**
 * functions/src/index.ts
 *
 * Firebase Cloud Functions for HomeCare237  (firebase-functions v6 / gen-2 API)
 *
 * sendFcmOnNotification
 * ─────────────────────
 * Triggers whenever a document is CREATED in the top-level `notifications`
 * collection.  Every notification written there — by sendPushNotification,
 * medicationService, or NotificationServices.sendNow — causes this function to
 * look up the recipient's FCM token(s) and send a real push via the Firebase
 * Admin SDK.
 *
 * Token resolution order:
 *   1. fcmTokens/{recipientId}  – flat collection kept in sync by the app
 *   2. patients/{recipientId}   – role-specific document (fallback)
 *   3. doctors/{recipientId}
 *   4. admins/{recipientId}
 *
 * Both native (Android/iOS – `fcmToken`) and web (PWA – `fcmWebToken`) tokens
 * are targeted so the push arrives on every registered device / browser.
 *
 * Deploy:
 *   cd functions
 *   npm install
 *   npm run build
 *   firebase deploy --only functions
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

// ── Global options ─────────────────────────────────────────────────────────
setGlobalOptions({ region: "us-central1", memory: "256MiB", timeoutSeconds: 30 });

// ── Initialise Admin SDK (runs once per cold start) ────────────────────────
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// ── Types ──────────────────────────────────────────────────────────────────

interface NotificationDoc {
  recipientId?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  /** Set to true once FCM delivery has been attempted (prevents re-processing). */
  fcmSent?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Collect all FCM tokens stored for a given user UID.
 * Returns an array of { token, platform } tuples.
 * Deduplicates so we never send the same push twice.
 */
async function getTokensForUser(
  uid: string
): Promise<Array<{ token: string; platform: "android" | "ios" | "web" }>> {
  const tokens: Array<{ token: string; platform: "android" | "ios" | "web" }> = [];
  const seen = new Set<string>();

  const add = (token: string | undefined | null, platform: "android" | "ios" | "web") => {
    if (token && !seen.has(token)) {
      seen.add(token);
      tokens.push({ token, platform });
    }
  };

  // 1. Flat fcmTokens collection (most up-to-date, written by both native + web)
  try {
    const flat = await db.collection("fcmTokens").doc(uid).get();
    if (flat.exists) {
      const d = flat.data() ?? {};
      const nativePlatform: "android" | "ios" =
        d["fcmTokenPlatform"] === "ios" ? "ios" : "android";
      add(d["fcmToken"] as string | undefined, nativePlatform);
      add(d["fcmWebToken"] as string | undefined, "web");
    }
  } catch (err) {
    logger.warn(`[FCM] Could not read fcmTokens/${uid}:`, err);
  }

  // 2. Role-collection documents (fallback / redundancy)
  for (const col of ["patients", "doctors", "admins"]) {
    try {
      const snap = await db.collection(col).doc(uid).get();
      if (snap.exists) {
        const d = snap.data() ?? {};
        const nativePlatform: "android" | "ios" =
          d["fcmTokenPlatform"] === "ios" ? "ios" : "android";
        add(d["fcmToken"] as string | undefined, nativePlatform);
        add(d["fcmWebToken"] as string | undefined, "web");
        break; // a user only exists in one role collection
      }
    } catch (err) {
      logger.warn(`[FCM] Could not read ${col}/${uid}:`, err);
    }
  }

  return tokens;
}

/**
 * Sanitise `data` so every value is a string (FCM data payload requirement).
 */
function sanitiseData(raw?: Record<string, unknown>): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && v !== undefined) {
      out[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  return out;
}

// ── Cloud Function ─────────────────────────────────────────────────────────

/**
 * Fires on every new document created in `notifications/{docId}`.
 *
 * The Firestore Security Rules for this collection must allow authenticated
 * client writes (they do — see firestore.rules).  The Admin SDK used here
 * bypasses rules entirely.
 */
export const sendFcmOnNotification = onDocumentCreated(
  "notifications/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const docId = event.params.docId;
    const rawData = snap.data() as NotificationDoc | undefined;
    if (!rawData) return null;

    // ── Guard: already processed ─────────────────────────────────────────
    if (rawData.fcmSent === true) {
      logger.info(`[FCM] ${docId} already sent — skipping`);
      return null;
    }

    const recipientId = rawData.recipientId;
    if (!recipientId) {
      logger.warn(`[FCM] ${docId} has no recipientId — skipping`);
      await snap.ref.update({ fcmSent: true });
      return null;
    }

    const title = rawData.title ?? "HomeCare237";
    const body = rawData.body ?? "";
    const extraData = sanitiseData(rawData.data);

    // ── Resolve tokens ───────────────────────────────────────────────────
    const tokenEntries = await getTokensForUser(recipientId);

    if (tokenEntries.length === 0) {
      logger.info(
        `[FCM] No tokens for user ${recipientId} — stored in Firestore only`
      );
      await snap.ref.update({
        fcmSent: true,
        fcmSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }

    // ── Build & send messages ────────────────────────────────────────────
    const CHANNEL_ID = "homecare237_default";

    const sendResults = await Promise.allSettled(
      tokenEntries.map(({ token, platform }) => {
        const message: admin.messaging.Message = {
          token,
          notification: { title, body },
          data: {
            ...extraData,
            recipientId,
            docId,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          ...(platform === "android"
            ? {
                android: {
                  notification: {
                    channelId: CHANNEL_ID,
                    // ic_stat_health — white drawable in drawable-* density folders.
                    // Android alpha-masks it and tints it with the color below.
                    icon: "ic_stat_health",
                    color: "#2563EB",
                    sound: "beep.wav",
                    priority: "high" as const,
                    defaultSound: false,
                    defaultVibrateTimings: false,
                    vibrateTimingsMillis: [0, 250, 250, 250],
                    notificationCount: 1,
                  },
                  priority: "high" as const,
                  ttl: 3600000, // 1 hour TTL in ms
                  collapseKey: `hc_${recipientId}`,
                },
              }
            : platform === "ios"
            ? {
                apns: {
                  payload: {
                    aps: {
                      sound: "beep.wav",
                      badge: 1,
                      contentAvailable: true,
                    },
                  },
                },
              }
            : {
                webpush: {
                  notification: {
                    icon: "/icons/icon-192.webp",
                    badge: "/icons/icon-96.webp",
                  },
                  fcmOptions: { link: "/" },
                },
              }),
        };

        return messaging.send(message);
      })
    );

    // ── Log results ──────────────────────────────────────────────────────
    let successCount = 0;
    const staleTokens: string[] = [];

    sendResults.forEach((result, i) => {
      if (result.status === "fulfilled") {
        successCount++;
        logger.info(`[FCM] Delivered to ${tokenEntries[i].platform}: ${result.value}`);
      } else {
        const errorCode: string =
          (result.reason as { errorInfo?: { code?: string } })?.errorInfo?.code ?? "";
        logger.warn(
          `[FCM] Failed (${errorCode}) for ${tokenEntries[i].platform}:`,
          result.reason
        );
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          staleTokens.push(tokenEntries[i].token);
        }
      }
    });

    // ── Remove stale tokens ──────────────────────────────────────────────
    if (staleTokens.length > 0) {
      await removeStaleTokens(recipientId, staleTokens).catch((err) =>
        logger.warn("[FCM] Stale token cleanup failed:", err)
      );
    }

    // ── Mark doc as processed ────────────────────────────────────────────
    await snap.ref.update({
      fcmSent: true,
      fcmSentAt: admin.firestore.FieldValue.serverTimestamp(),
      fcmSuccessCount: successCount,
      fcmFailureCount: sendResults.length - successCount,
    });

    logger.info(
      `[FCM] ${docId}: delivered ${successCount}/${sendResults.length} to ${recipientId}`
    );

    return null;
  }
);

// ── Stale token cleanup ───────────────────────────────────────────────────

async function removeStaleTokens(uid: string, stale: string[]): Promise<void> {
  const staleSet = new Set(stale);
  const batch = db.batch();

  // Clean flat fcmTokens collection
  const flatRef = db.collection("fcmTokens").doc(uid);
  const flat = await flatRef.get();
  if (flat.exists) {
    const d = flat.data() ?? {};
    const updates: Record<string, admin.firestore.FieldValue> = {};
    if (staleSet.has(d["fcmToken"] as string)) {
      updates["fcmToken"] = admin.firestore.FieldValue.delete();
      updates["fcmTokenPlatform"] = admin.firestore.FieldValue.delete();
      updates["fcmTokenUpdatedAt"] = admin.firestore.FieldValue.delete();
    }
    if (staleSet.has(d["fcmWebToken"] as string)) {
      updates["fcmWebToken"] = admin.firestore.FieldValue.delete();
      updates["fcmWebTokenUpdatedAt"] = admin.firestore.FieldValue.delete();
    }
    if (Object.keys(updates).length > 0) batch.update(flatRef, updates);
  }

  // Clean role-collection document
  for (const col of ["patients", "doctors", "admins"]) {
    const ref = db.collection(col).doc(uid);
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data() ?? {};
      const updates: Record<string, admin.firestore.FieldValue> = {};
      if (staleSet.has(d["fcmToken"] as string)) {
        updates["fcmToken"] = admin.firestore.FieldValue.delete();
      }
      if (staleSet.has(d["fcmWebToken"] as string)) {
        updates["fcmWebToken"] = admin.firestore.FieldValue.delete();
      }
      if (Object.keys(updates).length > 0) batch.update(ref, updates);
      break;
    }
  }

  await batch.commit();
}

// ── Twilio HTTPS Cloud Functions ──────────────────────────────────────────────
//
// These replace the local `server/twilio-function.cjs` Express server for
// Android / iOS production builds.  The APK cannot reach localhost, so every
// Twilio API call must go to a public HTTPS endpoint.
//
// Endpoints exposed:
//   POST /twilioToken        – Voice + Video AccessToken (JWT)
//   POST /twilioVoiceWebhook – TwiML App Voice Request URL
//   POST /twilioSms          – SMS proxy
//
// Twilio credentials are stored as Firebase Functions runtime config:
//   firebase functions:secrets:set TWILIO_ACCOUNT_SID
//   firebase functions:secrets:set TWILIO_API_KEY
//   firebase functions:secrets:set TWILIO_API_SECRET
//   firebase functions:secrets:set TWILIO_AUTH_TOKEN
//   firebase functions:secrets:set TWILIO_PHONE_NUMBER
//   firebase functions:secrets:set TWILIO_TWIML_APP_SID
//
// IMPORTANT: After setting secrets run  firebase deploy --only functions
// ─────────────────────────────────────────────────────────────────────────────

import { onRequest } from "firebase-functions/v2/https";
import * as twilio from "twilio";
import * as corsLib from "cors";

// ── CORS helper (allow any origin so native WebView can call the function) ──
const corsHandler = (corsLib as any).default
  ? (corsLib as any).default({ origin: true })
  : (corsLib as unknown as (opts: object) => (req: any, res: any, next: () => void) => void)({ origin: true });

function withCors(
  req: any,
  res: any,
  handler: () => void | Promise<void>
): void {
  corsHandler(req, res, async () => {
    // Handle CORS pre-flight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    try {
      await handler();
    } catch (err: any) {
      logger.error("[Twilio fn] Unhandled error:", err);
      res.status(500).json({ success: false, error: err?.message ?? "Internal error" });
    }
  });
}

// ── Credential helpers ────────────────────────────────────────────────────────

function getTwilioCredentials() {
  // Firebase Functions v2 exposes secrets via process.env after you set them
  // with  firebase functions:secrets:set <NAME>
  const accountSid  = process.env.TWILIO_ACCOUNT_SID  ?? "";
  const apiKey      = process.env.TWILIO_API_KEY       ?? "";
  const apiSecret   = process.env.TWILIO_API_SECRET    ?? "";
  const authToken   = process.env.TWILIO_AUTH_TOKEN    ?? "";
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER  ?? "";
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID ?? "";
  return { accountSid, apiKey, apiSecret, authToken, phoneNumber, twimlAppSid };
}

function isPlaceholder(v: string): boolean {
  const l = v.toLowerCase();
  return !v || l.includes("xxxxxxxx") || l.startsWith("your_") || l === "changeme";
}

function escapeXml(v: string): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── POST /twilioToken  ────────────────────────────────────────────────────────
// Body: { identity, type: "voice"|"video", room? }
// Returns: { success, token, identity, room? }

export const twilioToken = onRequest(
  {
    secrets: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_API_KEY",
      "TWILIO_API_SECRET",
      "TWILIO_TWIML_APP_SID",
    ],
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 15,
  },
  (req, res) => {
    withCors(req, res, () => {
      const { accountSid, apiKey, apiSecret, twimlAppSid } = getTwilioCredentials();

      if (isPlaceholder(accountSid) || isPlaceholder(apiKey) || isPlaceholder(apiSecret)) {
        res.status(503).json({
          success: false,
          error: "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET as Firebase secrets.",
        });
        return;
      }
      if (!apiKey.startsWith("SK")) {
        res.status(503).json({ success: false, error: "TWILIO_API_KEY must start with SK" });
        return;
      }

      const body = req.body ?? {};
      const identity = String(body.identity ?? `user_${Date.now()}`).trim();
      const room     = String(body.room ?? body.roomName ?? "").trim();
      const type     = String(body.type ?? (room ? "video" : "voice")).trim();

      const { AccessToken } = twilio.jwt;
      const { VideoGrant, VoiceGrant } = AccessToken;

      const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity,
        ttl: 3600,
      });

      if (type === "video") {
        token.addGrant(new VideoGrant({ room: room || undefined }));
      } else {
        // Voice
        if (isPlaceholder(twimlAppSid)) {
          res.status(503).json({
            success: false,
            error: "TWILIO_TWIML_APP_SID not configured. Create a TwiML App and set its Voice URL to POST https://us-central1-homecare-1c228.cloudfunctions.net/twilioVoiceWebhook",
          });
          return;
        }
        token.addGrant(
          new VoiceGrant({ outgoingApplicationSid: twimlAppSid, incomingAllow: true })
        );
      }

      const jwt = token.toJwt();
      logger.info(`[twilioToken] Issued ${type} token for identity=${identity}`);
      res.json({ success: true, token: jwt, identity, room: room || null });
    });
  }
);

// ── POST /twilioVoiceWebhook  ─────────────────────────────────────────────────
// TwiML App Voice Request URL — must be set in Twilio Console.
// Returns TwiML that dials the call destination.

export const twilioVoiceWebhook = onRequest(
  {
    secrets: ["TWILIO_PHONE_NUMBER"],
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 15,
  },
  (req, res) => {
    withCors(req, res, () => {
      const { phoneNumber } = getTwilioCredentials();
      const toRaw = String((req.body ?? {}).To ?? (req.body ?? {}).to ?? "").trim();

      if (!toRaw) {
        res.type("text/xml").send(
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination was provided.</Say><Hangup/></Response>'
        );
        return;
      }

      let dialTarget: string;
      if (toRaw.startsWith("client:")) {
        dialTarget = `<Client>${escapeXml(toRaw.slice(7))}</Client>`;
      } else if (/^\+?\d{8,15}$/.test(toRaw.replace(/[\s()-]/g, ""))) {
        const num = toRaw.startsWith("+") ? toRaw : `+${toRaw.replace(/\D/g, "")}`;
        dialTarget = `<Number>${escapeXml(num)}</Number>`;
      } else {
        // In-app Voice identity (doctor_uid / patient_uid / admin_uid)
        dialTarget = `<Client>${escapeXml(toRaw)}</Client>`;
      }

      const callerIdAttr =
        phoneNumber && !isPlaceholder(phoneNumber)
          ? ` callerId="${escapeXml(phoneNumber)}"`
          : "";

      const twiml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response><Dial${callerIdAttr}>${dialTarget}</Dial></Response>`;

      logger.info(`[twilioVoiceWebhook] Dialling: ${toRaw}`);
      res.type("text/xml").send(twiml);
    });
  }
);

// ── POST /twilioSms  ──────────────────────────────────────────────────────────
// Body: { to, body }
// Returns: { success, sid, status }

export const twilioSms = onRequest(
  {
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_PHONE_NUMBER"],
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 20,
  },
  async (req, res) => {
    withCors(req, res, async () => {
      const { accountSid, authToken, apiKey, apiSecret, phoneNumber } = getTwilioCredentials();

      if (isPlaceholder(accountSid)) {
        res.status(503).json({ success: false, error: "TWILIO_ACCOUNT_SID not configured" });
        return;
      }

      // Prefer Auth Token for SMS; fall back to API Key
      let client: twilio.Twilio;
      if (authToken && !isPlaceholder(authToken)) {
        client = twilio.default(accountSid, authToken);
      } else if (apiKey && !isPlaceholder(apiKey) && apiSecret) {
        client = twilio.default(apiKey, apiSecret, { accountSid });
      } else {
        res.status(503).json({ success: false, error: "No valid Twilio credentials for SMS" });
        return;
      }

      const body = req.body ?? {};
      const to   = String(body.to ?? "").trim();
      const text = String(body.body ?? "").trim();

      if (!to || !text) {
        res.status(400).json({ success: false, error: "Missing 'to' or 'body'" });
        return;
      }
      if (!phoneNumber || isPlaceholder(phoneNumber)) {
        res.status(503).json({ success: false, error: "TWILIO_PHONE_NUMBER not configured" });
        return;
      }

      const message = await client.messages.create({ body: text, from: phoneNumber, to });
      logger.info(`[twilioSms] Sent to ${to}, sid=${message.sid}`);
      res.json({ success: true, sid: message.sid, status: message.status });
    });
  }
);
