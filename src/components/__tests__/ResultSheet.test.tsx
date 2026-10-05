/**
 * ResultSheet — the bottom-sheet result feedback shown after a patient books
 * (or updates) an appointment.
 *
 * Contract pinned here:
 *   - nothing renders while `isOpen` is false
 *   - "OK" is the default action on success, "Retry" the default on failure
 *   - status drives the colour variant and the aria-live politeness
 *   - a caller-supplied label wins, and both handlers fire exactly once
 *   - backdrop dismissal is forwarded to `onDismiss`
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// jsdom cannot present Ionic overlays, so the modal renders its children
// inline and exposes the dismissal callback as a button.
vi.mock("@ionic/react", async () => {
  const actual =
    await vi.importActual<typeof import("@ionic/react")>("@ionic/react");
  return {
    ...actual,
    IonModal: ({
      isOpen,
      children,
      className,
      onDidDismiss,
    }: {
      isOpen?: boolean;
      children?: React.ReactNode;
      className?: string;
      onDidDismiss?: () => void;
    }) =>
      isOpen ? (
        <div className={className}>
          <button data-testid="sheet-dismiss" onClick={onDidDismiss} />
          {children}
        </div>
      ) : null,
  };
});

import ResultSheet from "../ui/ResultSheet";

const primaryOf = (container: HTMLElement) =>
  container.querySelector(".hc-result-sheet__primary") as HTMLElement;

describe("ResultSheet", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <ResultSheet isOpen={false} status="success" title="Appointment Booked" />,
    );

    expect(container.querySelector(".hc-result-sheet")).not.toBeInTheDocument();
  });

  it("acknowledges a success with OK and a polite live region", () => {
    const { container } = render(
      <ResultSheet
        isOpen
        status="success"
        title="Appointment Booked"
        message="Your appointment request has been sent and is pending confirmation."
      />,
    );

    const sheet = container.querySelector(".hc-result-sheet");
    expect(sheet).toHaveClass("hc-result-sheet--success");
    expect(sheet).toHaveAttribute("aria-live", "polite");
    expect(container.querySelector(".hc-result-sheet__icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("Appointment Booked")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your appointment request has been sent and is pending confirmation.",
      ),
    ).toBeInTheDocument();
    expect(primaryOf(container)).toHaveTextContent("OK");
  });

  it("offers Retry by default when the request failed", () => {
    const { container } = render(
      <ResultSheet
        isOpen
        status="error"
        title="Booking failed"
        message="We could not reach the server."
      />,
    );

    expect(container.querySelector(".hc-result-sheet")).toHaveClass(
      "hc-result-sheet--error",
    );
    expect(container.querySelector(".hc-result-sheet")).toHaveAttribute(
      "aria-live",
      "assertive",
    );
    expect(primaryOf(container)).toHaveTextContent("Retry");
  });

  it("lets the caller override the primary label", () => {
    const { container } = render(
      <ResultSheet
        isOpen
        status="error"
        title="Missing details"
        actionLabel="OK"
      />,
    );

    expect(primaryOf(container)).toHaveTextContent("OK");
  });

  it("invokes onAction once when the primary button is pressed", () => {
    const onAction = vi.fn();
    const { container } = render(
      <ResultSheet
        isOpen
        status="success"
        title="Appointment Booked"
        onAction={onAction}
      />,
    );

    fireEvent.click(primaryOf(container));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows the secondary action only when label and handler are both given", () => {
    const onSecondary = vi.fn();
    const { container, rerender } = render(
      <ResultSheet isOpen status="error" title="Booking failed" />,
    );

    expect(container.querySelector(".hc-result-sheet__secondary")).toBeNull();

    rerender(
      <ResultSheet
        isOpen
        status="error"
        title="Booking failed"
        secondaryLabel="Close"
        onSecondary={onSecondary}
      />,
    );

    const secondary = container.querySelector(
      ".hc-result-sheet__secondary",
    ) as HTMLElement;
    expect(secondary).toHaveTextContent("Close");

    fireEvent.click(secondary);

    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("forwards backdrop dismissal to onDismiss", () => {
    const onDismiss = vi.fn();
    render(
      <ResultSheet
        isOpen
        status="success"
        title="Appointment Booked"
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTestId("sheet-dismiss"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
