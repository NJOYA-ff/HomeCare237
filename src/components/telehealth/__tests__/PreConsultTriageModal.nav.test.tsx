/**
 * Step pager behaviour of the AI pre-consultation wizard.
 *
 * The pager used to be a pair of wide labelled buttons ("Back" / "Next Step"),
 * with step 1 carrying a filled full-width "Continue (Step 2/5)". Three things
 * were wrong with that, and each is pinned here:
 *
 *   - the labels are gone, so the controls are icon-only. Because a visible
 *     label can no longer double as the accessible name, the buttons have to
 *     carry an `aria-label` or a screen reader announces a bare icon.
 *   - step 1 had no way back at all. Its chevron now leaves the wizard, which
 *     is where "back" has to go from the first step.
 *   - the buttons are transparent, and stay transparent on hover — `fill="clear"`
 *     still tints via --background-hover, which would drop a solid brand block
 *     onto the step content the moment the pointer lands on them.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchHealthTips: vi.fn(async () => ({
    ok: true,
    tips: [{ detail: "Rest and hydrate." }],
  })),
}));

vi.mock("../../Services/healthAiService", () => ({
  fetchHealthTips: mocks.fetchHealthTips,
}));

// jsdom cannot present Ionic overlays, and Ionic's web components are not
// upgraded here, so an <ion-button> exposes no `button` role and cannot be found
// by role at all. Both are replaced with plain DOM: the modal renders its
// children inline, and the button becomes a native <button> that forwards the
// props the pager actually depends on — className, disabled, aria-label,
// onClick. Same approach as ResultSheet.test.tsx.
vi.mock("@ionic/react", async () => {
  const actual =
    await vi.importActual<typeof import("@ionic/react")>("@ionic/react");
  return {
    ...actual,
    IonModal: ({
      isOpen,
      children,
      className,
    }: {
      isOpen?: boolean;
      children?: React.ReactNode;
      className?: string;
    }) => (isOpen ? <div className={className}>{children}</div> : null),
    IonButton: ({
      children,
      className,
      onClick,
      disabled,
      "aria-label": ariaLabel,
      type,
    }: {
      children?: React.ReactNode;
      className?: string;
      onClick?: () => void;
      disabled?: boolean;
      "aria-label"?: string;
      type?: "button" | "submit";
    }) => (
      <button
        type={type ?? "button"}
        className={className}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    ),
  };
});

import PreConsultTriageModal from "../PreConsultTriageModal";

const STEP_1_HEADING = "What is the main reason for your consultation?";
const STEP_2_HEADING = "Any other signs?";
const STEP_3_HEADING = "Duration and Intensity";
const STEP_4_HEADING = "Warning Signs Check";

/** The forward pager button on a plain step. */
const forward = () => screen.getByRole("button", { name: "Next step" });
/** The back pager button. Named "Back" on steps 2+, longer on step 1. */
const back = () => screen.getByRole("button", { name: /^Back/ });

const renderModal = (onClose = vi.fn()) =>
  render(
    <PreConsultTriageModal
      isOpen
      onClose={onClose}
      onComplete={vi.fn()}
      patientName="Test Patient"
    />,
  );

describe("pre-consult triage step pager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no visible Next/Continue wording — the controls are icon-only", () => {
    renderModal();

    // The old copy is gone from the DOM entirely. These are the exact strings
    // the labelled buttons used to render.
    expect(screen.queryByText("Continue (Step 2/5)")).not.toBeInTheDocument();
    expect(screen.queryByText("Next Step")).not.toBeInTheDocument();
    expect(screen.queryByText("Back")).not.toBeInTheDocument();

    // ...and the icon-only replacement is still reachable by role and name.
    expect(
      screen.getByRole("button", { name: "Continue to step 2" }),
    ).toBeInTheDocument();
  });

  it("gives every icon-only pager button a non-blank accessible name", () => {
    renderModal();

    // Icon-only means the visible label cannot also be the accessible name, so
    // without aria-label these announce as unlabelled buttons.
    const pager = screen.getByRole("button", { name: "Continue to step 2" });
    const name = pager.getAttribute("aria-label");
    expect(name?.trim().length ?? 0).toBeGreaterThan(0);
    expect(back().getAttribute("aria-label")?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("lets step 1 navigate backward by leaving the wizard", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    expect(screen.getByText(STEP_1_HEADING)).toBeInTheDocument();

    // Step 1 has no previous step, so back must NOT be disabled here — that was
    // the whole bug: the first step was a one-way trap.
    const backFromStep1 = back();
    expect(backFromStep1).toBeEnabled();

    await user.click(backFromStep1);
    expect(onClose).toHaveBeenCalled();
  });

  it("walks forward through the steps and back again to the first one", async () => {
    const user = userEvent.setup();
    renderModal();

    // Step 1's forward control stays disabled until a complaint is supplied,
    // so pick a symptom chip first to satisfy the gate.
    await user.click(screen.getByRole("button", { name: "Fever / Chills" }));
    await user.click(screen.getByRole("button", { name: "Continue to step 2" }));

    expect(await screen.findByText(STEP_2_HEADING)).toBeInTheDocument();
    expect(screen.getByText("2 / 5")).toBeInTheDocument();

    await user.click(forward());
    expect(await screen.findByText(STEP_3_HEADING)).toBeInTheDocument();

    await user.click(forward());
    expect(await screen.findByText(STEP_4_HEADING)).toBeInTheDocument();

    // And all the way back down, which used to be impossible from step 1.
    await user.click(back());
    expect(await screen.findByText(STEP_3_HEADING)).toBeInTheDocument();
    await user.click(back());
    expect(await screen.findByText(STEP_2_HEADING)).toBeInTheDocument();
    await user.click(back());
    expect(await screen.findByText(STEP_1_HEADING)).toBeInTheDocument();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("keeps the forward control disabled on step 1 until a complaint is given", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: "Continue to step 2" }),
    ).toBeDisabled();
  });

  it("keeps the real actions labelled, and still steps back from them", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Fever / Chills" }));
    await user.click(screen.getByRole("button", { name: "Continue to step 2" }));
    await user.click(forward());
    await user.click(forward());

    // "Analyze with AI" is the step's action, not a pager step, so it keeps its
    // wording. Only the back control became an icon.
    expect(
      await screen.findByRole("button", { name: "Analyze with AI" }),
    ).toBeInTheDocument();

    await user.click(back());
    expect(await screen.findByText(STEP_3_HEADING)).toBeInTheDocument();
  });
});

/**
 * Guards the part jsdom cannot see: the declarations that make the pager
 * transparent. Nothing at runtime would fail if these silently regressed to
 * Ionic's default filled hover state, so they are asserted on the source.
 */
describe("triage pager stylesheet", () => {
  it("keeps the pager row a grid and the buttons transparent", () => {
    // Read from disk rather than importing with `?raw`: the query suffix is not
    // resolved by this Vitest/Vite version, and would hand back "" and make every
    // regex below pass vacuously. Resolved from cwd because import.meta.url is
    // rewritten by the transform and no longer points at the source tree.
    const css = readFileSync(
      resolve(process.cwd(), "src/components/telehealth/PreConsultTriageModal.css"),
      "utf8",
    );

    expect(css).toMatch(/\.triage-nav-buttons\s*\{[^}]*display:\s*grid/);
    expect(css).toMatch(
      /ion-button\.triage-nav-btn\s*\{[^}]*--background:\s*transparent/,
    );
    // The hover/press tints are the ones that would otherwise paint a solid
    // block over the step content.
    expect(css).toMatch(
      /ion-button\.triage-nav-btn\s*\{[^}]*--background-hover:\s*rgba/,
    );
    // 44px minimum target, per WCAG 2.5.5.
    expect(css).toMatch(
      /ion-button\.triage-nav-btn\s*\{[^}]*--min-width:\s*44px/,
    );
  });
});
