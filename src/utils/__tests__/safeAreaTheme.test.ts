import { describe, expect, it } from "vitest";
import {
  barStyleForColor,
  colorLuminance,
  isAuthFunnelPath,
  resolveSafeAreaAppearance,
  solidPaintColor,
} from "../safeAreaTheme";

describe("isAuthFunnelPath", () => {
  it("recognises landing and sign-in routes", () => {
    expect(isAuthFunnelPath("/landingpage")).toBe(true);
    expect(isAuthFunnelPath("/Patient_signin")).toBe(true);
    expect(isAuthFunnelPath("/Doctor_signup")).toBe(true);
    expect(isAuthFunnelPath("/choose-language")).toBe(true);
  });

  it("rejects authenticated app routes", () => {
    expect(isAuthFunnelPath("/patient/dashboard")).toBe(false);
    expect(isAuthFunnelPath("/doc/dashboard")).toBe(false);
    expect(isAuthFunnelPath("/admin/settings")).toBe(false);
  });
});

describe("resolveSafeAreaAppearance", () => {
  it("uses brand colour + light icons on auth screens", () => {
    const appearance = resolveSafeAreaAppearance("/landingpage", false);
    expect(appearance.barStyle).toBe("DARK");
    expect(appearance.color).toMatch(/^#/);
    expect(appearance.bottomColor).toBe(appearance.color);
  });

  it("uses light chrome + dark icons on app screens in light mode", () => {
    const appearance = resolveSafeAreaAppearance("/patient/dashboard", false);
    expect(appearance.barStyle).toBe("LIGHT");
    expect(appearance.bottomColor).toBeTruthy();
  });

  it("uses dark chrome + light icons on app screens in dark mode", () => {
    const appearance = resolveSafeAreaAppearance("/patient/dashboard", true);
    expect(appearance.barStyle).toBe("DARK");
  });
});

describe("solidPaintColor", () => {
  it("returns fallback for transparent values", () => {
    expect(solidPaintColor("transparent", "#fff")).toBe("#fff");
    expect(solidPaintColor("rgba(0, 0, 0, 0)", "#abc")).toBe("#abc");
  });

  it("extracts the first stop from a gradient", () => {
    expect(
      solidPaintColor(
        "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)",
        "#000",
      ),
    ).toBe("#2563eb");
  });

  it("passes solid colours through", () => {
    expect(solidPaintColor("#f8fafc", "#000")).toBe("#f8fafc");
    expect(solidPaintColor("rgb(19, 21, 30)", "#000")).toBe("rgb(19, 21, 30)");
  });
});

describe("barStyleForColor", () => {
  it("picks dark icons on light backgrounds", () => {
    expect(barStyleForColor("#ffffff")).toBe("LIGHT");
    expect(barStyleForColor("#f8fafc")).toBe("LIGHT");
  });

  it("picks light icons on dark / brand backgrounds", () => {
    expect(barStyleForColor("#0f1117")).toBe("DARK");
    expect(barStyleForColor("#2563eb")).toBe("DARK");
  });
});

describe("colorLuminance", () => {
  it("ranks white brighter than black", () => {
    expect(colorLuminance("#ffffff")).toBeGreaterThan(
      colorLuminance("#000000")!,
    );
  });

  it("returns null for gradients", () => {
    expect(colorLuminance("linear-gradient(#fff, #000)")).toBeNull();
  });
});
