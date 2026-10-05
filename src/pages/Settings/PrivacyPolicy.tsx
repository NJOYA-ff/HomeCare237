import React from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
} from "@ionic/react";
import { shieldCheckmarkOutline } from "ionicons/icons";
import { useSettings } from "../../context/SettingsContext";
import "../Settings/Settings.scss";

const PrivacyPolicy: React.FC = () => {
  const { t, isDark } = useSettings();

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/settings" />
          </IonButtons>
          <IonTitle>
            <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 8, verticalAlign: "middle", color: "#3b82f6" }} />
            {t("privacyPolicy")}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <iframe
          src={`/web/privacy-policy.html?theme=${isDark ? "dark" : "light"}`}
          key={isDark ? "dark" : "light"}
          title={t("privacyPolicy")}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicy;
