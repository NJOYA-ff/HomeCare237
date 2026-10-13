/**
 * Builds a stable Twilio Video room name shared by both parties in a consult.
 * Patient and doctor must use the same room name to meet in one call.
 */
export function getConsultationRoomName(
  partyAId: string | undefined | null,
  partyBId: string | undefined | null,
): string {
  const a = (partyAId || "").trim();
  const b = (partyBId || "").trim();
  if (a && b) {
    return `consult_${[a, b].sort().join("_")}`;
  }
  if (a || b) {
    return `consult_${a || b}`;
  }
  return `consult_${Date.now()}`;
}

/** Twilio Voice client identity for in-app audio (browser ↔ browser). */
export function getVoiceClientIdentity(
  role: "patient" | "doctor" | "admin",
  userId: string,
): string {
  return `${role}_${userId}`;
}
