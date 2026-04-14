import React from "react";
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
} from "@ionic/react";
import {
  languageOutline,
  notificationsOutline,
  volumeHighOutline,
  textOutline,
  informationCircleOutline,
  lockClosedOutline,
} from "ionicons/icons";
import { useSettings } from "../../context/SettingsContext";
import { useHistory } from "react-router-dom";
import "./Settings.scss";

const SettingsPage: React.FC = () => {
  const {
    language, setLanguage,
    t,
    notificationsEnabled, setNotificationsEnabled,
    soundEnabled, setSoundEnabled,
    fontSize, setFontSize,
  } = useSettings();
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="#" onClick={() => history.goBack()} />
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

        {/* Account */}
        <IonListHeader className="settings-section-header">
          {t("account")}
        </IonListHeader>
        <IonList className="settings-list">
          <IonItem button detail>
            <IonIcon icon={lockClosedOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("changePassword")}</IonLabel>
          </IonItem>
          <IonItem button detail>
            <IonIcon icon={informationCircleOutline} slot="start" className="settings-icon" />
            <IonLabel>{t("about")}</IonLabel>
            <IonNote slot="end">v1.0.0</IonNote>
          </IonItem>
        </IonList>

      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
