// This module supports two modes:
// - Browser mode: when used in the frontend, it will POST to a backend endpoint
//   `/api/twilio/send` to keep secrets server-side.
// - Server mode: when executed in a Node environment (no `window`) it will
//   dynamically import the Twilio SDK and send SMS directly (useful for
//   serverless functions or Node servers).

// Helper to safely read environment variables in both Node and Vite/browser builds.
const readEnv = (key: string): string => {
  try {
    // Node (process.env)
    if (typeof process !== "undefined" && process.env) {
      const val = process.env[key];
      if (val) return String(val);
    }

    // Vite uses import.meta.env with VITE_ prefix
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const env = import.meta.env;
      // Try the key as-is first (for VITE_ prefixed keys)
      if (env[key]) return String(env[key]);

      // If key doesn't start with VITE_, try adding VITE_ prefix
      if (!key.startsWith("VITE_") && !key.startsWith("REACT_APP_")) {
        const viteKey = `VITE_${key}`;
        if (env[viteKey]) return String(env[viteKey]);
      }
    }
  } catch (e) {
    // ignore errors in environment reading
    console.debug(`Failed to read env var ${key}:`, e);
  }
  return "";
};

// Environment variables for server mode (Twilio credentials)
// Prefer Twilio API Key + Secret (safer for server-side usage). Fall back to
// AUTH token if API Key is not provided to maintain compatibility.
const accountSid = readEnv("SKe17a5afd5750b6dcba6f89f399720959");
const apiKey = readEnv("WQjINHk0xljknnNm2IPkWsEKyCr7Tadi");
const apiSecret = readEnv("TWILIO_API_SECRET");
const authToken = readEnv("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = readEnv("+17652663590");

let nodeClient: any = null;
let twilioInitialized = false;

const ensureNodeClient = async () => {
  if (nodeClient) return nodeClient;

  // Check if we have minimum required credentials
  const hasApiCredentials = apiKey && apiSecret && accountSid;
  const hasAuthTokenCredentials = accountSid && authToken;

  if (!hasApiCredentials && !hasAuthTokenCredentials) {
    console.warn(
      "No Twilio credentials available. Need either API Key + Secret + Account SID, or Account SID + Auth Token."
    );
    return null;
  }

  try {
    // Dynamic import so bundlers don't pull twilio into browser builds
    // Use await import() syntax
    const twilioModule = await import("twilio");

    // The imported module shape can vary between environments/bundlers
    let Twilio: any;

    if (typeof twilioModule === "function") {
      Twilio = twilioModule;
    } else if (typeof twilioModule.default === "function") {
      Twilio = twilioModule.default;
    } else if (typeof twilioModule.Twilio === "function") {
      Twilio = twilioModule.Twilio;
    } else {
      console.error(
        "Unable to find Twilio constructor in module:",
        twilioModule
      );
      return null;
    }

    // Create client with API Key + Secret if available (preferred method)
    if (hasApiCredentials) {
      console.debug("Creating Twilio client with API Key + Secret");
      nodeClient = new Twilio(apiKey, apiSecret, { accountSid });
    } else if (hasAuthTokenCredentials) {
      // Fall back to auth token for backwards compatibility
      console.debug("Creating Twilio client with Auth Token");
      nodeClient = new Twilio(accountSid, authToken);
    }

    twilioInitialized = true;
    return nodeClient;
  } catch (err) {
    console.error("Failed to initialize Twilio SDK:", err);
    return null;
  }
};

export interface SMSData {
  to: string;
  body: string;
  appointmentId?: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export const sendSMS = async (smsData: SMSData) => {
  // If running in browser, proxy to backend endpoint to avoid exposing creds
  if (typeof window !== "undefined" && window.document) {
    // Allow calling a real server-side Twilio endpoint
    const endpointUrl =
      readEnv("TWILIO_ENDPOINT_URL") ||
      readEnv("VITE_TWILIO_ENDPOINT_URL") ||
      "";

    // Use provided endpoint URL or default to local API route
    const targetUrl = "/api/twilio/send";

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsData),
      });

      if (!res.ok) {
        let errorText = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorText =
            errorData.error || errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            errorText = await res.text();
          } catch {
            // Ignore if can't read response
          }
        }
        console.error("Twilio proxy failed:", res.status, errorText);
        return {
          success: false,
          status: res.status,
          error: errorText,
        };
      }

      const data = await res.json();
      console.log("SMS delegating to backend succeeded", data);
      return { success: true, ...data };
    } catch (error: any) {
      console.error("Error sending SMS via backend proxy:", error);
      return {
        success: false,
        error: error?.message || "Network error",
      };
    }
  }

  // Server-side: use Twilio SDK directly
  try {
    const client = await ensureNodeClient();
    if (!client) {
      return {
        success: false,
        error: "Twilio client not available. Check your credentials.",
      };
    }

    if (!twilioPhoneNumber) {
      return {
        success: false,
        error: "Twilio phone number not configured",
      };
    }

    // Validate phone number format
    const validatedTo = validateAndFormatPhoneNumber(smsData.to);
    if (!validatedTo) {
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    const message = await client.messages.create({
      body: smsData.body,
      from: twilioPhoneNumber,
      to: validatedTo,
    });

    console.log("SMS sent successfully (server mode):", message.sid);
    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("Error sending SMS (server mode):", error);
    return {
      success: false,
      error: error?.message || "Unknown error sending SMS",
    };
  }
};

export const sendAppointmentStatusSMS = async (
  phoneNumber: string,
  status: "accepted" | "rejected" | "cancelled" | "rescheduled",
  appointmentData: {
    id: string;
    doctorName: string;
    date: string;
    time: string;
    reason?: string;
  }
) => {
  // Format phone number
  const formattedPhoneNumber = validateAndFormatPhoneNumber(phoneNumber);
  if (!formattedPhoneNumber) {
    return {
      success: false,
      error: "Invalid phone number format",
    };
  }

  let body = "";
  const formattedDate = formatDateForSMS(appointmentData.date);
  const formattedTime = formatTimeForSMS(appointmentData.time);

  switch (status) {
    case "accepted":
      body = `✅ Appointment Confirmed!\n\nDoctor: ${appointmentData.doctorName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nStatus: ACCEPTED\n\nYour appointment has been confirmed by the doctor. Please arrive 15 minutes early.`;
      break;

    case "rejected":
      body = `❌ Appointment Rejected\n\nDoctor: ${
        appointmentData.doctorName
      }\nDate: ${formattedDate}\nTime: ${formattedTime}\nStatus: REJECTED\n\nThe doctor has rejected your appointment request. Please book another appointment.${
        appointmentData.reason ? `\nReason: ${appointmentData.reason}` : ""
      }`;
      break;

    case "cancelled":
      body = `⚠️ Appointment Cancelled\n\nDoctor: ${
        appointmentData.doctorName
      }\nDate: ${formattedDate}\nTime: ${formattedTime}\nStatus: CANCELLED\n\nYour appointment has been cancelled.${
        appointmentData.reason ? `\nReason: ${appointmentData.reason}` : ""
      }`;
      break;

    case "rescheduled":
      body = `📅 Appointment Rescheduled\n\nDoctor: ${
        appointmentData.doctorName
      }\nNew Date: ${formattedDate}\nNew Time: ${formattedTime}\nStatus: RESCHEDULED\n\nYour appointment has been rescheduled.${
        appointmentData.reason ? `\nReason: ${appointmentData.reason}` : ""
      }`;
      break;
  }

  // Add appointment ID for reference
  body += `\n\nAppointment ID: ${appointmentData.id}`;

  return sendSMS({
    to: formattedPhoneNumber,
    body: body,
    appointmentId: appointmentData.id,
    doctorName: appointmentData.doctorName,
    appointmentDate: appointmentData.date,
    appointmentTime: appointmentData.time,
  });
};

// Helper functions for formatting
const formatDateForSMS = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

const formatTimeForSMS = (timeString: string): string => {
  try {
    // Handle various time formats
    const time = timeString.trim();

    // If it's already in AM/PM format, return as-is
    if (
      time.includes("AM") ||
      time.includes("PM") ||
      time.includes("am") ||
      time.includes("pm")
    ) {
      return time;
    }

    // Parse HH:MM format
    const [hoursStr, minutesStr] = time.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;

    if (isNaN(hours) || isNaN(minutes)) {
      return timeString;
    }

    const suffix = hours >= 12 ? "PM" : "AM";
    const formattedHour = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");

    return `${formattedHour}:${formattedMinutes} ${suffix}`;
  } catch (error) {
    return timeString;
  }
};

const validateAndFormatPhoneNumber = (phoneNumber: string): string | null => {
  if (!phoneNumber) return null;

  // Remove all non-digit characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // If it already starts with +, assume it's properly formatted
  if (cleaned.startsWith("+")) {
    // Validate E.164 format: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(cleaned) ? cleaned : null;
  }

  // If it starts with 237 (Cameroon), add + prefix
  if (cleaned.startsWith("237")) {
    const cameroonNumber = `+${cleaned}`;
    // Cameroon numbers: +237 followed by 8 digits
    const cameroonRegex = /^\+237[23678]\d{7,8}$/;
    return cameroonRegex.test(cameroonNumber) ? cameroonNumber : null;
  }

  // For other numbers without country code, you might want to handle differently
  // For now, we'll assume Cameroon numbers without 237 prefix
  if (/^[23678]\d{7,8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }

  return null;
};

export default {
  sendSMS,
  sendAppointmentStatusSMS,
  validateAndFormatPhoneNumber, // Export for testing or external use
};
