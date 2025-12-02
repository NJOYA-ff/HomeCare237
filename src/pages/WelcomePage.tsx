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
} from "@ionic/react";
import { motion, useAnimation } from "framer-motion";
import { useHistory } from "react-router-dom";
import "./WelcomePage.css";
import icon from "./images/icon.png";
const WelcomePage: React.FC = () => {
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
                  <p>Your personalized health companion at home</p>
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
                  onClick={() => history.push("/Patient_signin")}
                  shape="round"
                >
                  Sign In
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  className="signup-button"
                  onClick={() => history.push("/Patient_signup")}
                  shape="round"
                >
                  Create Account
                </IonButton>
              </motion.div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default WelcomePage;
