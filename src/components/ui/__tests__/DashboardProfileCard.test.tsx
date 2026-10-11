import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardProfileCard from "../DashboardProfileCard";

describe("DashboardProfileCard", () => {
  it("falls back to the bundled default avatar when none is supplied", () => {
    const { container } = render(
      <DashboardProfileCard name="Jean Ndom" roleLabel="Patient" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/avatars/default-avatar.svg");
    expect(screen.getByText("Jean Ndom")).toBeTruthy();
    expect(screen.getByText("Patient")).toBeTruthy();
  });

  it("renders the provided picture and subtitle", () => {
    const { container } = render(
      <DashboardProfileCard
        name="Ada Lovelace"
        subtitle="ada@example.com"
        avatar="https://example.com/a.png"
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/a.png",
    );
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });

  it("omits the subtitle when none is provided", () => {
    const { container } = render(<DashboardProfileCard name="Cher" />);
    expect(container.querySelectorAll("p").length).toBe(0);
  });

  it("swaps to the default avatar when the picture fails to load", async () => {
    const { container } = render(
      <DashboardProfileCard
        name="Ada Lovelace"
        avatar="https://example.com/broken.png"
      />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    img.dispatchEvent(new Event("error"));
    await waitFor(() => {
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "/avatars/default-avatar.svg",
      );
    });
  });
});
