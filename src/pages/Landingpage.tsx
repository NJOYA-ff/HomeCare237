import React, { useEffect } from "react";
import {
  IonContent,
  IonPage,
  IonImg,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import { motion, useAnimation } from "framer-motion";
import { useHistory } from "react-router-dom";
import icon from "./images/icon.png";
import RoleTabs from "./RoleTabs";
import { useSettings } from "../context/SettingsContext";
import { ROLE_PICKER, LANGUAGE_GATE_ROUTE } from "../utils/authFlow";
import "./Onboarding.css";
import "./WelcomePage.css";
const Landingpage: React.FC = () => {
  const history = useHistory();
  const { t } = useSettings();
  const controls = useAnimation();
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      await controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8 },
      });
      await textControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6 },
      });
      await buttonControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4 },
      });
    };
    sequence();
  }, []);

  return (
    <IonPage>
      <IonContent fullscreen className="ob-content">
        {/* <div className="ob-bg" aria-hidden="true">
      
          <motion.div
            className="ob-orb ob-orb-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
          />

          <motion.div
            className="ob-orb ob-orb-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
          />

          <motion.div
            className="ob-orb ob-orb-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, delay: 0.4 }}
          />
        </div> */}

        <IonGrid className="ob-grid">
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" className="ion-text-center">
              {/* Logo with animation */}
              <motion.div initial={{ opacity: 0, y: -50 }} animate={controls}>
                <IonImg
                  src={icon}
                  className="app-logo"
                  alt="HomeCare Health Logo"
                />
              </motion.div>

              {/* Welcome text with animation */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={textControls}
              >
                <IonText className="welcome-title">
                  <h1>
                    {t("funnel_welcome_prefix")}{" "}
                    <span>HomeCare237</span>
                  </h1>
                </IonText>
                <IonText className="welcome-subtitle">
                  <p>{t("funnel_tagline")}</p>
                </IonText>
              </motion.div>

              {/* Doctor illustration with animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.8, delay: 0.4 },
                }}
              ></motion.div>

              {/* Buttons with animation: frosted bottom sheet with side-by-side tabs */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={buttonControls}
                className="ob-spread"
              >
                <RoleTabs
                  leftLabel={t("funnel_sign_in")}
                  rightLabel={t("funnel_get_started")}
                  onLeft={() =>
                    history.push(
                      `${LANGUAGE_GATE_ROUTE}?next=${ROLE_PICKER.signin}`,
                    )
                  }
                  onRight={() =>
                    history.push(
                      `${LANGUAGE_GATE_ROUTE}?next=${ROLE_PICKER.signup}`,
                    )
                  }
                />
              </motion.div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Landingpage;
