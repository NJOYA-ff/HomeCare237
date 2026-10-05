/**
 * testUtils.ts
 *
 * Testing utilities and helpers for HomeCare237
 * Includes custom matchers, test helpers, and mock data generators
 */

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Mock Firebase auth user
 */
export const createMockUser = (overrides: any = {}) => ({
  uid: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  emailVerified: true,
  ...overrides,
});

/**
 * Mock doctor data
 */
export const createMockDoctor = (overrides: any = {}) => ({
  id: "doctor-123",
  name: "Dr. Test Doctor",
  specialty: "General Practice",
  consultationFee: 5000,
  availability: ["Mon", "Wed", "Fri"],
  rating: 4.5,
  experience: "10 years",
  location: "Douala, Cameroon",
  isEnabled: true,
  isVerified: true,
  ...overrides,
});

/**
 * Mock patient data
 */
export const createMockPatient = (overrides: any = {}) => ({
  id: "patient-123",
  name: "Test Patient",
  email: "patient@example.com",
  phone: "671234567",
  bloodType: "O+",
  allergies: ["Penicillin"],
  conditions: ["Hypertension"],
  ...overrides,
});

/**
 * Mock appointment data
 */
export const createMockAppointment = (overrides: any = {}) => ({
  id: "appointment-123",
  patientId: "patient-123",
  patientName: "Test Patient",
  doctorId: "doctor-123",
  doctorName: "Dr. Test Doctor",
  date: "2024-01-15",
  time: "10:00",
  reason: "Regular checkup",
  consultationFee: 5000,
  status: "pending",
  paymentStatus: "pending",
  createdAt: new Date(),
  ...overrides,
});

/**
 * Mock message data
 */
export const createMockMessage = (overrides: any = {}) => ({
  id: "message-123",
  senderId: "patient-123",
  senderName: "Test Patient",
  content: "Hello doctor",
  type: "text",
  timestamp: new Date(),
  read: false,
  ...overrides,
});

/**
 * Wait for a specified time (useful for async tests)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Mock Firestore timestamp
 */
export const createMockTimestamp = (date: Date = new Date()) => ({
  toDate: () => date,
  toMillis: () => date.getTime(),
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000,
});

/**
 * Custom matchers for testing
 */
export const customMatchers = {
  toBeValidPhoneNumber(received: string) {
    const cameroonPhoneRegex = /^6[0-9]{8}$/;
    const valid = cameroonPhoneRegex.test(received.replace(/[\s\-+()]/g, ""));
    return {
      pass: valid,
      message: () => `expected ${received} to be a valid Cameroon phone number`,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = emailRegex.test(received);
    return {
      pass: valid,
      message: () => `expected ${received} to be a valid email address`,
    };
  },

  toBeValidBloodType(received: string) {
    const validBloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const valid = validBloodTypes.includes(received);
    return {
      pass: valid,
      message: () => `expected ${received} to be a valid blood type`,
    };
  },
};

/**
 * Validation helpers for testing
 */
export const testValidators = {
  isValidPhoneNumber: (phone: string) => {
    const cameroonPhoneRegex = /^6[0-9]{8}$/;
    return cameroonPhoneRegex.test(phone.replace(/[\s\-+()]/g, ""));
  },

  isValidEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidBloodType: (bloodType: string) => {
    const validBloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    return validBloodTypes.includes(bloodType);
  },
};

/**
 * Mock React Query for testing
 */
export const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * Test wrapper for components that need providers
 */
export const createTestWrapper = () => {
  const queryClient = createMockQueryClient();

  return ({ children }: any) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

/**
 * Mock Firebase operations
 */
export const mockFirebaseOperations = {
  // Mock addDoc
  addDoc: jest.fn().mockResolvedValue({ id: "mock-doc-id" }),
  
  // Mock getDoc
  getDoc: jest.fn().mockResolvedValue({
    exists: true,
    data: () => createMockPatient(),
  }),
  
  // Mock updateDoc
  updateDoc: jest.fn().mockResolvedValue(undefined),
  
  // Mock deleteDoc
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  
  // Mock getDocs
  getDocs: jest.fn().mockResolvedValue({
    forEach: (callback: any) => {
      callback({
        id: "mock-id",
        data: () => createMockDoctor(),
      });
    },
  }),
  
  // Mock onSnapshot
  onSnapshot: jest.fn((_query: any, callback: any) => {
    callback({
      forEach: (cb: any) => {
        cb({
          id: "mock-id",
          data: () => createMockDoctor(),
        });
      },
    });
    return () => {}; // Unsubscribe function
  }),
};

/**
 * Mock local storage
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
};

/**
 * Mock performance API
 */
export const mockPerformanceAPI = () => {
  return {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  };
};

/**
 * Test data generators for edge cases
 */
export const testEdgeCases = {
  emptyString: "",
  veryLongString: "a".repeat(10000),
  specialCharacters: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  unicode: "Hello 世界 🌍",
  null: null,
  undefined: undefined,
  zero: 0,
  negative: -1,
  largeNumber: Number.MAX_SAFE_INTEGER,
};

/**
 * Mock error responses
 */
export const mockErrors = {
  networkError: new Error("Network request failed"),
  authError: new Error("Authentication failed"),
  validationError: new Error("Validation failed"),
  notFoundError: new Error("Resource not found"),
  serverError: new Error("Internal server error"),
};