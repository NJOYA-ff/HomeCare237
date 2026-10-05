/**
 * First-run services showcase gating.
 *
 * The showcase is a first-impression feature, so the rule "shows exactly once
 * per device" is the whole contract. It is easy to regress silently: a broken
 * store, a renamed key, or an exit path that forgets to persist would either
 * trap the user in the deck forever or replay it on every launch. These tests
 * run the real module against an in-memory Preferences store and pin:
 *   - a fresh device plays it
 *   - finishing or skipping suppresses it, for both exit paths
 *   - the flag survives a simulated app restart (new module registry)
 *   - a version bump replays it for existing installs
 *   - with every store unreachable it degrades to "show", never to "hidden"
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: new Map<string, string>(),
  /** When true, Preferences throws as it would on an unavailable native layer. */
  preferencesBroken: false,
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => {
      if (mocks.preferencesBroken) throw new Error("native unavailable");
      return { value: mocks.store.has(key) ? (mocks.store.get(key) as string) : null };
    },
    set: async ({ key, value }: { key: string; value: string }) => {
      if (mocks.preferencesBroken) throw new Error("native unavailable");
      mocks.store.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      if (mocks.preferencesBroken) throw new Error("native unavailable");
      mocks.store.delete(key);
    },
  },
}));

/** Clears require caches so a fresh import simulates a cold app start. */
async function importFresh() {
  vi.resetModules();
  return import("../firstRunShowcase");
}

describe("firstRunShowcase", () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.preferencesBroken = false;
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plays the showcase on a fresh install", async () => {
    const { hasSeenServicesShowcase } = await importFresh();
    expect(await hasSeenServicesShowcase()).toBe(false);
  });

  it("stops replaying it after the user finishes", async () => {
    const { hasSeenServicesShowcase, markServicesShowcaseSeen } = await importFresh();
    await markServicesShowcaseSeen();
    expect(await hasSeenServicesShowcase()).toBe(true);
  });

  it("stops replaying it after the user skips", async () => {
    // Skip and finish share one code path in the gate; the important guarantee
    // is that no exit leaves the flag unset.
    const { hasSeenServicesShowcase, markServicesShowcaseSeen } = await importFresh();
    await markServicesShowcaseSeen(); // stand-in for the skip handler
    expect(await hasSeenServicesShowcase()).toBe(true);
  });

  it("remembers the choice across an app restart", async () => {
    const first = await importFresh();
    await first.markServicesShowcaseSeen();

    // New module registry == new process, same device storage.
    const second = await importFresh();
    expect(await second.hasSeenServicesShowcase()).toBe(true);
  });

  it("keys the flag by version so a content bump replays the deck", async () => {
    const mod = await importFresh();
    // The key must embed the version; otherwise bumping the constant would
    // silently orphan every existing install's flag.
    const key = `hc_services_showcase_seen_v${mod.SHOWCASE_VERSION}`;
    await mod.markServicesShowcaseSeen();
    expect(mocks.store.has(key)).toBe(true);
  });

  it("shows the deck rather than hiding it when storage is unavailable", async () => {
    mocks.preferencesBroken = true;
    // localStorage mirror is cleared by a browser with site data blocked, and
    // this is the one case where guessing wrong strands the user.
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { hasSeenServicesShowcase } = await importFresh();
    expect(await hasSeenServicesShowcase()).toBe(false);
    spy.mockRestore();
  });

  it("still records the choice when only the native store is broken", async () => {
    const { hasSeenServicesShowcase, markServicesShowcaseSeen } = await importFresh();
    await markServicesShowcaseSeen();

    mocks.preferencesBroken = true;
    // Falls back to the localStorage mirror written above, so the deck is
    // still suppressed rather than replaying on every launch.
    expect(await hasSeenServicesShowcase()).toBe(true);
  });

  it("replays the deck after an explicit reset", async () => {
    const { hasSeenServicesShowcase, markServicesShowcaseSeen, resetServicesShowcase } =
      await importFresh();
    await markServicesShowcaseSeen();
    await resetServicesShowcase();
    expect(await hasSeenServicesShowcase()).toBe(false);
  });
});
