import React, { useCallback, useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonNote,
  IonListHeader,
  useIonToast,
} from "@ionic/react";
import { useMessageBox } from "../../components/ui/useMessageBox";
import {
  languageOutline,
  notificationsOutline,
  volumeHighOutline,
  textOutline,
  informationCircleOutline,
  lockClosedOutline,
  fingerPrintOutline,
  keypadOutline,
  calendarOutline,
  personOutline,
  starOutline,
  shieldCheckmarkOutline,
  mailOutline,
  documentTextOutline,
  shareSocialOutline,
} from "ionicons/icons";
import { useSettings } from "../../context/SettingsContext";
import {
  checkBiometryAvailability,
  setBiometricEnabled,
  disablePin,
} from "../../utils/BiometricAuthService";
import PinSetupModal from "../../components/PinSetupModal";
import PasswordResetModal from "../../components/PasswordResetModal";
import { aboutMessage } from "../../data/appCredits";
import { auth } from "../../firebaseconfig";
import "../Settings/Settings.scss";

const PatientSettings: React.FC = () => {
  const {
    language, setLanguage, t,
    notificationsEnabled, setNotificationsEnabled,
    soundEnabled, setSoundEnabled,
    fontSize, setFontSize,
    biometricEnabled, setBiometricEnabledSetting,
    pinEnabled, setPinEnabledSetting,
  } = useSettings();

  const [presentToast] = useIonToast();
  const presentMessage = useMessageBox();

  // Biometry
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");

  // PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"setup" | "verify">("setup");

  // Password reset modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Patient-specific prefs (localStorage)
  const [appointmentReminders, setAppointmentReminders] = useState(
    () => localStorage.getItem("hc_appointment_reminders") !== "false"
  );
  const [shareProfile, setShareProfile] = useState(
    () => localStorage.getItem("hc_share_profile") !== "false"
  );

  useEffect(() => {
    checkBiometryAvailability().then((r) => {
      setBioAvailable(r.available);
      setBioLabel(r.biometryLabel);
    });
  }, []);

  const handleBiometricToggle = useCallback(async (checked: boolean) => {
    if (checked && !bioAvailable) {
      presentToast({ message: t("biometricNotAvailable"), duration: 3000, color: "warning", position: "top" });
      return;
    }
    await setBiometricEnabled(checked);
    setBiometricEnabledSetting(checked);
    presentToast({ message: checked ? `${bioLabel} enabled` : `${bioLabel} disabled`, duration: 2000, color: checked ? "success" : "medium", position: "top" });
  }, [bioAvailable, bioLabel, setBiometricEnabledSetting, presentToast, t]);

  const handlePinToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      setPinModalMode("setup");
      setPinModalOpen(true);
    } else {
      presentMessage({
        header: t("disablePin"),
        message: "Are you sure you want to remove your PIN?",
        /* Deleting the PIN is destructive, so the confirm action carries the
           danger colour and Cancel stays quiet — backing out is the safe
           default and red would imply something is about to be lost. */
        action: {
          text: "Remove", color: "danger",
          handler: async () => {
              await disablePin();
              setPinEnabledSetting(false);
              presentToast({ message: "PIN disabled", duration: 2000, color: "medium", position: "top" });
          },
        },
        cancel: { text: t("cancel") },
        });
    }
  }, [t, setPinEnabledSetting, presentMessage, presentToast]);

  const handlePinSuccess = useCallback(() => {
    setPinModalOpen(false);
    setPinEnabledSetting(true);
    presentToast({ message: t("pinSetupSuccess"), duration: 2500, color: "success", position: "top" });
  }, [setPinEnabledSetting, presentToast, t]);

  const handleChangePassword = useCallback(() => {
    const email = auth.currentUser?.email;
    if (!email) {
      presentToast({ message: "No account email found.", duration: 3000, color: "warning", position: "top" });
      return;
    }
    setPasswordModalOpen(true);
  }, [presentToast]);

  const handleAbout = useCallback(() => {
    presentMessage({
      header: "HomeCare237",
      message: aboutMessage(
        "Connecting patients with healthcare professionals across Cameroon.",
      ),
      /* Informational, not a failure — info tone keeps red for real errors. */
      tone: "info",
      action: { text: "OK" },
      });
  }, [presentMessage]);

  const handleRateApp = useCallback(() => {
    // Deep-link to the Play Store / App Store listing.
    // Replace with your actual package name / App Store ID.
    const androidUrl = "market://details?id=com.homecare237.app";
    const webFallback = "https://play.google.com/store/apps/details?id=com.homecare237.app";
    try {
      window.location.href = androidUrl;
    } catch {
      window.open(webFallback, "_blank");
    }
  }, []);

  const handleShareApp = useCallback(async () => {
    const message = t("shareAppMessage");
    const url = "https://homecare237.com";
    if (navigator.share) {
      try {
        await navigator.share({ title: "HomeCare237", text: message, url });
      } catch {
        // user dismissed share sheet — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${message}\n${url}`);
        presentToast({ message: "Link copied to clipboard!", duration: 2500, color: "success", position: "top" });
      } catch {
        presentToast({ message: "Could not share. Please copy the link manually.", duration: 3000, color: "warning", position: "top" });
      }
    }
  }, [t, presentToast]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/dashboard" />
          </IonButtons>
          <IonTitle>{t("settings")}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="settings-content">

        {/* Appearance */}
        <IonListHeader className="settings-section-header">{t("appearance")}</IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={textOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("fontSize")}</IonLabel>
            <IonSelect value={fontSize} onIonChange={(e) => setFontSize(e.detail.value)} interface="popover" slot="end" className="settings-select">
              <IonSelectOption value="small">{t("fontSizeSmall")}</IonSelectOption>
              <IonSelectOption value="medium">{t("fontSizeMedium")}</IonSelectOption>
              <IonSelectOption value="large">{t("fontSizeLarge")}</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        {/* Language */}
        <IonListHeader className="settings-section-header">{t("language")}</IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={languageOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("language")}</IonLabel>
            <IonSelect value={language} onIonChange={(e) => setLanguage(e.detail.value)} interface="popover" slot="end" className="settings-select">
              <IonSelectOption value="en">English</IonSelectOption>
              <IonSelectOption value="fr">Français</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        {/* Notifications */}
        <IonListHeader className="settings-section-header">{t("notifications")}</IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={notificationsOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("enableNotifications")}</IonLabel>
            <IonToggle slot="end" checked={notificationsEnabled} onIonChange={(e) => setNotificationsEnabled(e.detail.checked)} />
          </IonItem>
          <IonItem>
            <IonIcon icon={volumeHighOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("enableSound")}</IonLabel>
            <IonToggle slot="end" checked={soundEnabled} onIonChange={(e) => setSoundEnabled(e.detail.checked)} />
          </IonItem>
          <IonItem>
            <IonIcon icon={calendarOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>Appointment Reminders</h3>
              <p className="settings-desc">Get notified before your appointments</p>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={appointmentReminders}
              onIonChange={(e) => {
                setAppointmentReminders(e.detail.checked);
                localStorage.setItem("hc_appointment_reminders", String(e.detail.checked));
              }}
            />
          </IonItem>
        </IonList>

        {/* Privacy */}
        <IonListHeader className="settings-section-header">{t("privacy")}</IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={personOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>Share Profile with Doctors</h3>
              <p className="settings-desc">Allow doctors to view your profile info</p>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={shareProfile}
              onIonChange={(e) => {
                setShareProfile(e.detail.checked);
                localStorage.setItem("hc_share_profile", String(e.detail.checked));
              }}
            />
          </IonItem>
        </IonList>

        {/* Security */}
        <IonListHeader className="settings-section-header">{t("security")}</IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={fingerPrintOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("biometricAuth")}</h3>
              <p className="settings-desc">{t("biometricAuthDesc")}</p>
            </IonLabel>
            <IonToggle slot="end" checked={biometricEnabled} disabled={!bioAvailable} onIonChange={(e) => handleBiometricToggle(e.detail.checked)} />
          </IonItem>
          <IonItem>
            <IonIcon icon={keypadOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("pinAuth")}</h3>
              <p className="settings-desc">{t("pinAuthDesc")}</p>
            </IonLabel>
            <IonToggle slot="end" checked={pinEnabled} onIonChange={(e) => handlePinToggle(e.detail.checked)} />
          </IonItem>
          {pinEnabled && (
            <IonItem button detail onClick={() => { setPinModalMode("setup"); setPinModalOpen(true); }}>
              <IonIcon icon={lockClosedOutline} slot="start" className="settings-icon" />
              <IonLabel>{t("changePin")}</IonLabel>
            </IonItem>
          )}
        </IonList>

        {/* Account */}
        <IonListHeader className="settings-section-header">{t("account")}</IonListHeader>
        <IonList className="settings-list">
          <IonItem button detail onClick={handleChangePassword}>
            <IonIcon icon={lockClosedOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("changePassword")}</IonLabel>
          </IonItem>
          <IonItem button detail onClick={handleAbout}>
            <IonIcon icon={informationCircleOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("about")}</IonLabel>
            <IonNote slot="end">v1.0.0</IonNote>
          </IonItem>
        </IonList>

        {/* App */}
        <IonListHeader className="settings-section-header">App</IonListHeader>
        <IonList className="settings-list">

          {/* Rate App */}
          <IonItem button detail onClick={handleRateApp}>
            <IonIcon icon={starOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("rateApp")}</h3>
              <p className="settings-desc">{t("rateAppDesc")}</p>
            </IonLabel>
          </IonItem>

          {/* Privacy Policy */}
          <IonItem button detail routerLink="/patient/privacy-policy">
            <IonIcon icon={shieldCheckmarkOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("privacyPolicy")}</h3>
              <p className="settings-desc">{t("privacyPolicyDesc")}</p>
            </IonLabel>
          </IonItem>

          {/* Contact Us */}
          <IonItem button detail routerLink="/patient/contact">
            <IonIcon icon={mailOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("contactUs")}</h3>
              <p className="settings-desc">{t("contactUsDesc")}</p>
            </IonLabel>
          </IonItem>

          {/* Terms & Conditions */}
          <IonItem button detail routerLink="/patient/terms">
            <IonIcon icon={documentTextOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("termsConditions")}</h3>
              <p className="settings-desc">{t("termsConditionsDesc")}</p>
            </IonLabel>
          </IonItem>

          {/* Share App */}
          <IonItem button detail onClick={handleShareApp}>
            <IonIcon icon={shareSocialOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("shareApp")}</h3>
              <p className="settings-desc">{t("shareAppDesc")}</p>
            </IonLabel>
          </IonItem>

        </IonList>

      </IonContent>

      <PinSetupModal isOpen={pinModalOpen} mode={pinModalMode} onSuccess={handlePinSuccess} onDismiss={() => setPinModalOpen(false)} />

      {/* Reset Password modal */}
      <PasswordResetModal
        isOpen={passwordModalOpen}
        email={auth.currentUser?.email ?? null}
        onDidDismiss={() => setPasswordModalOpen(false)}
      />
    </IonPage>
  );
};

export default PatientSettings;
