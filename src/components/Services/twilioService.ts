import { Call, Device } from "@twilio/voice-sdk";

type IncomingCallHandler = (call: Call) => void;

export class TwilioServiceAlternative {
  private device: Device | null = null;
  private connection: Call | null = null;
  private token: string = "";
  private incomingHandler: IncomingCallHandler | null = null;

  async initialize(token: string): Promise<void> {
    try {
      // Refresh an existing Device instead of destroying consult-page registration
      if (this.device) {
        this.token = token;
        await this.device.updateToken(token);
        return;
      }

      const DeviceClass =
        Device ||
        (typeof window !== "undefined" && (window as any).Twilio?.Device);

      if (!DeviceClass) {
        throw new Error("Twilio Voice Device not available");
      }

      this.token = token;
      this.device = new DeviceClass(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true,
      } as any);

      this.setupDeviceListeners();
      await this.device.register();
    } catch (error) {
      console.error("Error initializing Twilio device:", error);
      throw error;
    }
  }

  isReady(): boolean {
    return Boolean(this.device);
  }

  private setupDeviceListeners(): void {
    if (!this.device) return;

    this.device.on("registered", () => {
      console.log("Twilio Voice device registered");
    });

    this.device.on("error", (error: any) => {
      console.error("Twilio device error:", error);
    });

    this.device.on("incoming", (call: Call) => {
      this.connection = call;
      if (this.incomingHandler) {
        this.incomingHandler(call);
      }
    });
  }

  /** Register a handler for incoming browser Voice calls. */
  setupIncomingCallHandler(handler: IncomingCallHandler): void {
    this.incomingHandler = handler;
  }

  /**
   * Place an outbound Voice call.
   * `destination` may be:
   *  - E.164 phone number
   *  - `client:identity` for in-app browser calls
   *  - bare identity (`doctor_…` / `patient_…`) — treated as a Voice client
   */
  async makeCall(destination: string): Promise<Call> {
    if (!this.device) {
      throw new Error("Device not initialized");
    }

    const To = this.resolveDialTarget(destination);

    try {
      this.connection = await this.device.connect({ params: { To } });
      this.setupConnectionListeners();
      return this.connection;
    } catch (error) {
      console.error("Error making call:", error);
      throw error;
    }
  }

  private resolveDialTarget(destination: string): string {
    const cleaned = String(destination || "").replace(/\s/g, "");
    if (!cleaned) {
      throw new Error("No call destination provided");
    }

    if (cleaned.startsWith("client:")) {
      return cleaned;
    }

    // In-app Voice identities used by HomeCare237
    if (
      cleaned.startsWith("patient_") ||
      cleaned.startsWith("doctor_") ||
      cleaned.startsWith("admin_")
    ) {
      return cleaned;
    }

    return this.formatCameroonNumber(cleaned);
  }

  private formatCameroonNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\s/g, "");

    if (cleaned.startsWith("+")) {
      return cleaned;
    }
    if (cleaned.startsWith("237")) {
      return "+" + cleaned;
    }
    if (cleaned.startsWith("0")) {
      return "+237" + cleaned.substring(1);
    }
    // US/international numbers already without + (10–15 digits)
    if (/^\d{10,15}$/.test(cleaned) && !cleaned.startsWith("6") && !cleaned.startsWith("2")) {
      return "+" + cleaned;
    }
    return "+237" + cleaned;
  }

  private setupConnectionListeners(): void {
    if (!this.connection) return;

    this.connection.on("accept", () => {
      console.log("Call accepted");
    });

    this.connection.on("disconnect", () => {
      console.log("Call disconnected");
      this.connection = null;
    });

    this.connection.on("error", (error: any) => {
      console.error("Call error:", error);
    });
  }

  disconnectCall(): void {
    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch {
        /* already torn down */
      }
      this.connection = null;
    }
    if (this.device) {
      try {
        this.device.disconnectAll();
      } catch {
        /* ignore */
      }
    }
  }

  async getCallToken(identity: string): Promise<string> {
    const apiBase =
      typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, "")
        : "";
    const response = await fetch(`${apiBase}/api/twilio/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identity, type: "voice" }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        if (errBody?.error) detail = errBody.error;
      } catch {
        /* ignore */
      }
      throw new Error(`Failed to get Twilio voice token: ${detail}`);
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error("No voice token returned from server");
    }
    return data.token;
  }

  destroy(): void {
    this.disconnectCall();
    if (this.device) {
      try {
        this.device.destroy();
      } catch {
        /* ignore */
      }
      this.device = null;
    }
    this.incomingHandler = null;
  }
}

export const twilioServiceAlternative = new TwilioServiceAlternative();
