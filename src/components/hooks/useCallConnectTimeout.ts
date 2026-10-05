import { useCallback, useEffect, useRef } from "react";

/**
 * How long a call may sit unconnected before we call it. Long enough to cover a
 * slow token fetch or a permission grant on a weak connection, short enough
 * that a user has not already given up and closed the screen themselves.
 */
export const CALL_CONNECT_TIMEOUT_MS = 30_000;

/**
 * Fires `onTimeout` if `armed` stays true for longer than `timeoutMs`.
 *
 * WHY A TIMEOUT IS NEEDED AT ALL. Neither Twilio nor the token endpoint has a
 * bounded failure mode: `getUserMedia` on a device with no camera can sit on
 * its permission prompt indefinitely, `connect()` over a network that has gone
 * quiet will not reject on its own, and a callee who never picks up produces no
 * event at all. Left alone the call screen sits on its spinner forever and the
 * user has no way out but to force-quit the app. This turns that silence into
 * an actionable state — the message box, with Cancel and Try again.
 *
 * THE CONTRACT, WHICH IS THE SUBTLE PART. The timer only fires while `armed` is
 * true, and callers must disarm it the moment the call succeeds — not when the
 * effect re-runs. Two failure modes that this avoids:
 *
 *   - Firing on a call that already connected, because the effect re-ran with a
 *     new `armed` value while the room was live.
 *   - Never firing, because the effect was cleaned up (modal closed, unmounted)
 *     during the wait, which is correct: there is nothing left to time out.
 *
 * `armed` and the callback are both read through refs so that changing either
 * neither restarts the timer nor is needed as a dependency. Restarting on every
 * callback identity is what produces the first failure mode above: a caller
 * passing an inline arrow would otherwise reset the deadline on every render,
 * so a component that re-renders during a connect attempt would never reach its
 * timeout — precisely the silent hang this exists to prevent.
 *
 * @param armed Whether a connection attempt is genuinely in flight.
 * @param onTimeout Called once per armed stretch, if it has not completed.
 * @param timeoutMs Deadline to allow.
 */
export const useCallConnectTimeout = (
  armed: boolean,
  onTimeout: () => void,
  timeoutMs: number = CALL_CONNECT_TIMEOUT_MS,
): void => {
  const armedRef = useRef(armed);
  const onTimeoutRef = useRef(onTimeout);
  armedRef.current = armed;
  onTimeoutRef.current = onTimeout;

  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (deadlineRef.current !== null) {
      clearTimeout(deadlineRef.current);
      deadlineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!armed) {
      clear();
      return;
    }

    deadlineRef.current = setTimeout(() => {
      deadlineRef.current = null;
      /* Re-check through the ref: the attempt may have completed in the same
         tick the timer was due, and reporting a timeout then would dismiss a
         call that had just connected. */
      if (armedRef.current) onTimeoutRef.current();
    }, timeoutMs);

    return clear;
  }, [armed, timeoutMs, clear]);
};

export default useCallConnectTimeout;