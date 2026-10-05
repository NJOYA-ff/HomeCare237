/**
 * securityUtils.ts
 *
 * Security utilities for HomeCare237 healthcare platform
 * Handles encryption, validation, and security-related operations
 */

/**
 * Validates phone number format for Cameroon
 */
export const validateCameroonPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-+()]/g, "");
  const local = cleaned.slice(-9);
  return local.startsWith("6") && local.length === 9;
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitizes user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

/**
 * Validates medical data input
 */
export const validateMedicalData = (data: {
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const validBloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  if (data.bloodType && !validBloodTypes.includes(data.bloodType)) {
    errors.push("Invalid blood type");
  }

  if (data.allergies && data.allergies.some(a => !a.trim())) {
    errors.push("Allergy names cannot be empty");
  }

  if (data.conditions && data.conditions.some(c => !c.trim())) {
    errors.push("Condition names cannot be empty");
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Masks sensitive data for logging
 */
export const maskSensitiveData = (data: any): any => {
  if (typeof data !== "object" || data === null) return data;

  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "creditCard",
    "ssn",
    "phone",
    "email"
  ];

  const masked = { ...data };
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = "***REDACTED***";
    }
  }

  return masked;
};

/**
 * Generates a secure random ID
 */
export const generateSecureId = (): string => {
  const array = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto.getRandomValues
    array[0] = Math.floor(Math.random() * 0xFFFFFFFF);
  }
  return array[0].toString(36);
};

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Session timeout manager
 */
export class SessionManager {
  private timeoutMs: number;
  private timer: NodeJS.Timeout | null = null;
  private onTimeout: () => void;

  constructor(timeoutMinutes: number = 30, onTimeout: () => void) {
    this.timeoutMs = timeoutMinutes * 60 * 1000;
    this.onTimeout = onTimeout;
  }

  start(): void {
    this.reset();
  }

  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.onTimeout();
    }, this.timeoutMs);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Data encryption utilities (placeholder for production implementation)
 * In production, use proper encryption libraries like crypto-js or Web Crypto API
 */
export const encryptionUtils = {
  async encrypt(data: string, key: string): Promise<string> {
    // Placeholder - implement proper encryption in production
    // For now, use base64 encoding (NOT secure for production)
    return btoa(data);
  },

  async decrypt(encryptedData: string, key: string): Promise<string> {
    // Placeholder - implement proper decryption in production
    return atob(encryptedData);
  },

  hash(data: string): string {
    // Simple hash for demo - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
};