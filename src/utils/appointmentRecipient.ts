/**
 * "Booked for" recipient helpers.
 *
 * When a patient books on behalf of a relative, `Book_Appointment` stores the
 * recipient under the appointment's `patientDetails` map; appointments booked
 * for the account holder itself carry no such field. The doctor, admin and
 * patient appointment lists all need to tell those two cases apart and show the
 * same summary the booking form shows, so the detection and normalisation live
 * here instead of being re-implemented per screen.
 */

export interface BookingRecipient {
  /** Recipient's full name. Empty only on legacy rows written before the booking form captured it. */
  name: string;
  /** Age in years, kept as text because the form stores what the user typed. */
  age: string;
  gender: string;
  relationship: string;
  bloodType: string;
}

/** Coerce a Firestore value to trimmed display text without inventing content. */
const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value.trim() : String(value).trim();
};

/**
 * Read the raw `patientDetails` map off an appointment document.
 *
 * Returns `null` when the appointment was not booked for a family member, which
 * makes the result usable directly as the "is this a family booking?" signal.
 * A recipient whose fields were all lost (legacy rows the old booking flow wrote
 * blank) still returns an object — the booking was made for a relative, we just
 * have no details left to show, and callers fall back to `patientName`.
 */
export function getBookingRecipient(
  patientDetails: unknown,
): BookingRecipient | null {
  if (
    patientDetails === null ||
    patientDetails === undefined ||
    typeof patientDetails !== "object" ||
    Array.isArray(patientDetails)
  ) {
    return null;
  }

  const raw = patientDetails as Record<string, unknown>;
  return {
    name: toText(raw.name),
    age: toText(raw.age),
    gender: toText(raw.gender),
    relationship: toText(raw.relationship),
    bloodType: toText(raw.bloodType),
  };
}

/**
 * Build the one-line summary shown beside the recipient's name, matching the
 * booking form: "child · 8 yrs · female · O+". Missing fields are dropped
 * rather than left as stray separators.
 */
export function formatRecipientMeta(
  recipient: BookingRecipient | null,
): string {
  if (!recipient) return "";
  return [
    recipient.relationship,
    recipient.age ? `${recipient.age} yrs` : "",
    recipient.gender,
    recipient.bloodType,
  ]
    .filter((part) => part !== "")
    .join(" · ");
}

/**
 * Resolve the name to print for an appointment. The recipient's own name wins
 * when we have it; otherwise the caller's fallback (normally `patientName`) is
 * used so legacy family bookings are not rendered nameless.
 */
export function resolveRecipientName(
  recipient: BookingRecipient | null,
  fallback: string,
): string {
  return recipient?.name || fallback;
}
