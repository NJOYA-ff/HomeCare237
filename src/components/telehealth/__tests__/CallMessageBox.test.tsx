import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import CallMessageBox from "../CallMessageBox";

/**
 * The failure box for the call screens.
 *
 * What matters here and is not visible in a screenshot: the two actions are
 * distinguishable, both solid, and the box never traps the user. The colour and
 * fill assertions read the props the component passes to IonButton rather than
 * the stylesheet, because the stylesheet is not loaded in jsdom — what is
 * asserted is the contract the component declares, which is where a regression
 * would actually be introduced.
 */

describe("CallMessageBox", () => {
  const baseProps = {
    isOpen: true,
    title: "Call not connected",
    message: "Something went wrong",
    onCancel: vi.fn(),
    onRetry: vi.fn(),
  };

  /* Ionic's ion-button is a custom element whose shadow DOM does not exist in
     jsdom, so it exposes no implicit `role="button"` and a role query cannot
     find the action. The label text lives in the light DOM, so resolve the
     action through it and assert on the host element. */
  const action = (label: string) => screen.getByText(label).closest("ion-button")!;

  it("renders nothing while closed", () => {
    render(<CallMessageBox {...baseProps} isOpen={false} />);
    expect(screen.queryByTestId("message-box")).toBeNull();
  });

  it("offers Cancel and Try again, neither outlined", () => {
    render(<CallMessageBox {...baseProps} />);

    const cancel = action("Cancel");
    const retry = action("Try again");

    expect(cancel).toHaveClass("mbx-btn");
    expect(retry).toHaveClass("mbx-btn");
    /* Both are solid fills. An outline on the danger action is what makes a
       destructive control read as the quiet one. */
    expect(cancel).toHaveAttribute("fill", "solid");
    expect(retry).toHaveAttribute("fill", "solid");
    expect(cancel).toHaveAttribute("color", "danger");
    expect(retry).toHaveAttribute("color", "primary");
    expect(cancel).not.toHaveClass("button-outline");
    expect(retry).not.toHaveClass("button-outline");
    /* Still block-expanded rather than intrinsic: `expand="block"` is what makes
       the inner `.button-native` fill its flex box, and `.mbx-btn`'s `flex: 1 1 0`
       is what makes the two share the row evenly. Neither is visible in jsdom, so
       this asserts the contract the stylesheet depends on. */
    expect(cancel).toHaveAttribute("expand", "block");
    expect(retry).toHaveAttribute("expand", "block");
  });

  it("puts the two actions in one row and gives Try again no icon", () => {
    render(<CallMessageBox {...baseProps} />);

    const actions = screen.getByTestId("message-box").querySelector(".mbx-actions")!;
    expect(actions).toBeInTheDocument();

    /* Order matters as much as layout: Cancel is announced first, and it sits to
       the left of Try again to match. */
    expect(Array.from(actions.children)).toEqual([action("Cancel"), action("Try again")]);

    /* The icon is gone. A glyph beside a label that already says "Try again" is
       noise, and it made the two buttons unequal in width for no gain. Asserted
       on the host, since the label text lives in the light DOM. */
    expect(action("Try again").querySelector("ion-icon")).toBeNull();
    expect(action("Cancel").querySelector("ion-icon")).toBeNull();
  });

  it("reports cancel and retry distinctly", () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    render(<CallMessageBox {...baseProps} onCancel={onCancel} onRetry={onRetry} />);

    fireEvent.click(action("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();

    fireEvent.click(action("Try again"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("dismisses on the backdrop but not on a click inside the panel", () => {
    const onCancel = vi.fn();
    render(<CallMessageBox {...baseProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId("message-box"));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("message-box-overlay"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Escape", () => {
    const onCancel = vi.fn();
    render(<CallMessageBox {...baseProps} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("announces itself as a decision, not a notice", () => {
    render(<CallMessageBox {...baseProps} />);
    const panel = screen.getByTestId("message-box");
    expect(panel).toHaveAttribute("role", "alertdialog");
    expect(panel).toHaveAttribute("aria-modal", "true");
  });

  it("marks a timeout distinctly from a raised error", () => {
    const { rerender } = render(<CallMessageBox {...baseProps} />);
    expect(screen.getByTestId("message-box").querySelector(".mbx-icon--warning")).toBeNull();

    rerender(<CallMessageBox {...baseProps} timedOut title="Call timed out" />);
    expect(
      screen.getByTestId("message-box").querySelector(".mbx-icon--warning")
    ).not.toBeNull();
  });
});