/**
 * healthAiService.test.ts
 *
 * Unit tests for the Health Education AI care-tips client. The network is
 * never touched: `fetch` is stubbed so each branch (live, cached, offline,
 * timeout, not configured, empty) can be exercised deterministically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_HEALTH_TOPICS,
  DEFAULT_AI_TOPIC,
  fetchHealthTips,
  readCachedTips,
} from "../../../components/Services/healthAiService";
import { localTipsForTopic } from "../data/articles";

const okPayload = {
  success: true,
  topic: "mpox",
  language: "en",
  generatedAt: "2026-01-01T10:00:00.000Z",
  tips: [
    {
      title: "Isolate a suspected case",
      detail: "Avoid skin-to-skin contact while the rash is present.",
    },
  ],
};

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

describe("fetchHealthTips", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns live tips and caches them on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(okPayload)));

    const result = await fetchHealthTips({ topic: "mpox", language: "en" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.topic).toBe("mpox");
      expect(result.live).toBe(true);
      expect(result.tips).toHaveLength(1);
      expect(result.tips[0].title).toBe("Isolate a suspected case");
    }

    const cached = readCachedTips("mpox", "en");
    expect(cached?.ok).toBe(true);
    if (cached && cached.ok) {
      expect(cached.tips[0].detail).toBe(
        "Avoid skin-to-skin contact while the rash is present.",
      );
      // Cached payloads are flagged as not live.
      expect(cached.live).toBe(false);
    }
  });

  it("reports AI_NOT_CONFIGURED when the server has no API key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ success: false, error: "AI_NOT_CONFIGURED" }, 503),
      ),
    );

    await expect(fetchHealthTips({ topic: "cholera" })).resolves.toEqual({
      ok: false,
      code: "AI_NOT_CONFIGURED",
    });
  });

  it("reports AI_UPSTREAM_ERROR for an unrecognised server failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ success: false }, 502)),
    );

    await expect(fetchHealthTips({ topic: "malaria" })).resolves.toEqual({
      ok: false,
      code: "AI_UPSTREAM_ERROR",
    });
  });

  it("reports AI_OFFLINE when the request cannot reach the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(fetchHealthTips({ topic: "malaria" })).resolves.toEqual({
      ok: false,
      code: "AI_OFFLINE",
    });
  });

  it("reports AI_TIMEOUT when the request is aborted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      ),
    );

    await expect(fetchHealthTips({ topic: "typhoid" })).resolves.toEqual({
      ok: false,
      code: "AI_TIMEOUT",
    });
  });

  it("reports AI_EMPTY_RESPONSE when the model returns no usable tips", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ...okPayload, tips: [] })),
    );

    await expect(fetchHealthTips({ topic: "mpox" })).resolves.toEqual({
      ok: false,
      code: "AI_EMPTY_RESPONSE",
    });
  });

  it("posts the topic, language and count to the proxy endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(okPayload));
    vi.stubGlobal("fetch", fetchMock);

    await fetchHealthTips({ topic: "cholera", language: "fr", count: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/api/ai/health-tips");
    expect(JSON.parse(String(init.body))).toEqual({
      topic: "cholera",
      language: "fr",
      count: 3,
    });
  });
});

describe("readCachedTips", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns null when nothing has been cached yet", () => {
    expect(readCachedTips("malaria", "fr")).toBeNull();
  });

  it("ignores a corrupted cache entry instead of throwing", () => {
    localStorage.setItem("hc_ai_tips_fr_malaria", "{ not json");
    expect(readCachedTips("malaria", "fr")).toBeNull();
  });
});

describe("AI_HEALTH_TOPICS", () => {
  it("covers the outbreak diseases promoted in health education", () => {
    const ids = AI_HEALTH_TOPICS.map((topic) => topic.id);
    expect(ids).toEqual(
      expect.arrayContaining(["mpox", "malaria", "cholera", "typhoid"]),
    );
  });

  it("defaults to a topic that exists in the list", () => {
    expect(AI_HEALTH_TOPICS.some((t) => t.id === DEFAULT_AI_TOPIC)).toBe(true);
  });

  it("only exposes topics the client service and data map both know", () => {
    AI_HEALTH_TOPICS.forEach((topic) => {
      // The offline fallback must always return guidance for a chip in the UI.
      expect(localTipsForTopic(topic.id).length).toBeGreaterThan(0);
    });
  });
});

describe("localTipsForTopic (offline fallback)", () => {
  it("returns mpox guidance from the bundled outbreak article", () => {
    const tips = localTipsForTopic("mpox");
    expect(tips.length).toBeGreaterThan(0);
    expect(tips[0].detail).toContain("Mpox: Know the Signs");
  });

  it("maps cholera and typhoid to the same outbreak category", () => {
    expect(localTipsForTopic("cholera")[0].detail).toContain(
      "Cholera: Treat Dehydration Fast",
    );
    expect(localTipsForTopic("typhoid")[0].detail).toContain("Typhoid Fever");
  });

  it("falls back to the general article for an unknown topic", () => {
    expect(localTipsForTopic("not-a-real-topic").length).toBeGreaterThan(0);
  });
});