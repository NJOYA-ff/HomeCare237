import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import Articles from "../Articles";
import { HEALTH_ARTICLES } from "../data/articles";

vi.mock("../../../context/SettingsContext", () => ({
  useSettings: () => ({
    language: "en",
    // Enough of the catalogue chrome to assert on; unknown keys echo back,
    // mirroring the provider's real `?? key` behaviour.
    t: (key: string) => key,
  }),
}));

vi.mock("../../../components/Services/healthAiService", () => ({
  AI_HEALTH_TOPICS: [{ id: "malaria", labelKey: "topicMalaria" }],
  DEFAULT_AI_TOPIC: "malaria",
  aiErrorTranslationKey: () => "aiTipsOffline",
  // Unreachable assistant: the page must still render the article catalogue.
  fetchHealthTips: vi.fn(async () => ({ ok: false, code: "AI_UPSTREAM_ERROR" })),
  readCachedTips: () => null,
}));

describe("Articles health education catalogue", () => {
  it("renders the bundled articles, not just the AI tips panel", async () => {
    render(
      <MemoryRouter initialEntries={["/patient/articles"]}>
        <Articles />
      </MemoryRouter>,
    );

    // Regression guard: the catalogue markup was once deleted while the page
    // kept compiling, so HEALTH_ARTICLES was never rendered at all.
    // Featured articles are deliberately listed twice — once in the
    // "Featured" rail and once in the full catalogue — so match on all.
    await waitFor(() => {
      expect(
        screen.getAllByText(HEALTH_ARTICLES[0].title).length,
      ).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(HEALTH_ARTICLES[1].title).length).toBeGreaterThan(0);
  });

  it("offers a category filter and a search field", async () => {
    render(
      <MemoryRouter initialEntries={["/patient/articles"]}>
        <Articles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/search health articles/i)).toBeInTheDocument();
    });
    // "Malaria" is both a category chip and a badge on several articles.
    expect(screen.getAllByText("Malaria").length).toBeGreaterThan(0);
  });

  it("opens the reader with the article body", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/patient/articles"]}>
        <Articles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(HEALTH_ARTICLES[0].title).length,
      ).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText(HEALTH_ARTICLES[0].title)[0]);

    // The reader shows the first paragraph of the article's content, which is
    // only ever rendered by the reader modal.
    await waitFor(() => {
      expect(
        screen.getAllByText(HEALTH_ARTICLES[0].content[0]).length,
      ).toBeGreaterThan(0);
    });
  });
});
