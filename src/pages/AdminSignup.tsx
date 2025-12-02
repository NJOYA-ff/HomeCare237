import React, { useState, useRef } from "react";
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
  IonSelect,
  IonSelectOption,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonToast,
} from "@ionic/react";
import { motion } from "framer-motion";
import {
  doc,
  setDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useForm } from "react-hook-form";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiHome,
  FiMapPin,
  FiCamera,
} from "react-icons/fi";
import { auth, db, storage } from "../firebaseconfig"; // Adjust path to your firebase config
import "./Page.scss";

type FormData = {
  profilePhoto: FileList | null;
  userName: string;
  name: string;
  email: string;
  age: number;
  sex: string;
  password: string;
  contact: string;
  town: string;
  street: string;
};

const AdminSignup: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    color: "success",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, color: string = "success") => {
    setToast({ isOpen: true, message, color });
  };

  // Check if username already exists
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const usersRef = collection(db, "admins");
    const q = query(usersRef, where("userName", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file: File, userId: string): Promise<string> => {
    const storageRef = ref(storage, `admin-profiles/${userId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      // Check if username already exists
      const usernameExists = await checkUsernameExists(data.userName);
      if (usernameExists) {
        setError("userName", {
          type: "manual",
          message: "Username already exists",
        });
        setIsLoading(false);
        return;
      }

      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const user = userCredential.user;
      let photoURL = "";

      // Upload profile photo if exists
      if (data.profilePhoto && data.profilePhoto[0]) {
        photoURL = await uploadImage(data.profilePhoto[0], user.uid);
      }

      // Update user profile
      await updateProfile(user, {
        displayName: data.name,
        photoURL: photoURL,
      });

      // Save additional user data to Firestore
      const userData = {
        uid: user.uid,
        userName: data.userName.toLowerCase(),
        name: data.name,
        email: data.email,
        age: data.age,
        sex: data.sex,
        contact: data.contact,
        town: data.town,
        street: data.street,
        profilePhoto: photoURL,
        role: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "admins", user.uid), userData);

      showToast("Admin account created successfully!");
      reset();
      setPreviewImage(null);
    } catch (error: any) {
      console.error("Error creating admin account:", error);

      let errorMessage = "Failed to create account. Please try again.";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email is already in use.";
          setError("email", { type: "manual", message: errorMessage });
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak.";
          setError("password", { type: "manual", message: errorMessage });
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          setError("email", { type: "manual", message: errorMessage });
          break;
        default:
          errorMessage = error.message || "An unexpected error occurred.";
      }

      showToast(errorMessage, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file", "danger");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size should be less than 5MB", "danger");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <IonPage>
      <IonContent fullscreen className="signup-content">
        {/* Background elements */}
        <div className="background-elements">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-circle"
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
                width: `${Math.random() * 200 + 100}px`,
                height: `${Math.random() * 200 + 100}px`,
              }}
            />
          ))}
        </div>

        <IonHeader class="ion-no-border">
          <IonToolbar className="header-toolbar">
            <IonTitle className="header-title">Create Admin Account</IonTitle>
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
                  {/* Profile Photo */}
                  <motion.div
                    className="photo-upload-container"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      style={{ display: "none" }}
                      {...register("profilePhoto")}
                    /> */}
                    <IonAvatar
                      className="profile-avatar"
                      onClick={triggerFileInput}
                    >
                      {previewImage ? (
                        <img src={previewImage} alt="Profile preview" />
                      ) : (
                        <div className="avatar-placeholder">
                          <FiCamera size={32} />
                        </div>
                      )}
                    </IonAvatar>
                    <IonLabel className="photo-label">
                      Tap to add photo
                    </IonLabel>
                  </motion.div>

                  {/* Username */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <IonItem className="form-item">
                      <FiUser className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Username"
                        {...register("userName", {
                          required: "Username is required",
                          minLength: {
                            value: 3,
                            message: "Username must be at least 3 characters",
                          },
                          pattern: {
                            value: /^[a-zA-Z0-9_]+$/,
                            message:
                              "Username can only contain letters, numbers and underscores",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.userName && (
                      <span className="error-message">
                        {errors.userName.message}
                      </span>
                    )}
                  </motion.div>

                  {/* Name */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <IonItem className="form-item">
                      <FiUser className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Full Name"
                        {...register("name", {
                          required: "Name is required",
                          minLength: {
                            value: 2,
                            message: "Name must be at least 2 characters",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.name && (
                      <span className="error-message">
                        {errors.name.message}
                      </span>
                    )}
                  </motion.div>

                  {/* Email */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
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

                  {/* Age and Sex */}
                  <motion.div
                    className="row-fields"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <IonGrid>
                      <IonRow>
                        <IonCol size="6">
                          <IonItem className="form-item">
                            <IonInput
                              type="number"
                              placeholder="Age"
                              {...register("age", {
                                required: "Age is required",
                                min: {
                                  value: 18,
                                  message: "Must be at least 18 years old",
                                },
                                max: {
                                  value: 100,
                                  message: "Age must be reasonable",
                                },
                              })}
                            />
                          </IonItem>
                          {errors.age && (
                            <span className="error-message">
                              {errors.age.message}
                            </span>
                          )}
                        </IonCol>
                        <IonCol size="6">
                          <IonItem className="form-item">
                            <IonSelect
                              placeholder="Sex"
                              interface="popover"
                              {...register("sex", {
                                required: "Sex is required",
                              })}
                            >
                              <IonSelectOption value="male">
                                Male
                              </IonSelectOption>
                              <IonSelectOption value="female">
                                Female
                              </IonSelectOption>
                              <IonSelectOption value="other">
                                Other
                              </IonSelectOption>
                            </IonSelect>
                          </IonItem>
                          {errors.sex && (
                            <span className="error-message">
                              {errors.sex.message}
                            </span>
                          )}
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <IonItem className="form-item">
                      <FiLock className="input-icon" />
                      <IonInput
                        type="password"
                        placeholder="Password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                          },
                          pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message:
                              "Password must contain at least one uppercase letter, one lowercase letter, and one number",
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

                  {/* Contact */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <IonItem className="form-item">
                      <FiPhone className="input-icon" />
                      <IonInput
                        type="tel"
                        placeholder="Phone Number"
                        {...register("contact", {
                          required: "Contact number is required",
                          pattern: {
                            value: /^[0-9]{9,15}$/,
                            message: "Invalid phone number",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.contact && (
                      <span className="error-message">
                        {errors.contact.message}
                      </span>
                    )}
                  </motion.div>

                  {/* Town */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <IonItem className="form-item">
                      <FiMapPin className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Town/City"
                        {...register("town", {
                          required: "Town is required",
                          minLength: {
                            value: 2,
                            message: "Town name must be at least 2 characters",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.town && (
                      <span className="error-message">
                        {errors.town.message}
                      </span>
                    )}
                  </motion.div>

                  {/* Street */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <IonItem className="form-item">
                      <FiHome className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Street Address"
                        {...register("street", {
                          required: "Street address is required",
                          minLength: {
                            value: 5,
                            message:
                              "Street address must be at least 5 characters",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.street && (
                      <span className="error-message">
                        {errors.street.message}
                      </span>
                    )}
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    className="submit-container"
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
                          Creating Account...
                        </>
                      ) : (
                        "Create Admin Account"
                      )}
                    </IonButton>
                  </motion.div>
                </IonCol>
              </IonRow>
            </IonGrid>
          </form>
        </motion.div>

        {/* Toast for notifications */}
        <IonToast
          isOpen={toast.isOpen}
          onDidDismiss={() => setToast({ ...toast, isOpen: false })}
          message={toast.message}
          duration={4000}
          color={toast.color as any}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminSignup;
