import React, { useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";

// ---------------------------------------------------------------------------
// Global window type augmentation
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    voiceflow?: any;
    __voiceflow__loaded?: boolean;
    __voiceflow__loading?: boolean;
    __voiceflow__initialized?: boolean;
  }
}

// ---------------------------------------------------------------------------
// Theme token sets
// ---------------------------------------------------------------------------
const LIGHT = {
  /** Brand accent – primary action colour */
  primary: "#3b7dd8",
  primaryShade: "#346ebe",
  /** Chat window surface */
  windowBg: "#ffffff",
  /** Bot message bubble background */
  botBubbleBg: "#f0f4fb",
  botBubbleText: "#1a1a2e",
  /** User message bubble */
  userBubbleBg: "#3b7dd8",
  userBubbleText: "#ffffff",
  /** Input area */
  inputBg: "#f4f5f8",
  inputBorder: "#dde3ee",
  inputText: "#1a1a2e",
  /** Footer / input row */
  footerBg: "#ffffff",
  /** System response buttons */
  systemBtnBg: "transparent",
  systemBtnBorder: "#3b7dd8",
  systemBtnText: "#3b7dd8",
  /** Timestamp / muted text */
  mutedText: "#7a8599",
  /** Window border */
  windowBorder: "rgba(59,125,216,0.15)",
  /** Shadow */
  shadow: "0 8px 32px rgba(59,125,216,0.22)",
};

const DARK = {
  primary: "#5b9bf2",
  primaryShade: "#4b8be2",
  windowBg: "#1a1d27",
  botBubbleBg: "#252839",
  botBubbleText: "#e8eaf0",
  userBubbleBg: "#3b7dd8",
  userBubbleText: "#ffffff",
  inputBg: "#13151e",
  inputBorder: "#2b2e42",
  inputText: "#e8eaf0",
  footerBg: "#1a1d27",
  systemBtnBg: "transparent",
  systemBtnBorder: "#5b9bf2",
  systemBtnText: "#5b9bf2",
  mutedText: "#8c90c9",
  windowBorder: "rgba(91,155,242,0.18)",
  shadow: "0 8px 32px rgba(0,0,0,0.55)",
};

// ---------------------------------------------------------------------------
// CSS builder
// ---------------------------------------------------------------------------
function buildWidgetCss(tk: typeof LIGHT): string {
  return `
    /* ── Hide default Voiceflow launcher ─────────────────────────────── */
    .vfrc-launcher,
    .vfrc-launcher-button ._1u16jol1,
    .vfrc-launcher--chat,
    .vfrc-widget .vfrc-launcher,
    button[title="Open chat agent"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* ── Chat window: position + safe area ───────────────────────────── */
    /*
     * Stack from bottom:
     *   env(safe-area-inset-bottom)   home indicator / gesture bar
     *   + 56px  tab bar
     *   + 16px  gap
     *   + 56px  FAB button
     *   + 12px  gap above window
     *   = 140px + safe-area-inset-bottom
     */
    .vfrc-chat-window {
      bottom: calc(140px + env(safe-area-inset-bottom, 0px)) !important;
      right:  calc(12px  + env(safe-area-inset-right,  0px)) !important;
      left: auto !important;
      max-height: calc(
        100dvh
        - 148px
        - env(safe-area-inset-top,    0px)
        - env(safe-area-inset-bottom, 0px)
      ) !important;
      width: min(360px, calc(
        100vw - 24px
        - env(safe-area-inset-left,  0px)
        - env(safe-area-inset-right, 0px)
      )) !important;
      border-radius: 16px !important;
      overflow: hidden !important;
      border: 1px solid ${tk.windowBorder} !important;
      box-shadow: ${tk.shadow} !important;
      /* Overall background */
      background: ${tk.windowBg} !important;
    }

    /* ── Header ─────────────────────────────────────────────────────── */
    .vfrc-header {
      background: linear-gradient(
        90deg,
        ${tk.primaryShade} 0%,
        ${tk.primary}      100%
      ) !important;
      color: #ffffff !important;
    }
    .vfrc-header * { color: #ffffff !important; }

    /* ── Messages area ──────────────────────────────────────────────── */
    .vfrc-chat,
    .vfrc-messages-container {
      background: ${tk.windowBg} !important;
    }

    /* Bot / system bubbles */
    .vfrc-message--AGENT   .vfrc-bubble,
    .vfrc-message--SYSTEM  .vfrc-bubble,
    .vfrc-message--BOT     .vfrc-bubble {
      background: ${tk.botBubbleBg} !important;
      color:      ${tk.botBubbleText} !important;
    }

    /* User bubbles */
    .vfrc-message--USER .vfrc-bubble {
      background: ${tk.userBubbleBg} !important;
      color:      ${tk.userBubbleText} !important;
    }

    /* Timestamps & muted text */
    .vfrc-message__timestamp,
    .vfrc-system-response__timestamp {
      color: ${tk.mutedText} !important;
    }

    /* ── System response choice buttons ─────────────────────────────── */
    .vfrc-system-response .vfrc-button,
    .vfrc-button--primary {
      background:    ${tk.systemBtnBg}     !important;
      border-color:  ${tk.systemBtnBorder} !important;
      color:         ${tk.systemBtnText}   !important;
    }
    .vfrc-system-response .vfrc-button:hover,
    .vfrc-button--primary:hover {
      background: ${tk.primary} !important;
      color: #ffffff !important;
    }

    /* ── Input / footer area ────────────────────────────────────────── */
    .vfrc-chat-input,
    .vfrc-footer {
      background:   ${tk.footerBg}   !important;
      border-top:   1px solid ${tk.inputBorder} !important;
    }

    .vfrc-chat-input--input,
    .vfrc-chat-input textarea,
    .vfrc-chat-input input {
      background:  ${tk.inputBg}    !important;
      color:       ${tk.inputText}  !important;
      border:      1px solid ${tk.inputBorder} !important;
      border-radius: 20px !important;
    }

    .vfrc-chat-input--input::placeholder,
    .vfrc-chat-input textarea::placeholder,
    .vfrc-chat-input input::placeholder {
      color: ${tk.mutedText} !important;
    }

    /* Send button */
    .vfrc-chat-input--button,
    .vfrc-send-button {
      background: ${tk.primary} !important;
      color: #ffffff !important;
    }
  `;
}

// ---------------------------------------------------------------------------
// Style-tag helpers
// ---------------------------------------------------------------------------
const STYLE_ID = "voiceflow-theme-css";

function upsertWidgetStyle(isDark: boolean): void {
  const tokens = isDark ? DARK : LIGHT;
  const css = buildWidgetCss(tokens);

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.innerHTML = css;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------
interface VoiceflowChatProps extends React.HTMLAttributes<HTMLDivElement> {
  projectID?: string;
}

// ---------------------------------------------------------------------------
// VoiceflowChat component
// ---------------------------------------------------------------------------
const VoiceflowChat: React.FC<VoiceflowChatProps> = ({
  projectID = "69f1a03016565cff426ebc3d",
  className,
  style,
  children,
  ...props
}) => {
  // Consume the app-wide theme state
  const { isDark } = useSettings();

  // ── Inject / update theme CSS whenever isDark changes ──────────────────
  useEffect(() => {
    upsertWidgetStyle(isDark);
  }, [isDark]);

  // ── Launcher suppression + Voiceflow widget loading ────────────────────
  useEffect(() => {
    const hideLauncher = () => {
      if (window.voiceflow?.chat?.hideLauncher) {
        window.voiceflow.chat.hideLauncher();
      }
      const selectors = [
        ".vfrc-launcher",
        ".vfrc-launcher-button ._1u16jol1",
        ".vfrc-launcher--chat",
        ".vfrc-widget .vfrc-launcher",
        'button[title="Open chat agent"]',
        "[data-testid='launcher']",
        "[data-testid='voiceflow-launcher']",
      ];

      const hideElement = (el: Element) => {
        const node = el as HTMLElement;
        node.style.display = "none";
        node.style.visibility = "hidden";
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
      };

      const walk = (root: ParentNode) => {
        selectors.forEach((selector) => {
          root.querySelectorAll(selector).forEach(hideElement);
        });
        root.querySelectorAll("*").forEach((el) => {
          const shadow = (el as HTMLElement).shadowRoot;
          if (shadow) walk(shadow);
        });
      };

      walk(document);
    };

    const observer = new MutationObserver(hideLauncher);
    observer.observe(document.body, { childList: true, subtree: true });
    const intervalId = window.setInterval(hideLauncher, 500);

    const loadVoiceflow = () => {
      if (window.__voiceflow__initialized) {
        window.voiceflow?.chat?.show?.();
        hideLauncher();
        return;
      }

      window.voiceflow.chat.load({
        verify: { projectID },
        url: "https://general-runtime.voiceflow.com",
        versionID: "production",
        voice: { url: "https://runtime-api.voiceflow.com" },
      });
      window.__voiceflow__initialized = true;
      hideLauncher();
    };

    if (window.__voiceflow__loaded) {
      loadVoiceflow();
    } else if (!window.__voiceflow__loading) {
      window.__voiceflow__loading = true;
      const script = document.createElement("script");
      script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        loadVoiceflow();
        window.__voiceflow__loaded = true;
        window.__voiceflow__loading = false;
      };
      script.onerror = () => {
        window.__voiceflow__loading = false;
      };
      document.head.appendChild(script);
    }

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      if (window.voiceflow && typeof window.voiceflow.chat.hide === "function") {
        window.voiceflow.chat.hide();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.voiceflow?.chat?.open) {
      window.voiceflow.chat.open();
    }
    props.onClick?.(e);
  };

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        ...style,
      }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default VoiceflowChat;
