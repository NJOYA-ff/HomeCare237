// src/services/voiceflowService.ts
export interface VoiceFlowMessage {
  role: "user" | "assistant";
  content: string;
}

export class VoiceFlowService {
  private apiKey: string;
  private versionID: string;
  private baseURL = "https://general-runtime.voiceflow.com";

  constructor(apiKey: string, versionID: string = "production") {
    this.apiKey = apiKey;
    this.versionID = versionID;
  }

  async sendMessage(userID: string, message: string): Promise<string> {
    try {
      // Start interaction with VoiceFlow
      const response = await fetch(
        `${this.baseURL}/state/${this.versionID}/user/${userID}/interact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            request: {
              type: "text",
              payload: message,
            },
            config: {
              tts: false,
              stripSSML: true,
              stopAll: true,
              excludeTypes: ["audioplayer", "visual"],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `VoiceFlow API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      // Extract text responses from VoiceFlow
      const textResponses: string[] = [];

      data.forEach((item: any) => {
        if (item.type === "text" && item.payload?.message) {
          textResponses.push(item.payload.message);
        }
      });

      return (
        textResponses.join("\n\n") ||
        "I didn't understand that. Could you please rephrase?"
      );
    } catch (error) {
      console.error("VoiceFlow API error:", error);
      throw new Error(
        "Failed to get response from Health Assistant. Please check your connection and try again."
      );
    }
  }

  // Streaming version for better UX
  async sendMessageStream(
    userID: string,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseURL}/state/${this.versionID}/user/${userID}/interact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            request: {
              type: "text",
              payload: message,
            },
            config: {
              tts: false,
              stripSSML: true,
              stopAll: true,
              excludeTypes: ["audioplayer", "visual"],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `VoiceFlow API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      // Extract and stream text responses
      const textResponses: string[] = [];

      data.forEach((item: any) => {
        if (item.type === "text" && item.payload?.message) {
          textResponses.push(item.payload.message);
        }
      });

      const fullResponse =
        textResponses.join("\n\n") ||
        "I didn't understand that. Could you please rephrase?";

      // Simulate streaming by breaking response into chunks
      const words = fullResponse.split(" ");
      for (let i = 0; i < words.length; i++) {
        setTimeout(() => {
          onChunk(words[i] + (i < words.length - 1 ? " " : ""));
        }, i * 50); // 50ms delay between words for natural streaming effect
      }
    } catch (error) {
      console.error("VoiceFlow API streaming error:", error);
      throw error;
    }
  }

  // Reset conversation for a user
  async resetConversation(userID: string): Promise<void> {
    try {
      await fetch(`${this.baseURL}/state/${this.versionID}/user/${userID}`, {
        method: "DELETE",
        headers: {
          Authorization: this.apiKey,
        },
      });
    } catch (error) {
      console.error("VoiceFlow reset error:", error);
      // Don't throw error for reset failures as it's not critical
    }
  }
}
