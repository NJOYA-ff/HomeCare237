/**
 * SettingsPage
 *
 * Full settings UI including a Security section that lets users:
 *  - Enable / disable fingerprint authentication
 *  - Enable / disable PIN lock
 *  - Set up or change their PIN
 */

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
  moonOutline,
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
import "./Settings.scss";

const SettingsPage: React.FC = () => {
  const {
    language,
    setLanguage,
    t,
    notificationsEnabled,
    setNotificationsEnabled,
    soundEnabled,
    setSoundEnabled,
    fontSize,
    setFontSize,
    darkMode,
    setDarkMode,
    biometricEnabled,
    setBiometricEnabledSetting,
    pinEnabled,
    setPinEnabledSetting,
  } = useSettings();

  const [presentToast] = useIonToast();
  const presentMessage = useMessageBox();

  // Biometry availability (device-level check)
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");

  // PIN setup modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"setup" | "verify">("setup");

  // Password reset modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    checkBiometryAvailability().then((r) => {
      setBioAvailable(r.available);
      setBioLabel(r.biometryLabel);
    });
  }, []);

  // ── Biometric toggle ──────────────────────────────────────────────────────

  const handleBiometricToggle = useCallback(
    async (checked: boolean) => {
      if (checked && !bioAvailable) {
        presentToast({
          message: t("biometricNotAvailable"),
          duration: 3000,
          color: "warning",
          position: "top",
        });
        return;
      }
      await setBiometricEnabled(checked);
      setBiometricEnabledSetting(checked);
      presentToast({
        message: checked
          ? `${bioLabel} enabled`
          : `${bioLabel} disabled`,
        duration: 2000,
        color: checked ? "success" : "medium",
        position: "top",
      });
    },
    [bioAvailable, bioLabel, setBiometricEnabledSetting, presentToast, t]
  );

  // ── PIN toggle ────────────────────────────────────────────────────────────

  const handlePinToggle = useCallback(
    async (checked: boolean) => {
      if (checked) {
        // Open setup modal
        setPinModalMode("setup");
        setPinModalOpen(true);
      } else {
        // Confirm before disabling
        presentMessage({
          header: t("disablePin"),
          message: "Are you sure you want to remove your PIN?",
          /* Removing the PIN is destructive, so the confirm action carries the
             danger colour and Cancel stays quiet — backing out is the safe
             default, and red there would imply something is about to be lost. */
          action: {
            text: "Remove",
            color: "danger",
            handler: async () => {
              await disablePin();
              setPinEnabledSetting(false);
              presentToast({
                message: "PIN disabled",
                duration: 2000,
                color: "medium",
                position: "top",
              });
            },
          },
          cancel: { text: t("cancel") },
        });
      }
    },
    [t, setPinEnabledSetting, presentMessage, presentToast]
  );

  // ── Change PIN ────────────────────────────────────────────────────────────

  const handleChangePin = useCallback(() => {
    setPinModalMode("setup");
    setPinModalOpen(true);
  }, []);

  // ── PIN setup success ─────────────────────────────────────────────────────

  const handlePinSuccess = useCallback(() => {
    setPinModalOpen(false);
    setPinEnabledSetting(true);
    presentToast({
      message: t("pinSetupSuccess"),
      duration: 2500,
      color: "success",
      position: "top",
    });
  }, [setPinEnabledSetting, presentToast, t]);

  // ── Change Password (opens the reset-password sheet modal) ───────────────

  const handleChangePassword = useCallback(() => {
    const email = auth.currentUser?.email;
    if (!email) {
      presentToast({
        message: "No account email found. Please sign in again.",
        duration: 3000,
        color: "warning",
        position: "top",
      });
      return;
    }
    setPasswordModalOpen(true);
  }, [presentToast]);

  // ── About ─────────────────────────────────────────────────────────────────

  const handleAbout = useCallback(() => {
    presentMessage({
      header: "HomeCare237",
      message:
        "HomeCare237 connects patients with healthcare professionals across Cameroon.",
      /* Informational, not a failure — the info tone keeps red reserved for
         dialogs reporting something that actually went wrong. */
      tone: "info",
      action: { text: "OK" },
    });
  }, [presentMessage]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="#" />
          </IonButtons>
          <IonTitle>{t("settings")}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="settings-content">

        {/* Appearance */}
        <IonListHeader className="settings-section-header">
          {t("appearance")}
        </IonListHeader>
        <IonList className="settings-list">
          {/* Dark Mode */}
          <IonItem>
            <IonIcon icon={moonOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("darkMode")}</IonLabel>
            <IonSelect
              value={darkMode}
              onIonChange={(e) => setDarkMode(e.detail.value)}
              interface="popover"
              slot="end"
              className="settings-select"
            >
              <IonSelectOption value="system">{t("darkModeSystem")}</IonSelectOption>
              <IonSelectOption value="light">{t("darkModeLight")}</IonSelectOption>
              <IonSelectOption value="dark">{t("darkModeDark")}</IonSelectOption>
            </IonSelect>
          </IonItem>
          {/* Font Size */}
          <IonItem>
            <IonIcon icon={textOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("fontSize")}</IonLabel>
            <IonSelect
              value={fontSize}
              onIonChange={(e) => setFontSize(e.detail.value)}
              interface="popover"
              slot="end"
              className="settings-select"
            >
              <IonSelectOption value="small">{t("fontSizeSmall")}</IonSelectOption>
              <IonSelectOption value="medium">{t("fontSizeMedium")}</IonSelectOption>
              <IonSelectOption value="large">{t("fontSizeLarge")}</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        {/* Language */}
        <IonListHeader className="settings-section-header">
          {t("language")}
        </IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={languageOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("language")}</IonLabel>
            <IonSelect
              value={language}
              onIonChange={(e) => setLanguage(e.detail.value)}
              interface="popover"
              slot="end"
              className="settings-select"
            >
              <IonSelectOption value="en">English</IonSelectOption>
              <IonSelectOption value="fr">Français</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        {/* Notifications */}
        <IonListHeader className="settings-section-header">
          {t("notifications")}
        </IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={notificationsOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("enableNotifications")}</IonLabel>
            <IonToggle
              slot="end"
              checked={notificationsEnabled}
              onIonChange={(e) => setNotificationsEnabled(e.detail.checked)}
            />
          </IonItem>
          <IonItem>
            <IonIcon icon={volumeHighOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("enableSound")}</IonLabel>
            <IonToggle
              slot="end"
              checked={soundEnabled}
              onIonChange={(e) => setSoundEnabled(e.detail.checked)}
            />
          </IonItem>
        </IonList>

        {/* ── Security ───────────────────────────────────────────────────── */}
        <IonListHeader className="settings-section-header">
          {t("security")}
        </IonListHeader>
        <IonList className="settings-list">

          {/* Biometric toggle */}
          <IonItem>
            <IonIcon icon={fingerPrintOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("biometricAuth")}</h3>
              <p className="settings-desc">{t("biometricAuthDesc")}</p>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={biometricEnabled}
              disabled={!bioAvailable}
              onIonChange={(e) => handleBiometricToggle(e.detail.checked)}
            />
          </IonItem>

          {/* PIN toggle */}
          <IonItem>
            <IonIcon icon={keypadOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>{t("pinAuth")}</h3>
              <p className="settings-desc">{t("pinAuthDesc")}</p>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={pinEnabled}
              onIonChange={(e) => handlePinToggle(e.detail.checked)}
            />
          </IonItem>

          {/* Change PIN – only visible when PIN is already enabled */}
          {pinEnabled && (
            <IonItem button detail onClick={handleChangePin}>
              <IonIcon icon={lockClosedOutline} slot="start" className="settings-icon" />
              <IonLabel>{t("changePin")}</IonLabel>
            </IonItem>
          )}

        </IonList>

        {/* Account */}
        <IonListHeader className="settings-section-header">
          {t("account")}
        </IonListHeader>
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

      {/* PIN Setup / Change modal */}
      <PinSetupModal
        isOpen={pinModalOpen}
        mode={pinModalMode}
        onSuccess={handlePinSuccess}
        onDismiss={() => setPinModalOpen(false)}
      />

      {/* Reset Password modal */}
      <PasswordResetModal
        isOpen={passwordModalOpen}
        email={auth.currentUser?.email ?? null}
        onDidDismiss={() => setPasswordModalOpen(false)}
      />
    </IonPage>
  );
};

export default SettingsPage;
