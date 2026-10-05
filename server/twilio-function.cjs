/**
 * HomeCare237 Backend API Server
 * 
 * Provides endpoints for:
 *  - Twilio Voice & Video AccessToken generation (JWT)
 *  - Twilio SMS notifications & appointment status updates
 *  - Google Gemini AI Health Education proxy
 */

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

// Load .env from repository root
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch (e) {
  // Rely on process.env
}

const app = express();
app.use(bodyParser.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const PORT = process.env.PORT || 3400;

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const apiKey = process.env.TWILIO_API_KEY || "";
const apiSecret = process.env.TWILIO_API_SECRET || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "";
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID || "";

// Gemini AI credentials
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-1.5-flash"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Helper: Twilio REST Client
function createTwilioClient() {
  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID is required");
  }

  let Twilio;
  try {
    Twilio = require("twilio");
  } catch (err) {
    throw new Error("Please install the twilio package: npm install twilio");
  }

  if (apiKey && apiSecret) {
    return new Twilio(apiKey, apiSecret, { accountSid });
  }

  if (authToken) {
    return new Twilio(accountSid, authToken);
  }

  throw new Error(
    "No Twilio credentials found. Provide TWILIO_API_KEY+TWILIO_API_SECRET or TWILIO_ACCOUNT_SID+TWILIO_AUTH_TOKEN"
  );
}

// Helper: Twilio AccessToken Generator
function generateAccessToken({ identity, room, type }) {
  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID is required to generate access tokens");
  }

  // Token signing key: prefer apiKey+apiSecret; fallback to accountSid+authToken
  const signingKey = apiKey || accountSid;
  const signingSecret = apiSecret || authToken;

  if (!signingKey || !signingSecret) {
    throw new Error("Twilio API Key/Secret or Account SID/Auth Token required");
  }

  const twilio = require("twilio");
  const { AccessToken } = twilio.jwt;
  const { VideoGrant, VoiceGrant } = AccessToken;

  const validIdentity = (identity && String(identity).trim()) || `user_${Date.now()}`;
  const token = new AccessToken(accountSid, signingKey, signingSecret, {
    identity: validIdentity,
    ttl: 3600,
  });

  if (type === "video" || room) {
    const videoGrant = new VideoGrant({
      room: room || undefined,
    });
    token.addGrant(videoGrant);
  }

  if (type === "voice" || !room) {
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid || undefined,
      incomingAllow: true,
    });
    token.addGrant(voiceGrant);
  }

  return {
    jwt: token.toJwt(),
    identity: validIdentity,
  };
}

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "HomeCare237 API Server",
    env: process.env.NODE_ENV || "development",
    hasTwilio: Boolean(accountSid && (authToken || (apiKey && apiSecret))),
    hasGemini: Boolean(GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// ── Twilio Tokens ────────────────────────────────────────────────────────────

// Unified token endpoint
app.post("/api/twilio/token", (req, res) => {
  try {
    const { identity, room, roomName, type } = req.body || {};
    const targetRoom = room || roomName;
    const { jwt, identity: tokenIdentity } = generateAccessToken({
      identity,
      room: targetRoom,
      type: type || (targetRoom ? "video" : "voice"),
    });

    return res.json({
      success: true,
      token: jwt,
      identity: tokenIdentity,
      room: targetRoom || null,
    });
  } catch (err) {
    console.error("/api/twilio/token error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate token",
    });
  }
});

// Explicit video token endpoint
app.post("/api/twilio/video-token", (req, res) => {
  try {
    const { identity, roomName, room } = req.body || {};
    const targetRoom = roomName || room || `room_${Date.now()}`;
    const { jwt, identity: tokenIdentity } = generateAccessToken({
      identity,
      room: targetRoom,
      type: "video",
    });

    return res.json({
      success: true,
      token: jwt,
      identity: tokenIdentity,
      roomName: targetRoom,
    });
  } catch (err) {
    console.error("/api/twilio/video-token error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate video token",
    });
  }
});

// Explicit voice token endpoint
app.post("/api/twilio/voice-token", (req, res) => {
  try {
    const { identity } = req.body || {};
    const { jwt, identity: tokenIdentity } = generateAccessToken({
      identity,
      type: "voice",
    });

    return res.json({
      success: true,
      token: jwt,
      identity: tokenIdentity,
    });
  } catch (err) {
    console.error("/api/twilio/voice-token error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate voice token",
    });
  }
});

// ── Twilio SMS Endpoints ─────────────────────────────────────────────────────

app.post("/api/twilio/send", async (req, res) => {
  try {
    const { to, body, appointmentId } = req.body || {};

    if (!to || !body) {
      return res
        .status(400)
        .json({ success: false, error: "Missing 'to' or 'body'" });
    }

    if (!twilioPhone) {
      return res
        .status(500)
        .json({ success: false, error: "TWILIO_PHONE_NUMBER not configured in .env" });
    }

    const client = createTwilioClient();
    const message = await client.messages.create({
      body: body,
      from: twilioPhone,
      to: to,
    });

    return res.json({
      success: true,
      sid: message.sid,
      status: message.status,
      appointmentId,
    });
  } catch (err) {
    console.error("/api/twilio/send error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || String(err) });
  }
});

app.post("/api/twilio/send-appointment-status", async (req, res) => {
  try {
    const { to, status, appointmentData } = req.body || {};

    if (!to || !status || !appointmentData) {
      return res.status(400).json({
        success: false,
        error: "Missing 'to', 'status', or 'appointmentData'",
      });
    }

    const formattedBody = (() => {
      const date = appointmentData.date || "";
      const time = appointmentData.time || "";
      const id = appointmentData.id || "";
      switch (status) {
        case "accepted":
          return `HomeCare237: Appointment Confirmed\nDate: ${date}\nTime: ${time}\nID: ${id}`;
        case "rejected":
          return `HomeCare237: Appointment Cancelled/Rejected\nDate: ${date}\nTime: ${time}\nID: ${id}`;
        case "completed":
          return `HomeCare237: Appointment Completed\nDate: ${date}\nTime: ${time}\nID: ${id}`;
        default:
          return appointmentData.message || `HomeCare237: Appointment status updated to ${status}`;
      }
    })();

    const client = createTwilioClient();
    const message = await client.messages.create({
      body: formattedBody,
      from: twilioPhone,
      to,
    });

    return res.json({
      success: true,
      sid: message.sid,
      status: message.status,
    });
  } catch (err) {
    console.error("/api/twilio/send-appointment-status error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || String(err) });
  }
});

// ── Gemini AI Health Tips Proxy ──────────────────────────────────────────────

const AI_TOPICS = {
  general: { en: "general health protection", fr: "protection générale de la santé" },
  mpox: { en: "mpox (monkeypox)", fr: "mpox (variole du singe)" },
  malaria: { en: "malaria", fr: "paludisme" },
  cholera: { en: "cholera", fr: "choléra" },
  typhoid: { en: "typhoid fever", fr: "fièvre typhoïde" },
  dengue: { en: "dengue fever", fr: "dengue" },
  diarrhoea: { en: "diarrhoea and dehydration", fr: "diarrhée et déshydratation" },
  tuberculosis: { en: "tuberculosis", fr: "tuberculose" },
  hygiene: { en: "hand hygiene and sanitation", fr: "hygiène des mains et assainissement" },
  nutrition: { en: "healthy eating and nutrition", fr: "alimentation saine et nutrition" },
  maternal: { en: "maternal and child health", fr: "santé maternelle et infantile" },
  mental: { en: "mental wellbeing", fr: "bien-être mental" },
};

const AI_MAX_TIPS = 6;
const AI_RATE_LIMIT = 30;
const AI_RATE_WINDOW_MS = 5 * 60 * 1000;
const aiRateBuckets = new Map();

function aiRateLimited(ip) {
  const now = Date.now();
  const bucket = aiRateBuckets.get(ip);
  if (!bucket || now - bucket.start > AI_RATE_WINDOW_MS) {
    aiRateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > AI_RATE_LIMIT;
}

function aiSystemInstruction(language, topicLabel) {
  const replyLanguage = language === "en" ? "English" : "French";
  return [
    "You are the health-education assistant inside HomeCare237, a health app used in Cameroon.",
    `Produce short, practical, community-level health care tips about ${topicLabel}.`,
    "",
    "Rules you must always follow:",
    "- Give prevention, self-care and warning-sign advice only. This is health education, NOT a diagnosis.",
    "- NEVER name specific prescription medicines or dosages. Recommend seeking medical care.",
    "- Use simple language that a person with no medical training can follow.",
    "- Consider the Cameroonian context: endemic malaria, seasonal cholera and mpox outbreaks, free treated mosquito nets, oral rehydration salts (ORS) with zinc for diarrhoea, national vaccination campaigns, and referral to the nearest health facility.",
    "- If a warning sign is urgent (difficulty breathing, blood in stool or vomit, confusion, convulsions, inability to drink, high fever in a pregnant woman or child under 5), tell the reader to go to the nearest health facility immediately.",
    `- Write every tip entirely in ${replyLanguage}.`,
  ].join("\n");
}

const AI_TIPS_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      detail: { type: "STRING" },
    },
    required: ["title", "detail"],
  },
};

async function requestGemini(model, body) {
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

function extractCandidateText(payload) {
  const candidate = payload && payload.candidates && payload.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) return "";
  return candidate.content.parts
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function normaliseTips(rawText) {
  if (!rawText) return [];

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    const start = rawText.indexOf("[");
    const end = rawText.lastIndexOf("]");
    if (start === -1 || end <= start) return [];
    try {
      parsed = JSON.parse(rawText.slice(start, end + 1));
    } catch (err2) {
      return [];
    }
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed && parsed.tips)
    ? parsed.tips
    : [];

  return list
    .filter((tip) => tip && typeof tip === "object")
    .map((tip) => ({
      title: typeof tip.title === "string" ? tip.title.trim().slice(0, 120) : "",
      detail: typeof tip.detail === "string" ? tip.detail.trim().slice(0, 400) : "",
    }))
    .filter((tip) => tip.title && tip.detail)
    .slice(0, AI_MAX_TIPS);
}

app.post("/api/ai/health-tips", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: "AI_NOT_CONFIGURED",
      message: "GEMINI_API_KEY is not set. Add it to .env to enable live AI health tips.",
    });
  }

  const ip = req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
  if (aiRateLimited(ip)) {
    return res.status(429).json({ success: false, error: "AI_RATE_LIMITED" });
  }

  try {
    const { topic, language, count } = req.body || {};

    const topicKey =
      typeof topic === "string" && AI_TOPICS[topic] ? topic : "general";
    const lang = language === "en" ? "en" : "fr";
    const wanted = Math.min(Math.max(Number(count) || 4, 1), AI_MAX_TIPS);
    const topicLabel = AI_TOPICS[topicKey][lang];

    const prompt =
      lang === "fr"
        ? `Donne-moi ${wanted} conseils de santé pratiques et à jour sur ${topicLabel}.`
        : `Give me ${wanted} practical, up-to-date health care tips about ${topicLabel}.`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: aiSystemInstruction(lang, topicLabel) }],
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 900,
        topP: 0.9,
        responseMimeType: "application/json",
        responseSchema: AI_TIPS_SCHEMA,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    };

    let attempt = await requestGemini(GEMINI_MODEL, requestBody);

    if (!attempt.ok && (attempt.status === 404 || attempt.status === 400)) {
      for (const fallbackModel of GEMINI_FALLBACK_MODELS) {
        const retry = await requestGemini(fallbackModel, requestBody);
        if (retry.ok) {
          attempt = retry;
          break;
        }
      }
    }

    if (!attempt.ok) {
      console.error(
        "/api/ai/health-tips upstream error:",
        attempt.status,
        String(attempt.text).slice(0, 400)
      );
      return res.status(502).json({ success: false, error: "AI_UPSTREAM_ERROR" });
    }

    let payload;
    try {
      payload = JSON.parse(attempt.text);
    } catch (err) {
      return res.status(502).json({ success: false, error: "AI_UPSTREAM_ERROR" });
    }

    const tips = normaliseTips(extractCandidateText(payload));
    if (!tips.length) {
      return res.status(502).json({ success: false, error: "AI_EMPTY_RESPONSE" });
    }

    return res.json({
      success: true,
      topic: topicKey,
      language: lang,
      generatedAt: new Date().toISOString(),
      tips,
    });
  } catch (err) {
    console.error("/api/ai/health-tips error:", err);
    return res.status(500).json({ success: false, error: "AI_UPSTREAM_ERROR" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[HomeCare237 API] Listening on http://localhost:${PORT}`);
  console.log(
    accountSid
      ? "  ✓ Twilio services active (SMS & Voice/Video Tokens)"
      : "  ! Twilio disabled (set TWILIO_ACCOUNT_SID in .env)"
  );
  console.log(
    GEMINI_API_KEY
      ? `  ✓ Gemini AI Health Education active (model: ${GEMINI_MODEL})`
      : "  ! Gemini AI disabled (set GEMINI_API_KEY in .env)"
  );
});
