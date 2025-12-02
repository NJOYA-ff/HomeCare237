import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonButtons,
  IonIcon,
} from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import { authService, UserRole } from "../App";
import "./Page.scss";
import { useHistory } from "react-router";
import { chevronBackOutline } from "ionicons/icons";

type FormData = {
  email1: string;
  password1: string;
};

const DoctorSignin: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const history = useHistory();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError("");

    try {
      const user = await authService.login1(data.email1, data.password1);

      if (user) {
        // Redirect based on user role
        switch (user.role) {
          case UserRole.Admin:
            history.push("/admin/dashboard");
            break;
          case UserRole.Doctor:
            history.push("/doc/dashboard");
            break;

          default:
            history.push("/doc/dashboard");
        }
      } else {
        setLoginError("Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="signin-content">
        {/* Background elements */}
        <div className="background-elements">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-bubble"
              initial={{ opacity: 0, y: 100 }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                y: [100, -100, 100],
                x: Math.random() * 100 - 50,
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                background: `rgba(${Math.random() * 100}, ${
                  Math.random() * 100 + 155
                }, 255, 0.2)`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 150 + 50}px`,
                height: `${Math.random() * 150 + 50}px`,
                borderRadius: `${Math.random() * 50 + 25}%`,
              }}
            />
          ))}
        </div>

        <IonButtons>
          <IonButton routerLink="/roleselect" className="signupback">
            <IonIcon icon={chevronBackOutline} />
            Back
          </IonButton>
        </IonButtons>

        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <IonGrid>
              <IonRow className="ion-justify-content-center">
                <IonCol size="12" sizeMd="8" sizeLg="6">
                  {/* Logo/Header */}
                  <motion.div
                    className="app-logo"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <div className="logo-circle">
                      <FiLogIn size={32} />
                    </div>
                    <IonText className="logo-text">HomeCare237</IonText>
                  </motion.div>

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
                        placeholder="Email"
                        {...register("email1", {
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.email1 && (
                      <span className="error-message">
                        {errors.email1.message}
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
                        placeholder="Password"
                        {...register("password1", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.password1 && (
                      <span className="error-message">
                        {errors.password1.message}
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
                      routerLink="/Doctor_password_recovery"
                    >
                      Forgot Password?
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
                          <IonSpinner name="crescent" className="spinner" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
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
                    <IonText>Don't have an account?</IonText>
                    <IonButton
                      fill="clear"
                      routerLink="/Doctor_signup"
                      className="signup-button2"
                    >
                      Sign Up
                    </IonButton>
                  </motion.div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </form>
        </motion.div>
      </IonContent>
    </IonPage>
  );
};

export default DoctorSignin;
