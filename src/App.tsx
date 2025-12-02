import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { useEffect, useState } from "react";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Ionic Dark Mode */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

// Import pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Profile from "./pages/Patient/Profile";
import Book_Appointment from "./pages/Patient/Book_Appointment";
import Consult from "./pages/Patient/Consult";
import Lab_Result from "./pages/Patient/Lab_Result";
import Diagnoses from "./pages/Patient/Diagnoses";
import Doc_Profile from "./pages/Doctor/Doc_Profile";
import Appointments from "./pages/Doctor/Appointments";
import Patients from "./pages/Doctor/Patients";
import Doc_Consult from "./pages/Doctor/Doc_Consult";
import Admin_Profile from "./pages/Admin/Admin_Profile";
import Admin_Appointments from "./pages/Admin/Admin_Appointments";
import SMS_patient from "./pages/Admin/SMS_patient";
import Admin_patient from "./pages/Admin/Admin_patient";
import Admin_diagnoses from "./pages/Admin/Admin_Diagnoses";
import Analytics from "./pages/Admin/Analytics";
import WelcomePage from "./pages/WelcomePage";
import AdminMenu from "./components/MenuAdmin";
import DoctorMenu from "./components/MenuDoctor";
import PatientMenu from "./components/Menu";
import PatientDashboard from "./pages/Patient/PatientDashboard";
import PatientSignin from "./pages/PatientSignin";
import PatientSignup from "./pages/PatientSignup";
import PatientPasswordRecovery from "./pages/PatientPasswordRecovery";
import DoctorSignup from "./pages/DoctorSignup";
import DoctorSignin from "./pages/DoctorSignin";
import DoctorPasswordRecovery from "./pages/DoctorPasswordRecovery";
import AdminSignup from "./pages/AdminSignup";
import AdminSignin from "./pages/AdminSignin";
import AdminPasswordRecovery from "./pages/AdminPasswordRecovery";
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import SMS_doctor from "./pages/Admin/SMS_doctor";
import Admin_doctor from "./pages/Admin/Admin_doctor";
import Health_units from "./pages/Admin/Health_units";
import Health_units_p from "./pages/Patient/Health_units_p";
import Health_units_d from "./pages/Doctor/Health_units_d";
import DoctorDiagnoses from "./pages/Doctor/Doc_diagnoses";
import LandingPage from "./pages/Landingpage";
import Roleselect from "./pages/Roleselect";
import Roleselect2 from "./pages/Roleselect2";
import { db, auth, storage } from "./firebaseconfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Refer_patient from "./pages/Doctor/Refer_Patients";
import Tabs from "./components/Tabs";

setupIonicReact();

// Auth Service and Types
export enum UserRole {
  Patient = "patient",
  Doctor = "doctor",
  Admin = "admin",
}

export interface User {
  id: string;
  name1: string;
  email1: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  department?: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  // Singleton pattern to ensure only one instance
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private getCollectionName(role: UserRole): string {
    switch (role) {
      case UserRole.Patient:
        return "patients";
      case UserRole.Doctor:
        return "doctors";
      case UserRole.Admin:
        return "admins";
      default:
        return "users";
    }
  }

  private async findUserInCollections(uid: string): Promise<User | null> {
    const collections = ["patients", "doctors", "admins", "users"];

    for (const collectionName of collections) {
      try {
        const userDoc = await getDoc(doc(db, collectionName, uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`Found user in ${collectionName}:`, userData);
          return {
            id: uid,
            name: userData.name || userData.fullName || "Unknown",
            email: userData.email,
            name1: userData.name || userData.fullName || "Unknown",
            email1: userData.email,
            role: userData.role as UserRole,
            phone: userData.phone,
            specialty: userData.specialty,
            department: userData.department,
          };
        }
      } catch (error) {
        console.log(`User not found in ${collectionName}`);
      }
    }
    return null;
  }

  async login(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      const user = await this.findUserInCollections(firebaseUser.uid);
      if (!user) {
        throw new Error("User data not found in any database collection");
      }

      this.currentUser = user;
      this.notifyAuthStateListeners(user);
      console.log("Login successful, user role:", user.role);
      return this.currentUser;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }
  async login1(email1: string, password1: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email1,
        password1
      );
      const firebaseUser = userCredential.user;

      const user = await this.findUserInCollections(firebaseUser.uid);
      if (!user) {
        throw new Error("User data not found in any database collection");
      }

      this.currentUser = user;
      this.notifyAuthStateListeners(user);
      console.log("Login successful, user role:", user.role);
      return this.currentUser;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async signup(
    email: string,
    password: string,
    name: string,
    role: UserRole,
    additionalData?: any
  ): Promise<User | null> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      const collectionName = this.getCollectionName(role);
      const userData: any = {
        id: firebaseUser.uid,
        name,
        email,
        role,
        createdAt: new Date(),
      };

      if (role === UserRole.Doctor) {
        userData.specialty = additionalData?.specialty || "";
        userData.department = additionalData?.department || "";
      } else if (role === UserRole.Admin) {
        userData.department = additionalData?.department || "";
      } else if (role === UserRole.Patient) {
        userData.phone = additionalData?.phone || "";
        userData.dateOfBirth = additionalData?.dateOfBirth || "";
      }

      await setDoc(doc(db, collectionName, firebaseUser.uid), userData);
      this.currentUser = userData;
      this.notifyAuthStateListeners(userData);
      console.log("Signup successful, user role:", role);
      return this.currentUser;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.notifyAuthStateListeners(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const user = await this.findUserInCollections(firebaseUser.uid);
        this.currentUser = user;
        return user;
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    }
    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  }

  setUser(user: User | null): void {
    this.currentUser = user;
    this.notifyAuthStateListeners(user);
  }

  // Auth state management
  addAuthStateListener(callback: (user: User | null) => void): void {
    this.authStateListeners.push(callback);
  }

  removeAuthStateListener(callback: (user: User | null) => void): void {
    this.authStateListeners = this.authStateListeners.filter(
      (listener) => listener !== callback
    );
  }

  private notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach((callback) => callback(user));
  }
}

// Create and export a single instance
export const authService = AuthService.getInstance();

// Main App Component
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("App component mounted, checking auth state");

    const checkAuthState = async () => {
      try {
        const user = await authService.getCurrentUser();
        console.log("Initial auth check, user:", user);
        setCurrentUser(user);
      } catch (error) {
        console.error("Error checking auth state:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Add listener for auth state changes
    const handleAuthStateChange = (user: User | null) => {
      console.log("Auth state changed:", user);
      setCurrentUser(user);
    };

    authService.addAuthStateListener(handleAuthStateChange);

    // Cleanup
    return () => {
      authService.removeAuthStateListener(handleAuthStateChange);
    };
  }, []);

  if (loading) {
    return (
      <IonApp>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <p>Loading...</p>
        </div>
      </IonApp>
    );
  }

  console.log("Rendering App, currentUser:", currentUser);

  return (
    <IonApp>
      <IonReactRouter>
        {!currentUser ? (
          // Public routes - no user logged in
          <>
            <Redirect exact from="/" to="/landingpage" />
            <Route path="/landingpage" exact={true}>
              <LandingPage />
            </Route>
            <Route path="/roleselect" exact={true}>
              <Roleselect />
            </Route>
            <Route path="/roleselect2" exact={true}>
              <Roleselect2 />
            </Route>
            <Route path="/Welcomepage" exact={true}>
              <WelcomePage />
            </Route>

            <Route path="/Patient_signin" exact={true}>
              <PatientSignin />
            </Route>
            <Route path="/Patient_signup" exact={true}>
              <PatientSignup />
            </Route>
            <Route path="/Patient_password_recovery" exact={true}>
              <PatientPasswordRecovery />
            </Route>
            <Route path="/Doctor_signup" exact={true}>
              <DoctorSignup />
            </Route>
            <Route path="/Doctor_signin" exact={true}>
              <DoctorSignin />
            </Route>
            <Route path="/Doctor_password_recovery" exact={true}>
              <DoctorPasswordRecovery />
            </Route>
            <Route path="/Admin_signup" exact={true}>
              <AdminSignup />
            </Route>
            <Route path="/Admin_signin" exact={true}>
              <AdminSignin />
            </Route>
            <Route path="/Admin_password_recovery" exact={true}>
              <AdminPasswordRecovery />
            </Route>
          </>
        ) : (
          // Protected routes - user is logged in
          <>
            {currentUser.role === UserRole.Patient && (
              <>
                {/* Patient Menu (Sidebar) */}
                <IonSplitPane contentId="main">
                  <PatientMenu />
                  <Tabs />
                </IonSplitPane>
              </>
            )}

            {currentUser.role === UserRole.Doctor && (
              <IonSplitPane contentId="main_2">
                <DoctorMenu />
                <IonRouterOutlet id="main_2">
                  <Redirect exact from="/" to="/doc/dashboard" />
                  <Route path="/doc/dashboard" exact={true}>
                    <DoctorDashboard />
                  </Route>
                  <Route path="/doc/profile" exact={true}>
                    <Doc_Profile />
                  </Route>
                  <Route path="/doc/appointments" exact={true}>
                    <Appointments />
                  </Route>
                  <Route path="/doc/health_units_d" exact={true}>
                    <Health_units_d />
                  </Route>
                  <Route path="/doc/Patients" exact={true}>
                    <Patients />
                  </Route>
                  <Route path="/doc/diagnoses" exact={true}>
                    <DoctorDiagnoses />
                  </Route>
                  <Route path="/doc/consult" exact={true}>
                    <Doc_Consult />
                  </Route>
                  <Route path="/doc/refer_patients" exact={true}>
                    <Refer_patient />
                  </Route>

                  {/* Redirect any unknown doctor routes to dashboard */}
                  <Redirect to="/doc/dashboard" />
                </IonRouterOutlet>
              </IonSplitPane>
            )}

            {currentUser.role === UserRole.Admin && (
              <IonSplitPane contentId="main_3">
                <AdminMenu />
                <IonRouterOutlet id="main_3">
                  <Redirect exact from="/" to="/admin/dashboard" />
                  <Route path="/admin/dashboard" exact={true}>
                    <AdminDashboard />
                  </Route>
                  <Route path="/admin/profile" exact={true}>
                    <Admin_Profile />
                  </Route>
                  <Route path="/admin/appointments" exact={true}>
                    <Admin_Appointments />
                  </Route>
                  <Route path="/admin/sms_patient" exact={true}>
                    <SMS_patient />
                  </Route>
                  <Route path="/admin/sms_doctor" exact={true}>
                    <SMS_doctor />
                  </Route>
                  <Route path="/admin/patient" exact={true}>
                    <Admin_patient />
                  </Route>
                  <Route path="/admin/doctor" exact={true}>
                    <Admin_doctor />
                  </Route>
                  <Route path="/admin/diagnoses" exact={true}>
                    <Admin_diagnoses />
                  </Route>
                  <Route path="/admin/analytics" exact={true}>
                    <Analytics />
                  </Route>
                  <Route path="/admin/health_units" exact={true}>
                    <Health_units />
                  </Route>

                  {/* Redirect any unknown admin routes to dashboard */}
                  <Redirect to="/admin/dashboard" />
                </IonRouterOutlet>
              </IonSplitPane>
            )}

            {/* Fallback for users with unknown roles */}
            {![UserRole.Patient, UserRole.Doctor, UserRole.Admin].includes(
              currentUser.role
            ) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100vh",
                }}
              >
                <div>
                  <p>Unknown user role: {currentUser.role}</p>
                  <button onClick={() => authService.logout()}>Logout</button>
                </div>
              </div>
            )}
          </>
        )}
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
