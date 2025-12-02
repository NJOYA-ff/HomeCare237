// import twilio from "twilio";

// // Initialize Twilio client with your credentials
// // You should store these in environment variables
// const accountSid = process.env.REACT_APP_TWILIO_ACCOUNT_SID || "";
// const authToken = process.env.REACT_APP_TWILIO_AUTH_TOKEN || "";
// const twilioPhoneNumber = process.env.REACT_APP_TWILIO_PHONE_NUMBER || "";

// const client = twilio(accountSid, authToken);

// export interface SMSData {
//   to: string;
//   body: string;
//   appointmentId?: string;
//   doctorName?: string;
//   appointmentDate?: string;
//   appointmentTime?: string;
// }

// export const sendSMS = async (smsData: SMSData) => {
//   try {
//     const message = await client.messages.create({
//       body: smsData.body,
//       from: twilioPhoneNumber,
//       to: smsData.to,
//     });

//     console.log("SMS sent successfully:", message.sid);
//     return { success: true, messageSid: message.sid };
//   } catch (error) {
//     console.error("Error sending SMS:", error);
//     return { success: false, error };
//   }
// };

// export const sendAppointmentStatusSMS = async (
//   phoneNumber: string,
//   status: "accepted" | "rejected" | "cancelled" | "rescheduled",
//   appointmentData: {
//     id: string;
//     doctorName: string;
//     date: string;
//     time: string;
//     reason?: string;
//   }
// ) => {
//   // Ensure phone number has +237 prefix for Cameroon
//   let formattedPhoneNumber = phoneNumber;
//   if (!phoneNumber.startsWith("+237") && !phoneNumber.startsWith("+")) {
//     // Assuming it's a local number without country code
//     formattedPhoneNumber = `+237${phoneNumber.replace(/\D/g, "")}`;
//   } else if (phoneNumber.startsWith("237")) {
//     formattedPhoneNumber = `+${phoneNumber}`;
//   }

//   let body = "";

//   switch (status) {
//     case "accepted":
//       body = `✅ Appointment Confirmed!\n\nDoctor: ${
//         appointmentData.doctorName
//       }\nDate: ${formatDateForSMS(
//         appointmentData.date
//       )}\nTime: ${formatTimeForSMS(
//         appointmentData.time
//       )}\nStatus: ACCEPTED\n\nYour appointment has been confirmed by the doctor. Please arrive 15 minutes early.`;
//       break;

//     case "rejected":
//       body = `❌ Appointment Rejected\n\nDoctor: ${
//         appointmentData.doctorName
//       }\nDate: ${formatDateForSMS(
//         appointmentData.date
//       )}\nTime: ${formatTimeForSMS(
//         appointmentData.time
//       )}\nStatus: REJECTED\n\nThe doctor has rejected your appointment request. Please book another appointment.`;
//       break;

//     case "cancelled":
//       body = `⚠️ Appointment Cancelled\n\nDoctor: ${
//         appointmentData.doctorName
//       }\nDate: ${formatDateForSMS(
//         appointmentData.date
//       )}\nTime: ${formatTimeForSMS(
//         appointmentData.time
//       )}\nStatus: CANCELLED\n\nYour appointment has been cancelled.`;
//       break;

//     case "rescheduled":
//       body = `📅 Appointment Rescheduled\n\nDoctor: ${
//         appointmentData.doctorName
//       }\nNew Date: ${formatDateForSMS(
//         appointmentData.date
//       )}\nNew Time: ${formatTimeForSMS(
//         appointmentData.time
//       )}\nStatus: RESCHEDULED\n\nYour appointment has been rescheduled.`;
//       break;
//   }

//   // Add appointment ID for reference
//   body += `\n\nAppointment ID: ${appointmentData.id}`;

//   return sendSMS({
//     to: formattedPhoneNumber,
//     body: body,
//     appointmentId: appointmentData.id,
//     doctorName: appointmentData.doctorName,
//     appointmentDate: appointmentData.date,
//     appointmentTime: appointmentData.time,
//   });
// };

// // Helper functions for formatting
// const formatDateForSMS = (dateString: string): string => {
//   try {
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-GB", {
//       weekday: "short",
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     });
//   } catch (error) {
//     return dateString;
//   }
// };

// const formatTimeForSMS = (timeString: string): string => {
//   try {
//     const [hours, minutes] = timeString.split(":");
//     const hour = parseInt(hours);
//     const suffix = hour >= 12 ? "PM" : "AM";
//     const formattedHour = hour % 12 || 12;
//     return `${formattedHour}:${minutes} ${suffix}`;
//   } catch (error) {
//     return timeString;
//   }
// };

// export default {
//   sendSMS,
//   sendAppointmentStatusSMS,
// };
