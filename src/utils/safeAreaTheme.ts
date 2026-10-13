/**
 * Keep status-bar / home-indicator / overscroll regions painted the same
 * colour as the active screen, and keep system-bar icon contrast in sync.
 *
 * With viewport-fit=cover the WebView draws under the system bars, so the
 * colour that "shows through" is whatever html/body/ion-app are painted.
 * Route heuristics give an immediate paint; DOM sampling then locks chrome
 * to the visible page's real header / tab / content colours.
 */

import { Capacitor } from "@capacitor/core";
import {
  SafeArea,
  SystemBarsStyle,
} from "@capacitor-community/safe-area";

export type SafeAreaBarStyle = "DARK" | "LIGHT";

export interface SafeAreaAppearance {
  /** Fill colour behind the status bar / top overscroll. */
  color: string;
  /** Fill colour behind the home indicator / bottom overscroll. */
  bottomColor: string;
  /**
   * System bar *content* style.
   * DARK = light icons (for dark / brand backgrounds).
   * LIGHT = dark icons (for light backgrounds).
   */
  barStyle: SafeAreaBarStyle;
}

const AUTH_FUNNEL_PATHS = [
  "/landingpage",
  "/choose-language",
  "/roleselect",
  "/roleselect2",
  "/Welcomepage",
  "/Patient_signin",
  "/Patient_signup",
  "/Patient_password_recovery",
  "/Doctor_signin",
  "/Doctor_signup",
  "/Doctor_password_recovery",
  "/Admin_signin",
  "/Admin_password_recovery",
];

const FALLBACK = {
  brand: "#2563eb",
  lightBg: "#f8fafc",
  lightChrome: "#ffffff",
  darkBg: "#0f1117",
  darkChrome: "#13151e",
} as const;

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function isAuthFunnelPath(pathname: string): boolean {
  return AUTH_FUNNEL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Relative luminance 0–1 for hex / rgb(a) colours. Gradients → null. */
export function colorLuminance(color: string): number | null {
  const value = color.trim().toLowerCase();
  if (!value || value.includes("gradient")) return null;

  let r = 0;
  let g = 0;
  let b = 0;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const rgb = value.match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/,
    );
    if (!rgb) return null;
    r = Number(rgb[1]);
    g = Number(rgb[2]);
    b = Number(rgb[3]);
  }

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function barStyleForColor(color: string): SafeAreaBarStyle {
  const lum = colorLuminance(color);
  // Unknown / mid tones: prefer light icons on brand-like dark blues.
  if (lum === null) return "DARK";
  return lum > 0.55 ? "LIGHT" : "DARK";
}

/**
 * Pull a usable solid paint colour from a CSS background value.
 * Gradients yield their first #hex / rgb() stop when present.
 */
export function solidPaintColor(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (
    !value ||
    value === "transparent" ||
    value === "rgba(0, 0, 0, 0)" ||
    value === "rgba(0,0,0,0)"
  ) {
    return fallback;
  }
  if (value.includes("gradient")) {
    const stop = value.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
    return stop ? stop[0] : fallback;
  }
  return value;
}

function readElementPaint(el: Element | null, fallback: string): string {
  if (!el || typeof window === "undefined") return fallback;
  const style = getComputedStyle(el);
  // Ionic components expose --background; fall back to painted background.
  const cssVar = style.getPropertyValue("--background").trim();
  const fromVar = solidPaintColor(cssVar, "");
  if (fromVar) return fromVar;
  return solidPaintColor(style.backgroundColor, fallback);
}

function getVisibleIonPage(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".ion-page"),
  ).filter((page) => {
    if (page.classList.contains("ion-page-hidden")) return false;
    if (page.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(page);
    if (style.display === "none" || style.visibility === "hidden") return false;
    // Skip pages that are fully off-screen during transitions when possible.
    const rect = page.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  // Prefer the top-most (last in DOM among visible) page — typically the active one.
  return pages.length > 0 ? pages[pages.length - 1] : null;
}

function getVisibleTabBar(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const bars = Array.from(
    document.querySelectorAll<HTMLElement>("ion-tab-bar"),
  );
  for (const bar of bars) {
    const style = getComputedStyle(bar);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (bar.offsetParent === null && style.position !== "fixed") continue;
    if (bar.classList.contains("tab-hidden")) continue;
    return bar;
  }
  return null;
}

/**
 * Resolve the chrome colour for the current route + theme (fast path).
 *
 * - Auth funnel: brand primary (matches the gradient backdrop)
 * - App dark: toolbar/tab chrome so header + bottom inset agree
 * - App light: toolbar/tab chrome (white) so status + nav match headers/tabs
 */
export function resolveSafeAreaAppearance(
  pathname: string,
  isDark: boolean,
): SafeAreaAppearance {
  if (isAuthFunnelPath(pathname)) {
    const color = readCssVar("--ion-color-primary", FALLBACK.brand);
    return {
      color,
      bottomColor: color,
      barStyle: "DARK",
    };
  }

  if (isDark) {
    const color =
      readCssVar("--ion-toolbar-background", FALLBACK.darkChrome) ||
      readCssVar("--ion-background-color", FALLBACK.darkBg);
    return {
      color,
      bottomColor: readCssVar("--ion-tab-bar-background", color),
      barStyle: "DARK",
    };
  }

  const color = readCssVar("--ion-toolbar-background", FALLBACK.lightChrome);
  return {
    color,
    bottomColor: readCssVar("--ion-tab-bar-background", color),
    barStyle: "LIGHT",
  };
}

/**
 * Sample the visible page so safe-area chrome matches what the user sees.
 * Falls back to the route heuristic when the DOM is not ready yet.
 */
export function samplePageSafeAreaAppearance(
  fallback: SafeAreaAppearance,
): SafeAreaAppearance {
  if (typeof document === "undefined") return fallback;

  const page = getVisibleIonPage();
  const tabBar = getVisibleTabBar();

  let top = fallback.color;
  let bottom = fallback.bottomColor;

  if (page) {
    const toolbar =
      page.querySelector("ion-header ion-toolbar") ||
      page.querySelector("ion-toolbar");
    const content = page.querySelector("ion-content");

    if (toolbar) {
      top = readElementPaint(toolbar, top);
    } else if (content) {
      top = readElementPaint(content, top);
    } else {
      top = readElementPaint(page, top);
    }

    if (tabBar) {
      bottom = readElementPaint(tabBar, bottom);
    } else if (content) {
      bottom = readElementPaint(content, top);
    } else {
      bottom = top;
    }
  } else if (tabBar) {
    bottom = readElementPaint(tabBar, bottom);
  }

  return {
    color: top,
    bottomColor: bottom,
    barStyle: barStyleForColor(top),
  };
}

function setThemeColorMeta(color: string): void {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => {
    meta.setAttribute("content", color);
  });
}

let lastApplied = "";

/** Test helper — clears the apply de-dupe cache. */
export function resetSafeAreaAppearanceCache(): void {
  lastApplied = "";
}

/**
 * Paint the document chrome and update native system-bar content style.
 * Safe to call often — identical appearances are no-ops.
 */
export async function applySafeAreaAppearance(
  appearance: SafeAreaAppearance,
): Promise<void> {
  const bottom = appearance.bottomColor || appearance.color;
  const key = `${appearance.color}|${bottom}|${appearance.barStyle}`;
  if (key === lastApplied) return;
  lastApplied = key;

  const root = document.documentElement;
  root.style.setProperty("--hc-safe-area-color", appearance.color);
  root.style.setProperty("--hc-safe-area-color-top", appearance.color);
  root.style.setProperty("--hc-safe-area-color-bottom", bottom);

  // Gradient so top status-bar overscroll and bottom home-indicator can differ
  // (e.g. white header + white tabs, or brand page with no tab bar).
  const paint =
    appearance.color === bottom
      ? appearance.color
      : `linear-gradient(${appearance.color} 0%, ${appearance.color} 50%, ${bottom} 50%, ${bottom} 100%)`;

  root.style.backgroundColor = appearance.color;
  root.style.backgroundImage =
    appearance.color === bottom ? "none" : paint;
  document.body.style.backgroundColor = appearance.color;
  document.body.style.backgroundImage =
    appearance.color === bottom ? "none" : paint;

  setThemeColorMeta(appearance.color);

  const apple = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  if (apple) {
    // black-translucent lets the page colour show through under the status bar
    apple.setAttribute("content", "black-translucent");
  }

  if (!Capacitor.isNativePlatform()) return;

  try {
    await SafeArea.setSystemBarsStyle({
      style:
        appearance.barStyle === "DARK"
          ? SystemBarsStyle.Dark
          : SystemBarsStyle.Light,
    });
  } catch (error) {
    // Plugin missing / unsupported platform — CSS paint still applies.
    console.warn("SafeArea.setSystemBarsStyle failed:", error);
  }
}
