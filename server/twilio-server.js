// const express = require("express");
// const app = express();
// const port = process.env.PORT || 3000;

// app.use(express.json());

// app.post("/api/twilio/send", async (req, res) => {
//   const payload = req.body;
//   console.log("/api/twilio/send received payload:", payload);

//   // Read Twilio credentials from environment (do not throw in server if missing)
//   const accountSid =
//     process.env.TWILIO_ACCOUNT_SID || "SKe17a5afd5750b6dcba6f89f399720959";
//   const authToken =
//     process.env.TWILIO_AUTH_TOKEN || "WQjINHk0xljknnNm2IPkWsEKyCr7Tadi";
//   const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "+17652663590";

//   // If credentials are not configured, return a clear mock response
//   if (!accountSid || !authToken || !twilioPhone) {
//     console.warn("Twilio credentials not provided. Running in mock mode.");
//     // In mock mode, just return a success response for frontend testing
//     return res.json({
//       success: true,
//       mock: true,
//       info: "No Twilio credentials configured",
//     });
//   }

//   try {
//     const twilio = require("twilio");
//     const client = twilio(accountSid, authToken);
//     const message = await client.messages.create({
//       body: payload.body,
//       from: twilioPhone,
//       to: payload.to,
//     });

//     console.log("Twilio sent message SID:", message.sid);
//     return res.json({ success: true, messageSid: message.sid });
//   } catch (err) {
//     console.error(
//       "Error sending SMS via Twilio:",
//       err && err.message ? err.message : err
//     );
//     // Return the error message to the client for easier debugging (non-sensitive)
//     return res.status(500).json({
//       success: false,
//       error: err && err.message ? err.message : String(err),
//     });
//   }
// });

// app.listen(port, () => {
//   console.log(`Twilio mock server listening at http://localhost:${port}`);
// });
