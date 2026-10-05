import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AudioCallModal from "../AudioCallModal";

/**
 * The connect-timeout path of the audio call screen.
 *
 * The box itself is covered by CallMessageBox.test.tsx; what matters here is
 * what the screen does AROUND it. The bug this pins: on timeout the screen
 * showed the box but left the Twilio call up. The far end kept ringing for a
 * call the user had already been told had failed, and pressing "Try again"
 * opened a second connection on top of the first. Both the timeout and Cancel
 * must hang up.
 */

const mocks = vi.hoisted(() => ({
  disconnectCall: vi.fn(),
  makeCall: vi.fn(),
  getCallToken: vi.fn(),
  initialize: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock("../../../firebaseconfig", () => ({
  db: {},
  auth: { currentUser: { uid: "patient-1" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: () => ({ id: "callLogs" }),
  doc: () => ({ id: "call-log-1" }),
  getDoc: async () => ({
    exists: () => true,
    data: () => ({
      name: "Dr Mensah",
      contact: "+237699000000",
      specialization: "GP",
    }),
  }),
  setDoc: vi.fn(),
  updateDoc: (...args: unknown[]) => mocks.updateDoc(...args),
  serverTimestamp: () => "now",
  Timestamp: class {},
}));

vi.mock("../../../components/Services/twilioService", () => ({
  twilioServiceAlternative: {
    getCallToken: (...args: unknown[]) => mocks.getCallToken(...args),
    initialize: (...args: unknown[]) => mocks.initialize(...args),
    makeCall: (...args: unknown[]) => mocks.makeCall(...args),
    disconnectCall: (...args: unknown[]) => mocks.disconnectCall(...args),
  },
}));

vi.mock("@ionic/react", () => ({
  IonModal: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div data-testid="audio-modal">{children}</div> : null,
  IonContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  IonIcon: () => null,
  IonToast: () => null,
}));

vi.mock("../../../components/LoadingHelix", () => ({ default: () => null }));

/** The box is exercised in CallMessageBox.test.tsx; here it is just a probe. */
vi.mock("../../../components/telehealth/CallMessageBox", () => ({
  default: ({ isOpen, title, onRetry, onCancel }: Record<string, any>) =>
    isOpen ? (
      <div data-testid="call-notice">
        <span>{title}</span>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

/** A connection whose events never fire — the callee simply never answers. */
const createSilentConnection = () => ({ on: vi.fn() });

const renderModal = () =>
  render(<AudioCallModal isOpen onClose={vi.fn()} doctorId="doctor-1" />);

/** Dials, leaving the call in the "ringing, nobody home" state. */
const dialAndRing = async () => {
  await waitFor(() => expect(screen.getByLabelText("Start call")).not.toBeDisabled());
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Start call"));
  });
  await waitFor(() => expect(mocks.makeCall).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId("call-notice")).toBeNull();
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  /* jsdom has no AudioContext, so the ringtone would log a ReferenceError on
     every dial. The component guards that and carries on, but it drowns out
     real output — and under fake timers the ringtone interval actually fires
     mid-test, so the stub has to be shaped enough to be called. */
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 0;
      destination = {};
      createOscillator = () => ({
        type: "sine",
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      });
      createGain = () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      });
      close = vi.fn();
    },
  );
  mocks.disconnectCall.mockReset();
  mocks.makeCall.mockReset();
  mocks.updateDoc.mockReset();
  mocks.getCallToken.mockResolvedValue("voice-token");
  mocks.initialize.mockResolvedValue(undefined);
  mocks.makeCall.mockImplementation(async () => createSilentConnection());
});


describe("AudioCallModal connect timeout", () => {
  it("hangs up and offers Cancel / Try again when nobody answers", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderModal();
    await dialAndRing();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    // The user is told it timed out, and given both ways out.
    const box = screen.getByTestId("call-notice");
    expect(box).toHaveTextContent(/timed out/i);
    expect(box).toHaveTextContent(/try again/i);

    /* The actual regression: the call is NOT left ringing behind the box. */
    expect(mocks.disconnectCall).toHaveBeenCalled();
    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "missed" }),
    );

    consoleWarn.mockRestore();
  });

  it("does not time out a call that was answered", async () => {
    /* Installed AFTER the call is dialled: RTL's waitFor polls with setTimeout,
       which under fake timers can never elapse, so a waitFor issued afterwards
       would hang for the whole run. */
    renderModal();
    await dialAndRing();

    await act(async () => {
      /* Emulate the accept event the SDK would have raised. */
      const connection = await mocks.makeCall.mock.results[0]?.value;
      const handler = connection?.on.mock.calls.find(([event]) => event === "accept")?.[1];
      handler?.();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.queryByTestId("call-notice")).toBeNull();
  });

  it("hangs up again on Cancel, so a retry starts from a clean slate", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderModal();
    await dialAndRing();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    mocks.disconnectCall.mockClear();
    mocks.makeCall.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    // Box dismissed, and no orphan call left behind it.
    expect(screen.queryByTestId("call-notice")).toBeNull();
    expect(mocks.disconnectCall).toHaveBeenCalled();
    expect(mocks.makeCall).not.toHaveBeenCalled();

    // Dials again cleanly: exactly one connection, not one stacked on another.
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Start call"));
    });
    await waitFor(() => expect(mocks.makeCall).toHaveBeenCalledTimes(1));

    consoleWarn.mockRestore();
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
