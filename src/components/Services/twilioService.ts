// src/services/twilioServiceAlternative.ts
import { Call, Device } from "@twilio/voice-sdk";

export class TwilioServiceAlternative {
  private device: any = null;
  private connection: any = null;
  private token: string = "";

  async initialize(token: string): Promise<void> {
    this.token = token;

    try {
      const DeviceClass = Device || (typeof window !== "undefined" && (window as any).Device);

      if (!DeviceClass) {
        throw new Error("Twilio Voice Device not available");
      }

      this.device = new DeviceClass(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      } as any);

      this.setupDeviceListeners();

      await this.device.register();
    } catch (error) {
      console.error("Error initializing Twilio device:", error);
      throw error;
    }
  }

  private setupDeviceListeners(): void {
    if (!this.device) return;

    this.device.on("ready", () => {
      console.log("Twilio device ready");
    });

    this.device.on("error", (error: any) => {
      console.error("Twilio device error:", error);
    });

    this.device.on("connect", (conn: any) => {
      this.connection = conn;
      console.log("Call connected");
    });

    this.device.on("disconnect", () => {
      this.connection = null;
      console.log("Call disconnected");
    });
  }

  async makeCall(phoneNumber: string): Promise<any> {
    if (!this.device) {
      throw new Error("Device not initialized");
    }

    const formattedNumber = this.formatCameroonNumber(phoneNumber);

    try {
      this.connection = this.device.connect({
        To: formattedNumber,
      });

      this.setupConnectionListeners();
      return this.connection;
    } catch (error) {
      console.error("Error making call:", error);
      throw error;
    }
  }

  private formatCameroonNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\s/g, "");

    if (!cleaned.startsWith("+237")) {
      if (cleaned.startsWith("237")) {
        cleaned = "+" + cleaned;
      } else if (cleaned.startsWith("0")) {
        cleaned = "+237" + cleaned.substring(1);
      } else {
        cleaned = "+237" + cleaned;
      }
    }

    return cleaned;
  }

  private setupConnectionListeners(): void {
    if (!this.connection) return;

    this.connection.on("accept", () => {
      console.log("Call accepted");
    });

    this.connection.on("disconnect", () => {
      console.log("Call disconnected");
    });

    this.connection.on("error", (error: any) => {
      console.error("Call error:", error);
    });
  }

  disconnectCall(): void {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
  }

  async getCallToken(identity: string): Promise<string> {
    const apiBase =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, "")
        : "");
    const response = await fetch(`${apiBase}/api/twilio/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identity, type: "voice" }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Twilio voice token: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  }

  destroy(): void {
    if (this.connection) {
      this.connection.disconnect();
    }
    if (this.device) {
      this.device.destroy();
    }
  }
}

export const twilioServiceAlternative = new TwilioServiceAlternative();
