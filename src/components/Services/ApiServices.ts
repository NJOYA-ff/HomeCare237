// src/services/AuthService.ts
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

class AuthService {
  private currentUser: User | null = null;

  login(email: string, password: string): Promise<User> {
    // Implement your actual login logic here
    // For demo, we'll return mock users based on email
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email === "admin@gmail.com") {
          this.currentUser = {
            id: "1",
            name: "Admin",
            email,
            role: UserRole.Admin,
          };
          console.info("admin");
        } else if (email === "doctor@gmail.com") {
          this.currentUser = {
            id: "2",
            name: "Dr. Smith",
            email,
            role: UserRole.Doctor,
          };
          console.info("doctor");
        } else {
          this.currentUser = {
            id: "3",
            name: "Patient",
            email,
            role: UserRole.Patient,
          };
          console.info("patient");
        }
        resolve(this.currentUser);
      }, 1000);
    });
  }

  logout(): void {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authService = new AuthService();
