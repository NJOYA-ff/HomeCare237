import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoChatModal from "../VideoChatModal";
import type { CallMessageBoxProps } from "../CallMessageBox";

/**
 * Regression tests for the "Maximum update depth exceeded" crash.
 *
 * `disconnectFromRoom` used to depend on the `room` / `localTracks` state, so
 * its identity changed on every state update.  Because it was listed in the
 * dependency array of the unmount effect, that effect re-ran (running its
 * cleanup, which calls `setLocalTracks([])` with a brand-new array) on every
 * render, producing an endless update loop.
 */

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  createdTracks: [] as Array<{
    kind: "audio" | "video";
    attach: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    enable: ReturnType<typeof vi.fn>;
    disable: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("twilio-video", () => {
  class FakeLocalTrack {
    kind: "audio" | "video";
    isEnabled = true;
    attach = vi.fn();
    detach = vi.fn();
    stop = vi.fn();
    enable = vi.fn();
    disable = vi.fn();

    constructor(kind: "audio" | "video") {
      this.kind = kind;
      mocks.createdTracks.push(this as unknown as (typeof mocks.createdTracks)[number]);
    }
  }

  return {
    connect: (...args: unknown[]) => mocks.connect(...args),
    LocalVideoTrack: class extends FakeLocalTrack {
      constructor() {
        super("video");
      }
    },
    LocalAudioTrack: class extends FakeLocalTrack {
      constructor() {
        super("audio");
      }
    },
  };
});

vi.mock("../../../firebaseconfig", () => ({
  auth: { currentUser: null },
}));

vi.mock("@ionic/react", () => ({
  IonModal: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div data-testid="video-modal">{children}</div> : null,
  IonContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Call failures are surfaced through <CallMessageBox> — a dialog portalled to
 * <body>, deliberately not a second ion-modal. The stub keeps the same testids
 * and exposes both actions so these tests assert behaviour, not markup.
 */
vi.mock("../CallMessageBox", () => ({
  default: ({
    isOpen,
    title,
    message,
    timedOut,
    onRetry,
    onCancel,
  }: CallMessageBoxProps) =>
    isOpen ? (
      <div data-testid="call-notice" data-timed-out={String(!!timedOut)}>
        {title}: {message}
        <button type="button" onClick={onRetry}>
          Try again
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

type FakeStream = {
  getVideoTracks: () => Array<{ kind: string }>;
  getAudioTracks: () => Array<{ kind: string }>;
};

const getUserMedia = vi.fn(
  async (): Promise<FakeStream> => ({
    getVideoTracks: () => [{ kind: "video" }],
    getAudioTracks: () => [{ kind: "audio" }],
  })
);

const createFakeRoom = () => ({
  participants: { forEach: vi.fn() },
  on: vi.fn(),
  disconnect: vi.fn(),
});

beforeEach(() => {
  mocks.connect.mockReset();
  mocks.createdTracks.length = 0;
  getUserMedia.mockClear();

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  // jsdom has no Web Audio API; the ringtone helper needs a minimal stand-in.
  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      };
    }
    close() {
      return Promise.resolve();
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

describe("VideoChatModal", () => {
  it("settles without an infinite update loop when mounted closed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<VideoChatModal isOpen={false} onClose={vi.fn()} roomName="room-1" />);

    await act(async () => {
      await Promise.resolve();
    });

    const loopErrors = consoleError.mock.calls.filter((call) =>
      call.some(
        (arg) => typeof arg === "string" && arg.includes("Maximum update depth exceeded")
      )
    );
    expect(loopErrors).toHaveLength(0);

    consoleError.mockRestore();
  });

  it("connects once and keeps the room alive while the modal stays open", async () => {
    const fakeRoom = createFakeRoom();
    mocks.connect.mockResolvedValue(fakeRoom);

    render(
      <VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="valid-jwt" />
    );

    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));

    // The re-renders triggered by setLocalTracks/setRoom must not tear the call
    // down or stop the freshly acquired camera/microphone tracks.
    expect(fakeRoom.disconnect).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(mocks.createdTracks).toHaveLength(2);
    expect(mocks.createdTracks.every((track) => track.stop.mock.calls.length === 0)).toBe(true);
  });

  it("hangs up and releases the camera/mic on unmount", async () => {
    const fakeRoom = createFakeRoom();
    mocks.connect.mockResolvedValue(fakeRoom);

    const { unmount } = render(
      <VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="valid-jwt" />
    );
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));

    unmount();

    expect(fakeRoom.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.createdTracks).toHaveLength(2);
    mocks.createdTracks.forEach((track) => expect(track.stop).toHaveBeenCalled());
  });

  it("hangs up when isOpen flips back to false", async () => {
    const fakeRoom = createFakeRoom();
    mocks.connect.mockResolvedValue(fakeRoom);

    const { rerender } = render(
      <VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="valid-jwt" />
    );
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));

    rerender(
      <VideoChatModal isOpen={false} onClose={vi.fn()} roomName="room-1" token="valid-jwt" />
    );

    await waitFor(() => expect(fakeRoom.disconnect).toHaveBeenCalledTimes(1));
    expect(mocks.createdTracks.every((track) => track.stop.mock.calls.length > 0)).toBe(true);
  });

  it("surfaces the token error and stops the loading state instead of looping", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="mock-token" />
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("call-notice")).toHaveTextContent(
        /Video server token could not be obtained/i
      )
    );

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(screen.queryByText(/Connecting to secure video call/i)).toBeNull();

    // The box offers exactly two ways out: retry the dial, or cancel out of it.
    const sheet = within(screen.getByTestId("call-notice"));
    expect(sheet.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    // A raised API error is NOT a timeout, and must not be dressed as one.
    expect(screen.getByTestId("call-notice")).toHaveAttribute("data-timed-out", "false");

    fireEvent.click(sheet.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("call-notice")).toHaveTextContent(
        /Video server token could not be obtained/i
      )
    );

    consoleWarn.mockRestore();
    vi.unstubAllGlobals();
  });

  it("releases the camera/mic when the modal closes while connecting", async () => {
    let releaseStream: ((stream: FakeStream) => void) | undefined;
    getUserMedia.mockImplementationOnce(
      () =>
        new Promise<FakeStream>((resolve) => {
          releaseStream = resolve as (stream: FakeStream) => void;
        })
    );
    const fakeRoom = createFakeRoom();
    mocks.connect.mockResolvedValue(fakeRoom);

    const { rerender } = render(
      <VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="valid-jwt" />
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    rerender(
      <VideoChatModal isOpen={false} onClose={vi.fn()} roomName="room-1" token="valid-jwt" />
    );

    await act(async () => {
      releaseStream?.({
        getVideoTracks: () => [{ kind: "video" }],
        getAudioTracks: () => [{ kind: "audio" }],
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(mocks.createdTracks).toHaveLength(2));
    expect(mocks.connect).not.toHaveBeenCalled();
    mocks.createdTracks.forEach((track) => expect(track.stop).toHaveBeenCalled());
  });

  it("offers Cancel and Try again when the connect attempt never completes", async () => {
    /* Neither the token fetch nor connect() ever settles — the exact silence
       that leaves the user on a spinner forever if nothing times out. */
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();

    try {
      render(
        <VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="mock-token" />
      );

      // Nothing is shown yet: the box is for the failure, not the wait.
      expect(screen.queryByTestId("call-notice")).toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      const box = within(screen.getByTestId("call-notice"));
      expect(box.getByText(/did not connect in time/i)).toBeInTheDocument();
      // Marked as a timeout, so the box shows the clock rather than an error.
      expect(screen.getByTestId("call-notice")).toHaveAttribute("data-timed-out", "true");

      // Both ways out are offered, as required for a timeout.
      expect(box.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(box.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
      consoleWarn.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("dismisses the box on Cancel without closing the call screen", async () => {
    /* Neither the token fetch nor connect() ever settles, so the connect attempt
       can only end by timing out. */
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();

    try {
      const onClose = vi.fn();
      render(<VideoChatModal isOpen onClose={onClose} roomName="room-1" token="mock-token" />);

      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });
      expect(screen.getByTestId("call-notice")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      });

      /* Cancel is a dismiss, not an exit: the box goes, the call screen stays.
         Closing it would be a different action wearing the same label. */
      expect(screen.queryByTestId("call-notice")).toBeNull();
      expect(screen.getByTestId("video-modal")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      consoleWarn.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("does not time out a call that has already connected", async () => {
    const fakeRoom = createFakeRoom();
    mocks.connect.mockResolvedValue(fakeRoom);

    render(<VideoChatModal isOpen onClose={vi.fn()} roomName="room-1" token="valid-jwt" />);

    /* Fake timers are installed only AFTER the connect has settled. RTL's
       waitFor polls with setTimeout, and under fake timers its own timeout can
       never elapse, so a waitFor issued afterwards hangs for the whole run. */
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));

    vi.useFakeTimers();
    try {
      // Well past the deadline. The timer must have disarmed on connecting.
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      expect(screen.queryByTestId("call-notice")).toBeNull();
      expect(fakeRoom.disconnect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
