/**
 * Simple Express-based Twilio endpoint example.
 *
 * Usage (development):
 * 1. Install dependencies: npm install express body-parser twilio
 * 2. Set environment variables:
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_API_KEY (optional - preferred)
 *    - TWILIO_API_SECRET (optional - preferred)
 *    - TWILIO_AUTH_TOKEN (fallback if API key/secret not provided)
 *    - TWILIO_PHONE_NUMBER (the 'from' phone number in E.164)
 * 3. Run: node twilio-function.js
 *
 * This file is intended as a minimal example for deploying to a Node host or
 * adapting into a serverless function (Azure Functions, Vercel Serverless,
 * AWS Lambda with API Gateway) — do NOT embed Twilio credentials in the
 * browser/client.
 */

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3400;

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const apiKey = process.env.TWILIO_API_KEY || "";
const apiSecret = process.env.TWILIO_API_SECRET || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "";

async function createClient() {
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

// Basic health check
app.get("/", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

// POST /api/twilio/send - generic send endpoint the client can call
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
        .json({ success: false, error: "TWILIO_PHONE_NUMBER not configured" });
    }

    const client = await createClient();

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

// Optional: endpoint for appointment status SMSs (convenience)
app.post("/api/twilio/send-appointment-status", async (req, res) => {
  try {
    const { to, status, appointmentData } = req.body || {};

    if (!to || !status || !appointmentData) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Missing to, status or appointmentData",
        });
    }

    const formattedBody = (() => {
      const date = appointmentData.date || "";
      const time = appointmentData.time || "";
      switch (status) {
        case "accepted":
          return `✅ Appointment Confirmed\nDate: ${date}\nTime: ${time}\nAppointment ID: ${
            appointmentData.id || ""
          }`;
        case "rejected":
          return `❌ Appointment Rejected\nDate: ${date}\nTime: ${time}\nAppointment ID: ${
            appointmentData.id || ""
          }`;
        case "completed":
          return `✅ Appointment Completed\nDate: ${date}\nTime: ${time}\nAppointment ID: ${
            appointmentData.id || ""
          }`;
        default:
          return appointmentData.message || `Appointment update: ${status}`;
      }
    })();

    const client = await createClient();
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

app.listen(PORT, () => {
  console.log(`Twilio function example listening on http://localhost:${PORT}`);
});
