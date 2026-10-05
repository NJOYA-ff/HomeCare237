import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SettingsProvider } from "./context/SettingsContext";
import { MessageBoxProvider } from "./components/ui/useMessageBox";
import { isRoleMismatchError, RoleMismatchError } from "./utils/authErrors";
import SettingsPage from "./pages/Settings/SettingsPage";
import PatientSettings from "./pages/Settings/PatientSettings";
import DoctorSettings from "./pages/Settings/DoctorSettings";
import AdminSettings from "./pages/Settings/AdminSettings";
import BiometricLockScreen from "./components/BiometricLockScreen";
import {
  isLockEnabled,
  clearCredentials,
  saveCredentials,
} from "./utils/BiometricAuthService";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

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

/* Ionic Dark Mode — class-based so the in-app Light/Dark/System setting
   (SettingsContext → body.dark + html.ion-palette-dark) is the single source
   of truth instead of the OS media query. */
import "@ionic/react/css/palettes/dark.class.css";

/* Self-hosted Inter — one typeface for every device, works offline */
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";

/* Theme variables */
import "./theme/variables.css";

/* Shared design-system layer (typography scale, layout, skeletons, forms) */
import "./theme/hc-components.scss";

/* Shared form-field primitives (labelled inputs used across all portals) */
import "./theme/hc-form.scss";

/* Auth funnel design system (sign in / sign up / password recovery), rendered by
   <AuthShell/>. Imported after the shared layers so its scoped rules under
   `.auth-sheet` win on specificity without needing !important. */
import "./theme/hc-auth.scss";

// Import pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Doc_Profile from "./pages/Doctor/Doc_Profile";
import Appointments from "./pages/Doctor/Appointments";
import Patients from "./pages/Doctor/Patients";
import Doc_Consult from "./pages/Doctor/Doc_Consult";
import Admin_Profile from "./pages/Admin/Admin_Profile";
import Admin_Appointments from "./pages/Admin/Admin_Appointments";
import SMS_patient from "./pages/Admin/SMS_patient";
import Admin_patient from "./pages/Admin/Admin_patient";
import Admin_diagnoses from "./pages/Admin/Admin_Diagnoses";
import AdminNotifications from "./pages/Admin/AdminNotifications";
import Analytics from "./pages/Admin/Analytics";
import WelcomePage from "./pages/WelcomePage";
import AdminMenu from "./components/MenuAdmin";
import DoctorMenu from "./components/MenuDoctor";
import PatientMenu from "./components/Menu";
import PatientSignin from "./pages/PatientSignin";
import PatientSignup from "./pages/PatientSignup";
import PatientPasswordRecovery from "./pages/PatientPasswordRecovery";
import DoctorSignup from "./pages/DoctorSignup";
import DoctorSignin from "./pages/DoctorSignin";
import DoctorPasswordRecovery from "./pages/DoctorPasswordRecovery";
import AdminSignin from "./pages/AdminSignin";
import AdminPasswordRecovery from "./pages/AdminPasswordRecovery";
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import SMS_doctor from "./pages/Admin/SMS_doctor";
import Admin_doctor from "./pages/Admin/Admin_doctor";
import Health_units from "./pages/Admin/Health_units";
import Admin_DoctorAccounts from "./pages/Admin/Admin_DoctorAccounts";
import Health_units_d from "./pages/Doctor/Health_units_d";
import DoctorDiagnoses from "./pages/Doctor/Doc_diagnoses";
import LandingPage from "./pages/Landingpage";
import FirstRunGate, { ShowcasePreview } from "./components/onboarding/FirstRunGate";
import VerifyPrescription from "./pages/VerifyPrescription";
import Roleselect from "./pages/Roleselect";
import Roleselect2 from "./pages/Roleselect2";
import ChooseLanguage from "./pages/ChooseLanguage";
import { db, auth } from "./firebaseconfig";
import { useCloseApp } from "./components/hooks/useCloseApp";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Refer_patient from "./pages/Doctor/Refer_Patients";
import SMS_Admin from "./pages/Doctor/SMS_Admin";
import Tabs from "./components/Tabs";
import { NotificationProvider } from "./context/NotificationContext";
import { ChatProvider } from "./context/ChatContext";
import { QueryClientProvider } from "./context/QueryClientProvider";
import DoctorNotifications from "./pages/Doctor/DoctorNotifications";
import ErrorBoundary from "./components/ErrorBoundary";
// IMPORTANT: Import addIcons from ionicons
import { addIcons } from "ionicons";

// Import your medical icons
import { medicalIcons, ioniconsMedical } from "./utils/MedicalIcons";

// Optionally import regular Ionicons if needed
import { heart, pulse, medical, fitness, nutrition } from "ionicons/icons";

// Setup Ionic
setupIonicReact();

// Add ALL your custom icons to Ionic's icon registry
addIcons({
  // Your custom medical icons
  ...medicalIcons,
  ...ioniconsMedical,

  // Regular Ionicons (optional)
  heart,
  pulse,
  medical,
  fitness,
  nutrition,

  // You can add more Ionicons here as needed
});
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
  status?: string;
  isActive?: boolean;
  isEnabled?: boolean;
  isVerified?: boolean;
}

type ExpectedRole = UserRole | UserRole[];

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
            status: userData.status,
            isActive: userData.isActive,
            isEnabled: userData.isEnabled,
            isVerified: userData.isVerified,
          };
        }
      } catch (error) {
        console.log(`User not found in ${collectionName}`);
      }
    }
    return null;
  }

  private roleList(expectedRole?: ExpectedRole): UserRole[] {
    if (!expectedRole) return [];
    return Array.isArray(expectedRole) ? expectedRole : [expectedRole];
  }

  private primaryRole(expectedRole?: ExpectedRole): UserRole {
    const roles = this.roleList(expectedRole);
    return roles[0] ?? UserRole.Patient;
  }

  private assertRoleAccess(user: User, expectedRole?: ExpectedRole): void {
    const allowedRoles = this.roleList(expectedRole);
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Typed, rather than a bare `Error`, so the Google *redirect* flow can
      // tell "wrong portal" apart from a network failure and actually surface
      // it (see handleGoogleRedirectResult).
      throw new RoleMismatchError(user.role, allowedRoles);
    }

    if (user.isActive === false || user.status === "inactive") {
      throw new Error("This account is inactive. Please contact support.");
    }

    if (user.role === UserRole.Doctor) {
      if (user.isEnabled === false) {
        throw new Error("This doctor account has been disabled by an administrator.");
      }
      if (user.isVerified === false) {
        throw new Error("Your doctor account is awaiting admin verification.");
      }
    }
  }

  private dashboardForRole(role: UserRole): string {
    if (role === UserRole.Doctor) return "/doc/dashboard";
    if (role === UserRole.Admin) return "/admin/dashboard";
    return "/patient/dashboard";
  }

  async login(
    email: string,
    password: string,
    expectedRole?: ExpectedRole
  ): Promise<User | null> {
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
      this.assertRoleAccess(user, expectedRole);

      this.currentUser = user;
      this.notifyAuthStateListeners(user);
      console.log("Login successful, user role:", user.role);

      // Persist credentials so PIN/biometric quick sign-in works on next visit.
      // Failure to persist must never block a successful login.
      try {
        await saveCredentials({
          email,
          password,
          displayName: user.name || user.name1 || email,
        });
      } catch (err) {
        console.warn("Could not save quick sign-in credentials:", err);
      }

      return this.currentUser;
    } catch (error) {
      // A role mismatch is not just a failed sign-in: Firebase has *already*
      // created a live session for this account by the time we check the role.
      // Throwing without signing out left an authenticated-but-unauthorised
      // session behind, so the next `checkAuthState` could pick it up.
      if (isRoleMismatchError(error)) {
        await this.discardSession();
      }
      console.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Tears down a Firebase session that must not be honoured, without letting a
   * sign-out failure mask the original error the caller is about to show.
   */
  private async discardSession(): Promise<void> {
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error("Could not end rejected session:", signOutError);
    }
    this.currentUser = null;
  }
  /**
   * Alias for login() kept for backwards compatibility with DoctorSignin/AdminSignin.
   */
  async login1(
    email: string,
    password: string,
    expectedRole?: ExpectedRole
  ): Promise<User | null> {
    return this.login(email, password, expectedRole);
  }

  /**
   * Sign in with Google.
   *
   * Platform strategy:
   *  - Web (browser)  → signInWithPopup: resolves immediately, no page reload,
   *                     no redirect loop. Returns the signed-in user directly.
   *  - Android / iOS  → signInWithRedirect: required inside Capacitor WebViews
   *                     because popups are blocked. The result is picked up by
   *                     handleGoogleRedirectResult() on the next app load.
   */
  async loginWithGoogle(expectedRole?: ExpectedRole): Promise<User | null> {
    const platform = Capacitor.getPlatform(); // "web" | "android" | "ios"
    const role = this.primaryRole(expectedRole);
    const allowedRoles = this.roleList(expectedRole);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // ── Web: use popup — resolves in the same session, no reload ──────────
    if (platform === "web") {
      try {
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;

        let user = await this.findUserInCollections(firebaseUser.uid);

        if (!user) {
          if (role === UserRole.Admin) {
            await signOut(auth);
            throw new Error("Admin accounts must be created by an existing administrator.");
          }
          const collectionName = this.getCollectionName(role);
          const newUserData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
            role,
            profilePhoto: firebaseUser.photoURL || "",
            createdAt: new Date(),
            isActive: true,
            ...(role === UserRole.Doctor
              ? { isVerified: false, isEnabled: true, status: "pending" }
              : {}),
          };
          await setDoc(doc(db, collectionName, firebaseUser.uid), newUserData);
          user = {
            id: firebaseUser.uid,
            name: newUserData.name,
            email: newUserData.email,
            name1: newUserData.name,
            email1: newUserData.email,
            role,
          };
        }
        this.assertRoleAccess(user, allowedRoles.length ? allowedRoles : role);

        this.currentUser = user;
        this.notifyAuthStateListeners(user);

        return user;
      } catch (error) {
        // Same reasoning as `login`: the popup already established a session, so
        // a rejected role has to be torn down rather than left authenticated.
        if (isRoleMismatchError(error)) {
          await this.discardSession();
        }
        console.error("Google sign-in (popup) error:", error);
        throw error;
      }
    }

    // ── Android / iOS: use redirect — required in native WebViews ─────────
    try {
      // Persist role and target dashboard so they survive the redirect
      localStorage.setItem("google_signin_role", role);
      localStorage.setItem(
        "google_signin_roles",
        JSON.stringify(allowedRoles.length ? allowedRoles : [role])
      );
      const dashboardPath =
        role === UserRole.Doctor
          ? "/doc/dashboard"
          : role === UserRole.Admin
          ? "/admin/dashboard"
          : "/patient/dashboard";
      localStorage.setItem("google_signin_redirect", dashboardPath);

      await signInWithRedirect(auth, provider);
      // Execution never reaches here — page navigates away
      return null;
    } catch (error) {
      console.error(`Google sign-in (redirect / ${platform}) error:`, error);
      throw error;
    }
  }

  /**
   * Called once on app startup.  If the app was just returned from a Google
   * OAuth redirect, this completes the sign-in and returns the user.
   * Returns null if there is no pending redirect result.
   * Also returns the intended dashboard path via localStorage key
   * "google_signin_redirect" so the caller can navigate there.
   */
  async handleGoogleRedirectResult(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth);
      if (!result) return null;

      const firebaseUser = result.user;

      // Retrieve the role the user had selected before the redirect
      const storedRole = localStorage.getItem("google_signin_role") as UserRole | null;
      const storedRolesRaw = localStorage.getItem("google_signin_roles");
      const storedRoles = (() => {
        try {
          const parsed = storedRolesRaw ? JSON.parse(storedRolesRaw) : null;
          return Array.isArray(parsed) ? (parsed as UserRole[]) : [];
        } catch {
          return [];
        }
      })();
      localStorage.removeItem("google_signin_role");
      localStorage.removeItem("google_signin_roles");

      let user = await this.findUserInCollections(firebaseUser.uid);

      if (!user) {
        const role = storedRole ?? UserRole.Patient;
        if (role === UserRole.Admin) {
          await signOut(auth);
          throw new Error("Admin accounts must be created by an existing administrator.");
        }
        const collectionName = this.getCollectionName(role);
        const newUserData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          role,
          profilePhoto: firebaseUser.photoURL || "",
          createdAt: new Date(),
          isActive: true,
          ...(role === UserRole.Doctor
            ? { isVerified: false, isEnabled: true, status: "pending" }
            : {}),
        };
        await setDoc(doc(db, collectionName, firebaseUser.uid), newUserData);
        user = {
          id: firebaseUser.uid,
          name: newUserData.name,
          email: newUserData.email,
          name1: newUserData.name,
          email1: newUserData.email,
          role,
        };
      }
      this.assertRoleAccess(user, storedRoles.length ? storedRoles : storedRole ?? undefined);

      this.currentUser = user;
      this.notifyAuthStateListeners(user);

      return this.currentUser;
    } catch (error) {
      console.error("Google redirect result error:", error);
      // Clear stale keys on error too
      localStorage.removeItem("google_signin_role");
      localStorage.removeItem("google_signin_roles");
      localStorage.removeItem("google_signin_redirect");
      // A role mismatch is the one failure the user must be told about: it means
      // they opened the wrong portal. It used to be swallowed here along with
      // every other error, so on Android/iOS (where Google uses a redirect) the
      // app silently returned to the landing page with no explanation at all.
      // Re-throwing lets the caller surface the message; the session is dropped
      // so the rejected account is not left signed in.
      if (isRoleMismatchError(error)) {
        await this.discardSession();
        throw error;
      }
      return null;
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
        isActive: true,
      };

      if (role === UserRole.Doctor) {
        userData.specialty = additionalData?.specialty || "";
        userData.department = additionalData?.department || "";
        userData.isVerified = false;
        userData.isEnabled = true;
        userData.status = "pending";
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
      await clearCredentials();
      this.currentUser = null;
      this.notifyAuthStateListeners(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  /**
   * End the Firebase session restored from a previous launch **without**
   * forgetting the quick sign-in credential.
   *
   * Called by the startup "no automatic login" check in App.tsx: the app must
   * always open on the landing page, but the credential saved by the user's
   * last login must survive so QuickSignIn can offer one-tap PIN/biometric
   * sign-in the second time they open the sign-in page.
   *
   * Deliberately different from logout(), which is the user's explicit
   * "forget me on this device" action and also wipes the credential.
   */
  async endSession(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.notifyAuthStateListeners(null);
    } catch (error) {
      console.error("End session error:", error);
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
  // Path to redirect to after a Google OAuth redirect completes
  const [googleRedirectPath, setGoogleRedirectPath] = useState<string | null>(null);
  // Message shown when a sign-in is refused because the account role doesn't
  // match the portal the user opened (e.g. a Patient using the Doctor page).
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Lock screen state – shown when app resumes from background and user has
  // biometric or PIN security enabled.
  const [lockVisible, setLockVisible] = useState(false);
  // Track whether the app was sent to background at least once so we don't
  // lock on the very first launch.
  const wasInBackground = useRef(false);
  // Prevent showing the lock screen multiple times for the same resume event.
  const lockShown = useRef(false);

  // useCloseApp();

  useEffect(() => {
      console.log("App component mounted, checking auth state");

      const checkAuthState = async () => {
        try {
          // First check if we're returning from a Google OAuth redirect
          const redirectUser = await authService.handleGoogleRedirectResult();
          if (redirectUser) {
            // Determine the correct dashboard for this user's role
          const pendingPath =
            redirectUser.role === UserRole.Doctor
              ? "/doc/dashboard"
              : redirectUser.role === UserRole.Admin
              ? "/admin/dashboard"
              : "/patient/dashboard";
          localStorage.removeItem("google_signin_redirect");
          setCurrentUser(redirectUser);
          setGoogleRedirectPath(pendingPath);
          setLoading(false);
          return;
        }

        // ── No automatic login ───────────────────────────────────────────
        // Firebase Auth persists sessions across app launches (Capacitor
        // WebView storage on Android/iOS, localStorage in the browser), so
        // `auth.currentUser` would still hold the previous user here and the
        // app used to jump straight to their dashboard, never showing the
        // login interface. HomeCare237 must always start on the public
        // landing page instead: sign out any session restored from a
        // previous launch so the login interface opens only when the user
        // chooses to log in.
        //
        // Convenience is preserved by the QuickSignIn component on the
        // sign-in pages: endSession() only ends the Firebase session, so the
        // credential saved by the last login survives and the user gets
        // one-tap PIN/biometric sign-in the next time they open a sign-in
        // page. The credential is wiped only by an explicit logout().
        await authService.endSession();

        setCurrentUser(null);
      } catch (error) {
        console.error("Error checking auth state:", error);
        // A role mismatch surfaced here comes from the Google *redirect* flow
        // (Android/iOS): the user picked the wrong portal, came back, and the
        // rejection is now re-thrown instead of being silently swallowed. Show
        // it, otherwise the app lands on the landing page with no reason given.
        if (isRoleMismatchError(error)) {
          setAuthNotice((error as RoleMismatchError).message);
        }
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

    // ── Shared helper: show lock screen if conditions are met ─────────────
    const maybeShowLock = async () => {
      if (!wasInBackground.current) return;
      if (lockShown.current) return; // already shown for this resume

      const user = await authService.getCurrentUser();
      if (!user) return; // not logged in — nothing to lock

      const lockOn = await isLockEnabled();
      if (lockOn) {
        lockShown.current = true;
        setLockVisible(true);
      }
    };

    // ── Native (Capacitor): appStateChange ───────────────────────────────
    // Await the addListener promise so the handle is captured synchronously
    // before any cleanup could fire, eliminating the previous race condition.
    let removeCapListener: (() => void) | null = null;

    (async () => {
      const handle = await CapApp.addListener(
        "appStateChange",
        async ({ isActive }) => {
          if (!isActive) {
            // App going to background
            wasInBackground.current = true;
            lockShown.current = false; // ready to lock on next resume
          } else {
            // App coming back to foreground
            await maybeShowLock();
          }
        }
      );
      removeCapListener = () => handle.remove();
    })();

    // ── Web / PWA: visibilitychange ───────────────────────────────────────
    // Fires when the user switches browser tabs, minimises the window, or
    // the PWA goes to the background on Android Chrome.
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        wasInBackground.current = true;
        lockShown.current = false;
      } else if (document.visibilityState === "visible") {
        await maybeShowLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      authService.removeAuthStateListener(handleAuthStateChange);
      removeCapListener?.();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    <ErrorBoundary>
    <QueryClientProvider>
    <SettingsProvider>
    {/* Renders the single app-wide MessageBox and provides `useMessageBox` for
        the screens that present a dialog imperatively. Mounted above <IonApp>
        because the box portals to document.body, so it is a sibling of every
        page and modal no matter where the provider sits. */}
    <MessageBoxProvider>
    <NotificationProvider>
      {" "}
      <IonApp>
        {/* Design-review replay of the first-run showcase (?showcase=1). Sits
            above the router so it works even when signed in, where the
            FirstRunGate route below is never reached. */}
        <ShowcasePreview />
        <IonReactRouter>
          <Route path="/verify-prescription/:id" exact={true}>
            <VerifyPrescription />
          </Route>
          {!currentUser ? (
            // Public routes - no user logged in
            <>
              <Redirect exact from="/" to="/landingpage" />
              <Route path="/landingpage" exact={true}>
                {/* Plays the first-run services showcase on a fresh install,
                    then redirects here. Lives on this route (not on "/") so a
                    deep link into the funnel behaves identically to a cold
                    start. */}
                <FirstRunGate>
                  <LandingPage />
                </FirstRunGate>
              </Route>
              <Route path="/choose-language" exact={true}>
                {/* Language gate. `?next=` carries the funnel stage that asked for
                    it; ChooseLanguage allowlists it before using it. */}
                <ChooseLanguage />
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
                <Redirect to="/Admin_signin" />
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
              {/* After a Google OAuth redirect, push to the correct dashboard */}
              {googleRedirectPath && (
                <Redirect to={googleRedirectPath} />
              )}
              {currentUser.role === UserRole.Patient && (
                <>
                  {/* Patient Menu (Sidebar) */}
                  <IonSplitPane contentId="main">
                    <PatientMenu />
                    <ChatProvider>
                      <Tabs />
                    </ChatProvider>
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
                    <Route path="/doc/notification" exact={true}>
                      <DoctorNotifications />
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
                    <Route path="/doc/sms_admin" exact={true}>
                      <SMS_Admin />
                    </Route>

                    <Route path="/doc/settings" exact={true}>
                      <DoctorSettings />
                    </Route>

                    {/* Redirect any unknown doctor routes to dashboard */}
                    <Redirect to="/doc/dashboard" />
                  </IonRouterOutlet>
                </IonSplitPane>
              )}

              {currentUser.role === UserRole.Admin && (
                <IonSplitPane contentId="main_3">
                  <AdminMenu />
                  <IonRouterOutlet id="main_3" className="admin-scope">
                    <Redirect exact from="/" to="/admin/dashboard" />
                    <Route path="/admin/notifications" exact={true}>
                      <AdminNotifications />
                    </Route>
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
                    <Route path="/admin/doctor_accounts" exact={true}>
                      <Admin_DoctorAccounts />
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

                    <Route path="/admin/settings" exact={true}>
                      <AdminSettings />
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

        {/* Biometric / PIN lock screen – shown on app resume when lock is enabled */}
        <BiometricLockScreen
          visible={lockVisible}
          onUnlocked={() => {
            setLockVisible(false);
            wasInBackground.current = false;
            lockShown.current = false;
          }}
        />
      </IonApp>

        {/* Sign-in refused because the account role doesn't match the portal
            opened (Patient on the Doctor page, Doctor on the Patient page, …).
            Rendered at the app level so it is visible no matter which screen the
            user lands on after the rejection. `role="alert"` makes screen
            readers announce it immediately. */}
        {authNotice && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              position: "fixed",
              insetInline: 0,
              top: 0,
              zIndex: 20000,
              display: "flex",
              justifyContent: "center",
              padding: "12px 16px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                maxWidth: "560px",
                width: "100%",
                pointerEvents: "auto",
                background: "var(--ion-color-danger-contrast, #ffffff)",
                color: "var(--ion-color-danger-shade, #b00020)",
                borderRadius: "12px",
                padding: "12px 14px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                fontSize: "0.875rem",
                lineHeight: 1.4,
              }}
            >
              <span style={{ flex: 1 }}>{authNotice}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setAuthNotice(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                &times;
              </button>
            </div>
          </div>
        )}
    </NotificationProvider>
    </MessageBoxProvider>
    </SettingsProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
