import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  isBiometricEnabled,
  isPinEnabled,
  setBiometricEnabled as setBiometricEnabledPref,
} from "../utils/BiometricAuthService";

type Language = "en" | "fr";

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  fontSize: "small" | "medium" | "large";
  setFontSize: (s: "small" | "medium" | "large") => void;
  // Security
  biometricEnabled: boolean;
  setBiometricEnabledSetting: (v: boolean) => void;
  pinEnabled: boolean;
  setPinEnabledSetting: (v: boolean) => void;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    settings: "Settings",
    appearance: "Appearance",
    darkMode: "Dark Mode",
    darkModeSystem: "System Default",
    darkModeLight: "Light",
    darkModeDark: "Dark",
    language: "Language",
    notifications: "Notifications",
    enableNotifications: "Enable Notifications",
    sound: "Sound",
    enableSound: "Enable Sound",
    accessibility: "Accessibility",
    fontSize: "Font Size",
    fontSizeSmall: "Small",
    fontSizeMedium: "Medium",
    fontSizeLarge: "Large",
    account: "Account",
    changePassword: "Change Password",
    privacy: "Privacy",
    about: "About",
    version: "Version",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    appName: "HomeCare237",
    dashboard: "Dashboard",
    profile: "Profile",
    appointments: "Appointments",
    diagnoses: "Diagnoses",
    consult: "Consult",
    healthUnits: "Health Units",
    patients: "Patients",
    doctors: "Doctors",
    analytics: "Analytics",
    referPatients: "Refer Patients",
    smsDoctor: "SMS Doctor",
    smsPatient: "SMS Patient",
    notifications_page: "Notifications",
    // Security section
    security: "Security",
    biometricAuth: "Fingerprint / Face ID",
    biometricAuthDesc: "Unlock the app with your fingerprint or face",
    pinAuth: "PIN Lock",
    pinAuthDesc: "Unlock the app with a 4-digit PIN",
    setupPin: "Set Up PIN",
    changePin: "Change PIN",
    disablePin: "Disable PIN",
    pinSetupSuccess: "PIN set up successfully",
    biometricNotAvailable: "Biometrics not available on this device",
  },
  fr: {
    settings: "Paramètres",
    appearance: "Apparence",
    darkMode: "Mode Sombre",
    darkModeSystem: "Système",
    darkModeLight: "Clair",
    darkModeDark: "Sombre",
    language: "Langue",
    notifications: "Notifications",
    enableNotifications: "Activer les Notifications",
    sound: "Son",
    enableSound: "Activer le Son",
    accessibility: "Accessibilité",
    fontSize: "Taille de Police",
    fontSizeSmall: "Petite",
    fontSizeMedium: "Moyenne",
    fontSizeLarge: "Grande",
    account: "Compte",
    changePassword: "Changer le Mot de Passe",
    privacy: "Confidentialité",
    about: "À Propos",
    version: "Version",
    logout: "Déconnexion",
    save: "Enregistrer",
    cancel: "Annuler",
    appName: "HomeCare237",
    dashboard: "Tableau de Bord",
    profile: "Profil",
    appointments: "Rendez-vous",
    diagnoses: "Diagnostics",
    consult: "Consulter",
    healthUnits: "Unités de Santé",
    patients: "Patients",
    doctors: "Médecins",
    analytics: "Analytiques",
    referPatients: "Référer Patients",
    smsDoctor: "SMS Médecin",
    smsPatient: "SMS Patient",
    notifications_page: "Notifications",
    // Security section
    security: "Sécurité",
    biometricAuth: "Empreinte / Face ID",
    biometricAuthDesc: "Déverrouillez l'app avec votre empreinte ou visage",
    pinAuth: "Verrouillage PIN",
    pinAuthDesc: "Déverrouillez l'app avec un code à 4 chiffres",
    setupPin: "Configurer le PIN",
    changePin: "Changer le PIN",
    disablePin: "Désactiver le PIN",
    pinSetupSuccess: "PIN configuré avec succès",
    biometricNotAvailable: "Biométrie non disponible sur cet appareil",
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Non-security settings: localStorage is fine (no native equivalent) ──
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem("hc_language") as Language) || "fr"
  );
  const [notificationsEnabled, setNotificationsEnabledState] = useState(
    () => localStorage.getItem("hc_notifications") !== "false"
  );
  const [soundEnabled, setSoundEnabledState] = useState(
    () => localStorage.getItem("hc_sound") !== "false"
  );
  const [fontSize, setFontSizeState] = useState<"small" | "medium" | "large">(
    () => (localStorage.getItem("hc_fontSize") as any) || "medium"
  );

  // ── Security toggles: source of truth is Capacitor Preferences ──────────
  // Start as false; the async init below loads the real persisted values.
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pinEnabled, setPinEnabledState] = useState(false);

  // Load the real security state from Capacitor Preferences on mount.
  // On web this reads from localStorage under the "CapacitorStorage." prefix,
  // which is where BiometricAuthService (savePin, setBiometricEnabled, etc.)
  // also writes — so they always agree.
  useEffect(() => {
    Promise.all([isBiometricEnabled(), isPinEnabled()]).then(
      ([bioEn, pinEn]) => {
        setBiometricEnabledState(bioEn);
        setPinEnabledState(pinEn);
      }
    );
  }, []);

  useEffect(() => {
    document.body.classList.remove("dark");
  }, []);

  useEffect(() => {
    const sizes = { small: "14px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--ion-font-size", sizes[fontSize]);
  }, [fontSize]);

  // ── Setters ──────────────────────────────────────────────────────────────

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("hc_language", lang);
  };

  const setNotificationsEnabled = (v: boolean) => {
    setNotificationsEnabledState(v);
    localStorage.setItem("hc_notifications", String(v));
  };

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    localStorage.setItem("hc_sound", String(v));
  };

  const setFontSize = (s: "small" | "medium" | "large") => {
    setFontSizeState(s);
    localStorage.setItem("hc_fontSize", s);
  };

  /**
   * Called from SettingsPage after BiometricAuthService.setBiometricEnabled()
   * succeeds. We also write via the service so Preferences is always in sync.
   */
  const setBiometricEnabledSetting = (v: boolean) => {
    setBiometricEnabledState(v);
    // Write to Capacitor Preferences so QuickSignIn / lock-screen can read it.
    setBiometricEnabledPref(v);
  };

  /**
   * Called from SettingsPage after savePin() / disablePin() succeeds.
   * savePin() already sets hc_pin_enabled in Preferences; disablePin() clears
   * it. We just mirror the value into local React state here.
   */
  const setPinEnabledSetting = (v: boolean) => {
    setPinEnabledState(v);
    // No extra Preferences write needed — savePin/disablePin handle it.
  };

  const t = (key: string) => translations[language][key] ?? key;

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        t,
        notificationsEnabled,
        setNotificationsEnabled,
        soundEnabled,
        setSoundEnabled,
        fontSize,
        setFontSize,
        biometricEnabled,
        setBiometricEnabledSetting,
        pinEnabled,
        setPinEnabledSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
