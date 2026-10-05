import LoadingHelix from "../components/LoadingHelix";
import AuthShell from "../components/AuthShell";
import { useSettings } from "../context/SettingsContext";
import React, { useState } from "react";
import { IonButton, IonInput, IonItem, IonGrid, IonRow, IonCol, IonText } from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { FiMail, FiCheckCircle } from "react-icons/fi";
import { authBackLabel, authBackTarget, roleLabel } from "../utils/authFlow";
import "./Page.scss";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseconfig";
import { useHistory } from "react-router";

type FormData = {
  email: string;
};

const DoctorPasswordRecovery: React.FC = () => {
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
  // Declared before the handlers below: they close over `t` to render Firebase
  // failures in the chosen language.
  const { t } = useSettings();
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
          setErrorMessage(t("err_no_doctor_account_email"));
          break;
        case "auth/invalid-email":
          setErrorMessage(t("err_email_format"));
          break;
        case "auth/too-many-requests":
          setErrorMessage(t("err_too_many_attempts"));
          break;
        case "auth/network-request-failed":
          setErrorMessage(t("err_network_short"));
          break;
        case "auth/operation-not-allowed":
          setErrorMessage(t("err_recovery_not_enabled"));
          break;
        default:
          setErrorMessage(t("err_recovery_send_failed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRecoverySent(false);
    setErrorMessage("");
    setSuccessEmail("");
    // replace, not push: this returns to the screen the user already came
    // from. Pushing would leave [signin, recovery, signin] on the stack, so the
    // browser/hardware back button would walk back into the recovery screen.
    history.replace(authBackTarget("doctor", "recovery"));
  };

  const handleResendEmail = async () => {
    if (!successEmail) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await sendPasswordResetEmail(auth, successEmail);
      console.log("Recovery email resent to:", successEmail);
      // Optional: Show a success message for resend
    } catch (error: any) {
      console.error("Resend error:", error);
      setErrorMessage(t("err_recovery_resend_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      backHref={authBackTarget("doctor", "recovery")}
      backLabel={authBackLabel("doctor", "recovery", t)}
      eyebrow={roleLabel("doctor", t)}
      title={
        recoverySent ? t("rec_check_inbox") : t("rec_title")
      }
      transitionKey={recoverySent ? "sent" : "request"}
      subtitle={recoverySent ? undefined : t("rec_sub")}
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
                    {t("rec_email_prompt")}
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
                      placeholder={t("field_prof_email_address")}
                      {...register("email", {
                        required: t("err_email_required"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("err_email_invalid"),
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
                        <LoadingHelix className="spinner" size={18} color="white" />
                        {t("rec_sending")}
                      </>
                    ) : (
                      t("rec_send_link")
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
                    {t("rec_sent_title")}
                  </IonText>
                  <IonText className="success-message">
                    {t("rec_sent_body", { email: successEmail })}
                  </IonText>

                  {/* Resend option */}
                  <div className="resend-container">
                    <IonText color="medium">
                      {t("rec_no_email")}{" "}
                      <button
                        type="button"
                        className="resend-link"
                        onClick={handleResendEmail}
                        disabled={isLoading}
                      >
                        {isLoading ? t("rec_sending") : t("rec_resend")}
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
                    {t("rec_back_to_login")}
                  </IonButton>
                </motion.div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </motion.div>
      )}
    </AuthShell>
  );
};

export default DoctorPasswordRecovery;
