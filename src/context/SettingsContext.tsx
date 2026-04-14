import React, { createContext, useContext, useEffect, useState } from "react";

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
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    document.body.classList.remove("dark");
  }, []);

  useEffect(() => {
    const sizes = { small: "14px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--ion-font-size", sizes[fontSize]);
  }, [fontSize]);

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

  const t = (key: string) => translations[language][key] ?? key;

  return (
    <SettingsContext.Provider value={{
      language, setLanguage,
      t,
      notificationsEnabled, setNotificationsEnabled,
      soundEnabled, setSoundEnabled,
      fontSize, setFontSize,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
