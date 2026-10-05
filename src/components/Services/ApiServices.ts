// Legacy compatibility module.
//
// Authentication now lives in App.tsx as the Firebase-backed authService.
// This file is kept only so old imports fail loudly instead of silently using
// the former mock email-based login service.

export enum UserRole {
  Patient = "patient",
  Doctor = "doctor",
  Admin = "admin",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const authService = {
  async login(): Promise<never> {
    throw new Error("Use the Firebase authService exported from src/App.tsx.");
  },
  logout(): never {
    throw new Error("Use the Firebase authService exported from src/App.tsx.");
  },
  getCurrentUser(): never {
    throw new Error("Use the Firebase authService exported from src/App.tsx.");
  },
  isAuthenticated(): never {
    throw new Error("Use the Firebase authService exported from src/App.tsx.");
  },
};
