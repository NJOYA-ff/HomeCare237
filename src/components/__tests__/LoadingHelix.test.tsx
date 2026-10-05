import React from "react";
import { render } from "@testing-library/react";
import LoadingHelix from "../LoadingHelix";

/**
 * The helix color is driven by the `color` prop, which is forwarded to the
 * underlying `l-helix` custom element (ldrs) as its `color` attribute.
 * Solid/colored buttons (e.g. .submit-button, .send-btn and the default
 * IonButton fill) must render the helix in white so it stays visible on the
 * colored background.
 */
describe("LoadingHelix", () => {
  it("defaults to the primary theme color", () => {
    const { container } = render(<LoadingHelix />);
    const helix = container.querySelector("l-helix");

    expect(helix).toBeInTheDocument();
    expect(helix?.getAttribute("color")).toBe("var(--ion-color-primary)");
  });

  it("forwards color=\"white\" to the helix element", () => {
    const { container } = render(<LoadingHelix color="white" />);
    const helix = container.querySelector("l-helix");

    expect(helix).toBeInTheDocument();
    expect(helix?.getAttribute("color")).toBe("white");
  });

  it("forwards size, speed and className", () => {
    const { container } = render(
      <LoadingHelix className="spinner" size={18} color="white" speed={2.5} />
    );
    const helix = container.querySelector("l-helix");
    const wrapper = container.querySelector(".spinner");

    expect(wrapper).toBeInTheDocument();
    expect(helix?.getAttribute("size")).toBe("18");
    expect(helix?.getAttribute("speed")).toBe("2.5");
    expect(helix?.getAttribute("color")).toBe("white");
  });
});
