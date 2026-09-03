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
  IonInput,
  IonButton,
  IonSpinner,
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
  medkitOutline,
  cashOutline,
  checkmarkOutline,
} from "ionicons/icons";
import { useSettings } from "../../context/SettingsContext";
import {
  checkBiometryAvailability,
  setBiometricEnabled,
  disablePin,
} from "../../utils/BiometricAuthService";
import PinSetupModal from "../../components/PinSetupModal";
import { auth, db } from "../../firebaseconfig";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../Settings/Settings.scss";

const DoctorSettings: React.FC = () => {
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

  // Doctor-specific prefs
  const [isAvailable, setIsAvailable] = useState(false);
  const [consultationFee, setConsultationFee] = useState("");
  const [newAppointmentNotif, setNewAppointmentNotif] = useState(
    () => localStorage.getItem("hc_doc_new_appt_notif") !== "false"
  );
  const [messageNotif, setMessageNotif] = useState(
    () => localStorage.getItem("hc_doc_message_notif") !== "false"
  );
  const [savingFee, setSavingFee] = useState(false);

  useEffect(() => {
    checkBiometryAvailability().then((r) => {
      setBioAvailable(r.available);
      setBioLabel(r.biometryLabel);
    });
    // Load doctor-specific data from Firestore
    const user = auth.currentUser;
    if (user) {
      getDoc(doc(db, "doctors", user.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsAvailable(data.isAvailable ?? true);
          setConsultationFee(String(data.consultationFee ?? ""));
        }
      });
    }
  }, []);

  const handleAvailabilityToggle = async (checked: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "doctors", user.uid), { isAvailable: checked });
      setIsAvailable(checked);
      presentToast({
        message: checked ? "You are now available for appointments" : "You are now unavailable",
        duration: 2500,
        color: checked ? "success" : "medium",
        position: "top",
      });
    } catch {
      presentToast({ message: "Failed to update availability", duration: 2500, color: "danger", position: "top" });
    }
  };

  const handleSaveFee = async () => {
    const user = auth.currentUser;
    const fee = parseFloat(consultationFee);
    if (!user || isNaN(fee) || fee < 0) {
      presentToast({ message: "Enter a valid consultation fee", duration: 2500, color: "warning", position: "top" });
      return;
    }
    setSavingFee(true);
    try {
      await updateDoc(doc(db, "doctors", user.uid), { consultationFee: fee });
      presentToast({ message: "Consultation fee updated", duration: 2500, color: "success", position: "top" });
    } catch {
      presentToast({ message: "Failed to update fee", duration: 2500, color: "danger", position: "top" });
    } finally {
      setSavingFee(false);
    }
  };

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
            <IonBackButton defaultHref="/doc/dashboard" />
          </IonButtons>
          <IonTitle>{t("settings")}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="settings-content">

        {/* Practice */}
        <IonListHeader className="settings-section-header">Practice</IonListHeader>
        <IonList className="settings-list">
          <IonItem>
            <IonIcon icon={calendarOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>Available for Appointments</h3>
              <p className="settings-desc">Patients can book appointments with you</p>
            </IonLabel>
            <IonToggle slot="end" checked={isAvailable} onIonChange={(e) => handleAvailabilityToggle(e.detail.checked)} />
          </IonItem>
          <IonItem>
            <IonIcon icon={cashOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>Consultation Fee (XAF)</h3>
              <p className="settings-desc">Fee charged per appointment</p>
            </IonLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <IonInput
                type="number"
                value={consultationFee}
                onIonInput={(e) => setConsultationFee(e.detail.value ?? "")}
                style={{ width: 90, textAlign: "right", fontSize: 13 }}
                min="0"
              />
              <IonButton size="small" fill="clear" onClick={handleSaveFee} disabled={savingFee}>
                {savingFee ? <IonSpinner name="crescent" style={{ width: 16, height: 16 }} /> : <IonIcon icon={checkmarkOutline} color="success" />}
              </IonButton>
            </div>
          </IonItem>
        </IonList>

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
            <IonIcon icon={medkitOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>New Appointment Alerts</h3>
              <p className="settings-desc">Notify when a patient books with you</p>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={newAppointmentNotif}
              onIonChange={(e) => {
                setNewAppointmentNotif(e.detail.checked);
                localStorage.setItem("hc_doc_new_appt_notif", String(e.detail.checked));
              }}
            />
          </IonItem>
          <IonItem>
            <IonIcon icon={notificationsOutline} slot="start" className="settings-icon" />
            <IonLabel>
              <h3>Message Notifications</h3>
              <p className="settings-desc">Notify on new patient messages</p>
            </IonLabel>
            <IonToggle
              slot="end"
              checked={messageNotif}
              onIonChange={(e) => {
                setMessageNotif(e.detail.checked);
                localStorage.setItem("hc_doc_message_notif", String(e.detail.checked));
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

export default DoctorSettings;
