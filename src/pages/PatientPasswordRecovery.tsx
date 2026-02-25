import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonText,
  IonIcon,
  IonButtons,
} from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { FiMail, FiCheckCircle, FiArrowLeft } from "react-icons/fi";
import "./Page.scss";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseconfig";
import { useHistory } from "react-router";
import { chevronBackOutline } from "ionicons/icons";

type FormData = {
  email: string;
};

const PatientPasswordRecovery: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successEmail, setSuccessEmail] = useState("");
  const history = useHistory();
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Send password reset email using Firebase Auth
      await sendPasswordResetEmail(auth, data.email);

      console.log("Recovery email sent to:", data.email);
      setSuccessEmail(data.email);
      setRecoverySent(true);
      reset();
    } catch (error: any) {
      console.error("Password reset error:", error);

      // Handle specific Firebase error codes
      switch (error.code) {
        case "auth/user-not-found":
          setErrorMessage("No account found with this email address");
          break;
        case "auth/invalid-email":
          setErrorMessage("Invalid email address format");
          break;
        case "auth/too-many-requests":
          setErrorMessage("Too many attempts. Please try again later.");
          break;
        case "auth/network-request-failed":
          setErrorMessage("Network error. Please check your connection.");
          break;
        default:
          setErrorMessage("Failed to send recovery email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRecoverySent(false);
    setErrorMessage("");
    setSuccessEmail("");
    history.push("/Patient_signin");
  };

  const handleResendEmail = async () => {
    if (!successEmail) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await sendPasswordResetEmail(auth, successEmail);
      console.log("Recovery email resent to:", successEmail);
      // You can show a toast or message that email was resent
    } catch (error: any) {
      console.error("Resend error:", error);
      setErrorMessage("Failed to resend email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar className="signuptoolbar">
          {" "}
          <IonTitle className="header-title">
            {recoverySent ? "Check Your Email" : "Password Recovery"}
          </IonTitle>
          <IonButtons slot="start">
            <IonButton routerLink="/Patient_signin" className="signupback">
              <IonIcon icon={chevronBackOutline} />
              Back
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="recovery-content">
        {/* Background elements */}
        <div className="background-elements">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-wave"
              initial={{ opacity: 0, y: 100 }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                y: [100, -100, 100],
                x: Math.random() * 100 - 50,
              }}
              transition={{
                duration: 20 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                background: `rgba(${Math.random() * 100}, ${
                  Math.random() * 100 + 155
                }, 255, 0.2)`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 200 + 100}px`,
                height: `${Math.random() * 100 + 50}px`,
                borderRadius: `${Math.random() * 50}%`,
              }}
            />
          ))}
        </div>

        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {!recoverySent ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <IonGrid>
                <IonRow className="ion-justify-content-center">
                  <IonCol size="12" sizeMd="8" sizeLg="6">
                    {/* Header Illustration */}
                    <motion.div
                      className="recovery-illustration"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <div className="illustration-circle">
                        <FiMail size={32} />
                      </div>
                      <IonText className="illustration-text">
                        Enter your email to receive a password reset link
                      </IonText>
                    </motion.div>

                    {/* Email Input */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <IonItem className="form-item">
                        <FiMail className="input-icon" />
                        <IonInput
                          type="email"
                          placeholder="Your email address"
                          {...register("email", {
                            required: "Email is required",
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: "Invalid email address",
                            },
                          })}
                        />
                      </IonItem>
                      {errors.email && (
                        <span className="error-message">
                          {errors.email.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Error Message */}
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="error-container"
                      >
                        <IonText color="danger">{errorMessage}</IonText>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <motion.div
                      className="submit-container"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <IonButton
                        type="submit"
                        expand="block"
                        className="submit-button"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <IonSpinner name="crescent" className="spinner" />
                            Sending...
                          </>
                        ) : (
                          "Send Recovery Link"
                        )}
                      </IonButton>
                    </motion.div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </form>
          ) : (
            <motion.div
              className="success-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <IonGrid>
                <IonRow className="ion-justify-content-center">
                  <IonCol size="12" sizeMd="8" sizeLg="6">
                    {/* Success Illustration */}
                    <motion.div
                      className="success-illustration"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <div className="success-circle">
                        <FiCheckCircle size={40} />
                      </div>
                      <IonText className="success-title">
                        Recovery Email Sent!
                      </IonText>
                      <IonText className="success-message">
                        We've sent a password reset link to{" "}
                        <strong>{successEmail}</strong>. Please check your inbox
                        and follow the instructions to reset your password.
                      </IonText>

                      {/* Resend option */}
                      <div className="resend-container">
                        <IonText color="medium">
                          Didn't receive the email?{" "}
                          <button
                            type="button"
                            className="resend-link"
                            onClick={handleResendEmail}
                            disabled={isLoading}
                          >
                            {isLoading ? "Sending..." : "Resend"}
                          </button>
                        </IonText>
                      </div>
                    </motion.div>

                    {/* Back to Login Button */}
                    <motion.div
                      className="back-to-login"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <IonButton
                        expand="block"
                        fill="outline"
                        className="login-button"
                        onClick={handleBackToLogin}
                      >
                        Back to Login
                      </IonButton>
                    </motion.div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </motion.div>
          )}
        </motion.div>
      </IonContent>
    </IonPage>
  );
};

export default PatientPasswordRecovery;
