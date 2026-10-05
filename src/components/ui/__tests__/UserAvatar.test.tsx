import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import UserAvatar from "../UserAvatar";

describe("UserAvatar", () => {
  it("shows initials when the user has no picture", () => {
    render(<UserAvatar name="Jean Ndom" />);
    expect(screen.getByText("JN")).toBeTruthy();
  });

  it("shows initials when src is an empty string", () => {
    render(<UserAvatar name="Marie Claire" src="" />);
    expect(screen.getByText("MC")).toBeTruthy();
  });

  it("renders the picture when one is available", () => {
    const { container } = render(
      <UserAvatar name="Ada Lovelace" src="https://example.com/a.png" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
    expect(container.textContent).toBe("");
  });

  it("keeps a graceful fallback for an unknown name", () => {
    render(<UserAvatar name="" />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("exposes the name to assistive technology when showing initials", () => {
    render(<UserAvatar name="Cher" />);
    expect(screen.getByLabelText("Cher")).toBeTruthy();
  });

  it("falls back to initials when the image fails to load", async () => {
    const { container } = render(
      <UserAvatar name="Ada Lovelace" src="https://example.com/broken.png" />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    // Simulate the browser reporting a failed fetch.
    img.dispatchEvent(new Event("error"));
    await waitFor(() => {
      expect(container.textContent).toBe("AL");
    });
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the image again when a new picture is supplied", async () => {
    const { container, rerender } = render(
      <UserAvatar name="Ada Lovelace" src="https://example.com/broken.png" />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    img.dispatchEvent(new Event("error"));
    await waitFor(() => expect(container.textContent).toBe("AL"));

    rerender(<UserAvatar name="Ada Lovelace" src="https://example.com/new.png" />);
    await waitFor(() => {
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/new.png",
      );
    });
  });
});