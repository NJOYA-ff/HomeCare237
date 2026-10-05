import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useCallConnectTimeout from "../useCallConnectTimeout";

/**
 * The connect timeout guard.
 *
 * The subtle requirement is that changing `armed` mid-wait must DISARM rather
 * than restart. A hook that restarted its deadline on every re-render would let
 * a call that keeps re-rendering never reach its timeout — the exact silent
 * hang this exists to prevent. So the tests below pin both directions: the
 * timer stops when `armed` goes false, and it does not restart when a new
 * callback identity arrives.
 */
describe("useCallConnectTimeout", () => {
  it("fires once the armed stretch outlasts the deadline", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    renderHook(() => useCallConnectTimeout(true, onTimeout, 30_000));

    act(() => {
      vi.advanceTimersByTime(29_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("never fires when it is not armed", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    renderHook(() => useCallConnectTimeout(false, onTimeout, 30_000));

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("disarms when the call completes mid-wait, without restarting", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    const { rerender } = renderHook(
      ({ armed, handler }: { armed: boolean; handler: () => void }) =>
        useCallConnectTimeout(armed, handler, 30_000),
      { initialProps: { armed: true, handler: onTimeout } }
    );

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    // The room connected: `armed` flips false before the deadline.
    rerender({ armed: false, handler: vi.fn() });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("uses the latest callback without restarting the deadline", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ handler }: { handler: () => void }) => useCallConnectTimeout(true, handler, 30_000),
      { initialProps: { handler: first } }
    );

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    rerender({ handler: second });

    // The deadline is NOT measured from the re-render, so it lands here.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("stops timing once the component unmounts", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() => useCallConnectTimeout(true, onTimeout, 30_000));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});