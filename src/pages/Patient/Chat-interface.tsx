import React, { useEffect, useState } from "react";

// Add a declaration for the global voiceflow object on the window
declare global {
  interface Window {
    voiceflow?: any;
    __voiceflow__loaded?: boolean;
    __voiceflow__loading?: boolean;
    __voiceflow__initialized?: boolean;
  }
}

interface VoiceflowChatProps extends React.HTMLAttributes<HTMLDivElement> {
  projectID?: string;
}

const VoiceflowChat: React.FC<VoiceflowChatProps> = ({
  projectID = "6884d01bac55ce90f0e97dad",
  className,
  style,
  children,
  ...props
}) => {
  useEffect(() => {
    // Inject CSS to hide the default Voiceflow launcher button
    const styleId = "voiceflow-launcher-hidden";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
        /* Hide default launcher */
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

        /* Safe area + position */
        .vfrc-chat-window {
          bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important;
          right: 12px !important;
          max-height: calc(100dvh - 160px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 8px 32px rgba(59, 125, 216, 0.25) !important;
        }

        /* Header bar */
        .vfrc-header {
          background: #3b7dd8 !important;
          background: linear-gradient(90deg, #346ebe 0%, #3b7dd8 100%) !important;
        }

        /* Send button */
        .vfrc-chat-input--button,
        .vfrc-send-button {
          background: #3b7dd8 !important;
          color: #fff !important;
        }

        /* User message bubbles */
        .vfrc-message--USER .vfrc-bubble {
          background: #3b7dd8 !important;
          color: #fff !important;
        }

        /* System/bot buttons */
        .vfrc-system-response .vfrc-button,
        .vfrc-button--primary {
          background: #3b7dd8 !important;
          border-color: #3b7dd8 !important;
          color: #fff !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

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
          if (shadow) {
            walk(shadow);
          }
        });
      };

      walk(document);
    };

    const observer = new MutationObserver(() => {
      hideLauncher();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const intervalId = window.setInterval(() => {
      hideLauncher();
    }, 500);

    const loadVoiceflow = () => {
      if (window.__voiceflow__initialized) {
        window.voiceflow?.chat?.show?.();
        hideLauncher();
        return;
      }

      window.voiceflow.chat.load({
        verify: { projectID: "6884d01bac55ce90f0e97dad" },
        url: "https://general-runtime.voiceflow.com",
        versionID: "production",
        voice: {
          url: "https://runtime-api.voiceflow.com",
        },
      });
      window.__voiceflow__initialized = true;
      hideLauncher();
    };

    if (window.__voiceflow__loaded) {
      loadVoiceflow();
    } else if (!window.__voiceflow__loading) {
      // If script is not loaded and not loading, load it.
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
      // When component unmounts, hide the chat.
      if (
        window.voiceflow &&
        typeof window.voiceflow.chat.hide === "function"
      ) {
        window.voiceflow.chat.hide();
      }
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.voiceflow?.chat?.open) {
      window.voiceflow.chat.open();
    }
    if (props.onClick) {
      props.onClick(e);
    }
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
