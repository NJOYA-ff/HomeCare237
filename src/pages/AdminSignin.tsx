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
} from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import "./Page.scss";

type FormData = {
  email: string;
  password: string;
};

const AdminSignin: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError("");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate error for demo purposes (remove in production)
    if (data.email === "error@example.com") {
      setLoginError("Invalid credentials. Please try again.");
      setIsLoading(false);
      return;
    }

    console.log("Form submitted:", data);
    setIsLoading(false);
    reset();
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

        <IonHeader class="ion-no-border">
          <IonToolbar className="header-toolbar">
            <IonTitle className="header-title">Welcome Back</IonTitle>
          </IonToolbar>
        </IonHeader>

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
                    <IonText className="logo-text">HomeCare Cameroon</IonText>
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
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
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
                      routerLink="/Admin_signup"
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

export default AdminSignin;
