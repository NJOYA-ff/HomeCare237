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

type FormData = {
  email: string;
};

const AdminPasswordRecovery: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Declared before the handler below: it closes over `t` to render the
  // failure in the chosen language.
  const { t } = useSettings();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage("");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate error for demo purposes (remove in production)
    if (data.email === "error@example.com") {
      setErrorMessage(t("err_no_admin_account_email"));
      setIsLoading(false);
      return;
    }

    console.log("Recovery email sent to:", data.email);
    setIsLoading(false);
    setRecoverySent(true);
    reset();
  };

  const handleBackToLogin = () => {
    setRecoverySent(false);
    setErrorMessage("");
  };

  return (
    <AuthShell
      backHref={authBackTarget("admin", "recovery")}
      backLabel={authBackLabel("admin", "recovery", t)}
      eyebrow={roleLabel("admin", t)}
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
                      placeholder={t("field_email_address")}
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
                    {t("rec_sent_body_admin")}
                  </IonText>
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

export default AdminPasswordRecovery;
