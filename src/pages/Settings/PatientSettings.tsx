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
  useIonAlert,
} from "@ionic/react";
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
} from "ionicons/icons";
import { useSettings } from "../../context/SettingsContext";
import {
  checkBiometryAvailability,
  setBiometricEnabled,
  disablePin,
} from "../../utils/BiometricAuthService";
import PinSetupModal from "../../components/PinSetupModal";
import { auth } from "../../firebaseconfig";
import { sendPasswordResetEmail } from "firebase/auth";
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
  const [presentAlert] = useIonAlert();

  // Biometry
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");

  // PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"setup" | "verify">("setup");

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
      presentAlert({
        header: t("disablePin"),
        message: "Are you sure you want to remove your PIN?",
        buttons: [
          { text: t("cancel"), role: "cancel" },
          {
            text: "Remove", role: "destructive",
            handler: async () => {
              await disablePin();
              setPinEnabledSetting(false);
              presentToast({ message: "PIN disabled", duration: 2000, color: "medium", position: "top" });
            },
          },
        ],
      });
    }
  }, [t, setPinEnabledSetting, presentAlert, presentToast]);

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
    presentAlert({
      header: t("changePassword"),
      message: `A password reset link will be sent to:\n${email}`,
      buttons: [
        { text: t("cancel"), role: "cancel" },
        {
          text: "Send",
          handler: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              presentToast({ message: "Password reset email sent.", duration: 3500, color: "success", position: "top" });
            } catch (err: any) {
              presentToast({ message: err?.message || "Failed to send reset email.", duration: 3500, color: "danger", position: "top" });
            }
          },
        },
      ],
    });
  }, [presentAlert, presentToast, t]);

  const handleAbout = useCallback(() => {
    presentAlert({
      header: "HomeCare237",
      message: "Version 1.0.0\n\nConnecting patients with healthcare professionals across Cameroon.\n\n© 2026 HomeCare237. All rights reserved.",
      buttons: ["OK"],
    });
  }, [presentAlert]);

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

      </IonContent>

      <PinSetupModal isOpen={pinModalOpen} mode={pinModalMode} onSuccess={handlePinSuccess} onDismiss={() => setPinModalOpen(false)} />
    </IonPage>
  );
};

export default PatientSettings;
