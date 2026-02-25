import React, { useEffect } from "react";
import {
  IonContent,
  IonPage,
  IonButton,
  IonImg,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonHeader,
  IonIcon,
  IonToolbar,
} from "@ionic/react";
import { motion, useAnimation } from "framer-motion";
import FaUserDoctor from "react-icons/fa";
import { useHistory } from "react-router-dom";
import "../pages/Page.scss";
import icon from "./images/icon.png";
import { chevronBackOutline } from "ionicons/icons";
const Roleselect2: React.FC = () => {
  const history = useHistory();
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
      <IonHeader class="ion-no-border">
        <IonToolbar className="signuptoolbar">
          <IonButtons>
            <IonButton routerLink="/landingpage" className="signupback">
              <IonIcon icon={chevronBackOutline} />
              Back
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="welcome-content">
        <div className="background-gradient">
          {/* Animated circles in background */}
          <motion.div
            className="circle circle-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
          />

          <motion.div
            className="circle circle-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
          />
        </div>

        <IonGrid className="welcome-grid">
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
                    Welcome to <span>HomeCare237</span>
                  </h1>
                </IonText>
                <IonText className="welcome-subtitle">
                  <p>Register as</p>
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

              {/* Buttons with animation */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={buttonControls}
                className="button-group"
              >
                <IonButton
                  expand="block"
                  className="signin-button"
                  onClick={() => history.push("/Patient_signup")}
                  shape="round"
                >
                  Patient
                </IonButton>

                <div className="separator-with-text">
                  <div className="line"></div>
                  <IonText className="separator-text">
                    <p>Or</p>
                  </IonText>
                  <div className="line"></div>
                </div>

                <IonButton
                  expand="block"
                  fill="outline"
                  className="signup-button"
                  onClick={() => history.push("/Doctor_signup")}
                  shape="round"
                >
                  Doctor
                </IonButton>
              </motion.div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Roleselect2;
