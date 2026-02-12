import React, { useEffect } from "react";

// Add a declaration for the global voiceflow object on the window
declare global {
  interface Window {
    voiceflow: any;
    __voiceflow__loaded?: boolean;
  }
}

const VoiceflowChat: React.FC = () => {
  useEffect(() => {
    const loadVoiceflow = () => {
      window.voiceflow.chat.load({
        verify: { projectID: "6884d01bac55ce90f0e97dad" },
        url: "https://general-runtime.voiceflow.com",
        versionID: "production",
        voice: {
          url: "https://runtime-api.voiceflow.com",
        },
      });
    };

    if (window.__voiceflow__loaded) {
      // If script is already loaded, just show the chat.
      if (
        window.voiceflow &&
        typeof window.voiceflow.chat.show === "function"
      ) {
        window.voiceflow.chat.show();
      }
    } else {
      // If script is not loaded, load it.
      const script = document.createElement("script");
      script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        loadVoiceflow();
        window.__voiceflow__loaded = true;
      };

      document.head.appendChild(script);
    }

    return () => {
      // When component unmounts, hide the chat.
      if (
        window.voiceflow &&
        typeof window.voiceflow.chat.hide === "function"
      ) {
        window.voiceflow.chat.hide();
      }
    };
  }, []);

  return null; // The component doesn't render anything itself
};

export default VoiceflowChat;
