import { useCallback, useEffect, useRef, useState } from "react";
import type { Call } from "@twilio/voice-sdk";
import { twilioServiceAlternative } from "../Services/twilioService";
import { getVoiceClientIdentity } from "../../utils/consultationRoom";

/**
 * Keeps a Twilio Voice Device registered while the consult UI is open so the
 * user can receive in-app audio calls (client:patient_* / client:doctor_*).
 */
export function useTwilioVoicePresence(
  role: "patient" | "doctor" | "admin",
  userId: string | null | undefined,
  enabled: boolean = true,
) {
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registeredFor = useRef<string | null>(null);

  const clearIncoming = useCallback(() => setIncomingCall(null), []);

  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      if (!enabled || !userId) {
        setReady(false);
        return;
      }

      const identity = getVoiceClientIdentity(role, userId);
      if (registeredFor.current === identity) {
        return;
      }

      try {
        setError(null);
        const token = await twilioServiceAlternative.getCallToken(identity);
        if (cancelled) return;

        await twilioServiceAlternative.initialize(token);
        if (cancelled) return;

        twilioServiceAlternative.setupIncomingCallHandler((call) => {
          setIncomingCall(call);
          call.on("disconnect", () => setIncomingCall(null));
          call.on("cancel", () => setIncomingCall(null));
        });

        registeredFor.current = identity;
        setReady(true);
      } catch (err: any) {
        if (!cancelled) {
          console.warn("[useTwilioVoicePresence]", err?.message || err);
          setError(err?.message || "Voice registration failed");
          setReady(false);
          registeredFor.current = null;
        }
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [role, userId, enabled]);

  return { incomingCall, clearIncoming, ready, error };
}
