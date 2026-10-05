import LoadingHelix from "../components/LoadingHelix";
import QuickSignIn from "../components/QuickSignIn";
import { getGoogleSignInErrorMessageT, getQuickSignInErrorMessageT } from "../utils/authErrors";
import AuthShell from "../components/AuthShell";
import { useSettings } from "../context/SettingsContext";
import React, { useState } from "react";
import {
  IonButton,
  IonInput,
  IonItem,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import { authService, UserRole } from "../App";
import { authBackLabel, authBackTarget, roleLabel } from "../utils/authFlow";
import "./Page.scss";
import { useHistory } from "react-router";

type FormData = {
  email: string;
  password: string;
};

const AdminSignin: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isPinOpen, setIsPinOpen] = useState(false);
  const history = useHistory();
  // Declared before the handlers below: they close over `t` to render Firebase
  // failures in the chosen language.
  const { t } = useSettings();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError("");

    try {
      // Use login1 (same as DoctorSignin) — Admin accounts are created via
      // the same Firebase project and stored in the "admins" collection.
      const user = await authService.login1(data.email, data.password, UserRole.Admin);

      if (user) {
        switch (user.role) {
          case UserRole.Admin:
            history.push("/admin/dashboard");
            break;
          case UserRole.Doctor:
            history.push("/doc/dashboard");
            break;
          default:
            history.push("/admin/dashboard");
        }
      } else {
        setLoginError(t("err_login_failed"));
      }
    } catch (error: any) {
      switch (error.code) {
        case "auth/user-not-found":
          setLoginError(t("err_no_admin_account_email"));
          break;
        case "auth/invalid-email":
          setLoginError(t("err_email_format"));
          break;
        case "auth/invalid-password":
          setLoginError(t("err_password_invalid"));
          break;
        case "auth/too-many-requests":
          setLoginError(t("err_too_many_attempts"));
          break;
        case "auth/network-request-failed":
          setLoginError(t("err_network_short"));
          break;
        default:
          setLoginError(t("err_failed_to_login"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Called by QuickSignIn after biometric/PIN verification succeeds.
  const handleQuickSignIn = async (creds: { email: string; password: string }) => {
    setIsLoading(true);
    setLoginError("");
    try {
      const user = await authService.login1(creds.email, creds.password, UserRole.Admin);
      if (user) {
        switch (user.role) {
          case UserRole.Admin:
            history.push("/admin/dashboard");
            break;
          case UserRole.Doctor:
            history.push("/doc/dashboard");
            break;
          default:
            history.push("/admin/dashboard");
        }
      } else {
        setLoginError(t("err_quick_signin_failed"));
      }
    } catch (error: unknown) {
      // Previously this bare `catch` discarded the error, so a stale saved
      // password was reported as an unexplained generic failure.
      setLoginError(getQuickSignInErrorMessageT(error, t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      backHref={authBackTarget("admin", "signin")}
      backLabel={authBackLabel("admin", "signin", t)}
      eyebrow={roleLabel("admin", t)}
      title={t("funnel_admin_signin")}
      subtitle={t("funnel_staff_access")}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeMd="8" sizeLg="6">
              {/* Hide email/password form while PIN modal is open */}
              {!isPinOpen && (
                <>
                  {/* Email */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <IonItem className="form-item">
                      <FiMail className="input-icon" />
                      <IonInput
                        type="email"
                        placeholder={t("field_email")}
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

                  {/* Password */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <IonItem className="form-item">
                      <FiLock className="input-icon" />
                      <IonInput
                        type="password"
                        placeholder={t("field_password")}
                        {...register("password", {
                          required: t("err_password_required"),
                          minLength: {
                            value: 6,
                            message: t("err_password_too_short"),
                          },
                        })}
                      />
                    </IonItem>
                    {errors.password && (
                      <span className="error-message">
                        {errors.password.message}
                      </span>
                    )}
                  </motion.div>

                  {/* Forgot Password */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="forgot-password"
                  >
                    <IonButton
                      fill="clear"
                      size="small"
                      routerLink="/Admin_password_recovery"
                    >
                      {t("funnel_forgot_password")}
                    </IonButton>
                  </motion.div>

                  {/* Error Message */}
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="error-container"
                    >
                      <IonText color="danger">{loginError}</IonText>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.div
                    className="submit-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
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
                          {t("funnel_signing_in")}
                        </>
                      ) : (
                        t("funnel_sign_in_action")
                      )}
                    </IonButton>
                  </motion.div>

                  {/* Sign Up Link */}
                  <motion.div
                    className="signup-link"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <IonText>{t("funnel_dont_have_account")}</IonText>
                    <IonButton
                      fill="clear"
                      routerLink="/Admin_signup"
                      className="signup-button2"
                    >
                      {t("funnel_sign_up")}
                    </IonButton>
                  </motion.div>

                  {/* Google Sign-In */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <div className="or-divider"><span>{t("funnel_or_continue_with")}</span></div>
                    <IonButton
                      expand="block"
                      fill="outline"
                      className="google-signin-btn"
                      disabled={isLoading}
                      onClick={async () => {
                        setIsLoading(true);
                        setLoginError("");
                        try {
                          const user = await authService.loginWithGoogle(UserRole.Admin);
                          if (user) {
                            switch (user.role) {
                              case UserRole.Admin: history.push("/admin/dashboard"); break;
                              case UserRole.Doctor: history.push("/doc/dashboard"); break;
                              default: history.push("/admin/dashboard");
                            }
                          }
                        } catch (err: unknown) {
                          // Closing the Google popup is a normal user action, not
                          // a failure — the mapper returns "" for cancellations so
                          // we stay silent instead of showing raw SDK text.
                          setLoginError(getGoogleSignInErrorMessageT(err, t));
                        } finally {
                          setIsLoading(false);
                        }
                      }
                  }  >
                      <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {t("funnel_sign_in_google")}
                    </IonButton>
                  </motion.div>
                </>
              )}

              {/* Quick Sign-In: PIN / Biometric (always rendered — button stays visible) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <QuickSignIn
                  onCredentials={handleQuickSignIn}
                  onViewChange={setIsPinOpen}
                />
              </motion.div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </form>
    </AuthShell>
  );
};

export default AdminSignin;
