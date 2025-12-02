// src/services/twilioServiceAlternative.ts
export class TwilioServiceAlternative {
  private device: any = null;
  private connection: any = null;
  private token: string = "";

  async initialize(token: string): Promise<void> {
    this.token = token;

    try {
      // Use any type to avoid TypeScript conflicts
      const Device = (window as any).Device;

      if (!Device) {
        throw new Error("Twilio Device not available");
      }

      this.device = new Device(token, {
        codecPreferences: ["opus", "pcmu"],
        fakeLocalDTMF: true,
        enableRingingState: true,
      });

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
    const response = await fetch("/api/twilio/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identity }),
    });

    if (!response.ok) {
      throw new Error("Failed to get Twilio token");
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
