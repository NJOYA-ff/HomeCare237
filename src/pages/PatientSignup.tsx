import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  IonPage,
  IonContent,
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
  IonButton,
  IonIcon,
  IonButtons,
  IonToast,
  IonText,
} from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { db, auth, storage } from "../firebaseconfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiHome,
  FiMapPin,
  FiCamera,
} from "react-icons/fi";
import "./Page.scss";
import { IoPersonCircleOutline } from "react-icons/io5";
import { chevronBackOutline } from "ionicons/icons";
import { useHistory } from "react-router";

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

interface FirebaseError {
  code: string;
  message: string;
}

// Validation constants
const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
  },
  CONTACT: {
    MIN_LENGTH: 9,
    MAX_LENGTH: 15,
  },
  TOWN: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  STREET: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 100,
  },
  AGE: {
    MIN: 1,
    MAX: 120,
  },
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
  },
};

const PatientSignup: React.FC = () => {
  const history = useHistory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    setError,
    clearErrors,
    setValue,
    watch,
    trigger,
  } = useForm<FormData>({
    defaultValues: {
      profilePhoto: null,
    },
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    color: "success" as "success" | "danger" | "warning",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Register profilePhoto manually so we can keep a custom ref and onChange handler
  useEffect(() => {
    register("profilePhoto");
  }, [register]);

  const showToast = useCallback(
    (message: string, color: "success" | "danger" | "warning" = "success") => {
      setToast({ isOpen: true, message, color });
    },
    []
  );

  const uploadImageToStorage = async (
    file: File,
    userId: string
  ): Promise<string> => {
    try {
      const fileExtension = file.name.split(".").pop();
      const storageRef = ref(
        storage,
        `profilePhotos/${userId}/profile.${fileExtension}`
      );

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload profile photo");
    }
  };

  const createUserInFirestore = async (
    userId: string,
    userData: FormData,
    profilePhotoURL: string = ""
  ) => {
    try {
      const userDocRef = doc(collection(db, "patients"), userId);

      await setDoc(userDocRef, {
        userId: userId,
        userName: userData.userName.trim(),
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        age: Number(userData.age),
        sex: userData.sex,
        contact: userData.contact.trim(),
        town: userData.town.trim(),
        street: userData.street.trim(),
        profilePhoto: profilePhotoURL,
        role: "patient",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: false,
        isActive: true,
      });

      return userDocRef;
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
      throw new Error("Failed to create user profile");
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast(
          "Please select a valid image file (JPEG, PNG, etc.).",
          "danger"
        );
        return;
      }

      // Validate file size
      if (file.size > VALIDATION.FILE.MAX_SIZE) {
        showToast("Image size should be less than 5MB.", "danger");
        return;
      }

      try {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Create a DataTransfer object to properly create FileList
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        setValue("profilePhoto", dataTransfer.files);
        await trigger("profilePhoto");
      } catch (error) {
        showToast("Error processing image. Please try another file.", "danger");
      }
    } else {
      setValue("profilePhoto", null);
      setPreviewImage(null);
      await trigger("profilePhoto");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data: FormData) => {
    if (!isValid) {
      showToast("Please fix the form errors before submitting.", "warning");
      return;
    }

    setIsLoading(true);
    clearErrors();

    try {
      // 1. Create authentication account
      const userCredential: UserCredential =
        await createUserWithEmailAndPassword(
          auth,
          data.email.toLowerCase().trim(),
          data.password
        );

      const user = userCredential.user;

      // 2. Upload profile photo if exists
      let profilePhotoURL = "";
      if (data.profilePhoto && data.profilePhoto.length > 0) {
        const file = data.profilePhoto[0];
        profilePhotoURL = await uploadImageToStorage(file, user.uid);
      }

      // 3. Update auth profile
      await updateProfile(user, {
        displayName: data.name.trim(),
        photoURL: profilePhotoURL || undefined,
      });

      // 4. Create user document in Firestore
      await createUserInFirestore(user.uid, data, profilePhotoURL);

      // 5. Show success message and reset form
      showToast("Account created successfully! You can now sign in.");
      reset();
      setPreviewImage(null);

      console.log("User created successfully:", user.uid);

      // 6. Navigate to signin page after a short delay
      setTimeout(() => {
        history.push("/Patient_signin");
      }, 2000);
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Signup error:", firebaseError);

      // Handle specific Firebase errors
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          setError("email", {
            type: "manual",
            message:
              "This email is already registered. Please use a different email.",
          });
          showToast("This email is already registered.", "danger");
          break;
        case "auth/invalid-email":
          setError("email", {
            type: "manual",
            message: "Invalid email address format.",
          });
          showToast("Invalid email address format.", "danger");
          break;
        case "auth/weak-password":
          setError("password", {
            type: "manual",
            message: "Password is too weak. Please use at least 6 characters.",
          });
          showToast(
            "Password is too weak. Please use a stronger password.",
            "danger"
          );
          break;
        case "auth/network-request-failed":
          showToast(
            "Network error. Please check your internet connection.",
            "danger"
          );
          break;
        case "auth/operation-not-allowed":
          showToast(
            "Email/password accounts are not enabled. Please contact support.",
            "danger"
          );
          break;
        default:
          setError("root", {
            type: "manual",
            message: "An unexpected error occurred. Please try again.",
          });
          showToast(
            "An unexpected error occurred. Please try again.",
            "danger"
          );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    history.push("/roleselect2");
  };

  // Animation variants for better performance
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.1 + i * 0.05,
        duration: 0.3,
      },
    }),
  };

  return (
    <IonPage>
      <IonContent fullscreen className="signup-content">
        <IonToast
          isOpen={toast.isOpen}
          onDidDismiss={() => setToast((prev) => ({ ...prev, isOpen: false }))}
          message={toast.message}
          duration={4000}
          color={toast.color}
          position="top"
        />

        {/* Background elements */}
        <div className="background-elements">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-circle"
              initial={{ opacity: 0, y: 100 }}
              animate={{
                opacity: [0.1, 0.25, 0.1],
                y: [100, -80, 100],
                x: Math.random() * 80 - 40,
              }}
              transition={{
                duration: 18 + Math.random() * 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                background: `rgba(${Math.random() * 80}, ${
                  Math.random() * 80 + 175
                }, 255, 0.15)`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 150 + 80}px`,
                height: `${Math.random() * 150 + 80}px`,
              }}
            />
          ))}
        </div>

        <IonButtons>
          <IonButton onClick={goBack} className="signupback">
            <IonIcon icon={chevronBackOutline} />
            Back
          </IonButton>
        </IonButtons>

        <motion.div
          className="form-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <IonGrid>
              <IonRow className="ion-justify-content-center">
                <IonCol size="12" sizeMd="8" sizeLg="6">
                  {/* Profile Photo */}
                  <motion.div className="photo-upload-container">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      style={{ display: "none" }}
                    />

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
                    {errors.profilePhoto && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.profilePhoto.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Username */}
                  <motion.div custom={1} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
                      <IoPersonCircleOutline className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Username"
                        {...register("userName", {
                          required: "Username is required",
                          minLength: {
                            value: VALIDATION.USERNAME.MIN_LENGTH,
                            message: `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters`,
                          },
                          maxLength: {
                            value: VALIDATION.USERNAME.MAX_LENGTH,
                            message: `Username must be less than ${VALIDATION.USERNAME.MAX_LENGTH} characters`,
                          },
                          pattern: {
                            value: /^[a-zA-Z0-9_]+$/,
                            message:
                              "Username can only contain letters, numbers, and underscores",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.userName && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.userName.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Name */}
                  <motion.div custom={2} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
                      <FiUser className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Full Name"
                        {...register("name", {
                          required: "Name is required",
                          minLength: {
                            value: VALIDATION.NAME.MIN_LENGTH,
                            message: `Name must be at least ${VALIDATION.NAME.MIN_LENGTH} characters`,
                          },
                          maxLength: {
                            value: VALIDATION.NAME.MAX_LENGTH,
                            message: `Name must be less than ${VALIDATION.NAME.MAX_LENGTH} characters`,
                          },
                          pattern: {
                            value: /^[a-zA-Z\s]+$/,
                            message: "Name can only contain letters and spaces",
                          },
                        })}
                      />
                    </IonItem>
                    {errors.name && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.name.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Email */}
                  <motion.div custom={3} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
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
                      <IonText color="danger" className="error-text">
                        <p>{errors.email.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Age and Sex */}
                  <motion.div custom={4} variants={itemVariants}>
                    <IonGrid className="compact-grid">
                      <IonRow>
                        <IonCol size="6">
                          <IonItem className="form-item" lines="full">
                            <IonInput
                              type="number"
                              placeholder="Age"
                              {...register("age", {
                                required: "Age is required",
                                min: {
                                  value: VALIDATION.AGE.MIN,
                                  message: `Age must be at least ${VALIDATION.AGE.MIN}`,
                                },
                                max: {
                                  value: VALIDATION.AGE.MAX,
                                  message: `Age must be less than ${VALIDATION.AGE.MAX}`,
                                },
                                valueAsNumber: true,
                              })}
                            />
                          </IonItem>
                          {errors.age && (
                            <IonText color="danger" className="error-text">
                              <p>{errors.age.message}</p>
                            </IonText>
                          )}
                        </IonCol>
                        <IonCol size="6">
                          <IonItem className="form-item" lines="full">
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
                              <IonSelectOption value="prefer-not-to-say">
                                Prefer not to say
                              </IonSelectOption>
                            </IonSelect>
                          </IonItem>
                          {errors.sex && (
                            <IonText color="danger" className="error-text">
                              <p>{errors.sex.message}</p>
                            </IonText>
                          )}
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </motion.div>

                  {/* Password */}
                  <motion.div custom={5} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
                      <FiLock className="input-icon" />
                      <IonInput
                        type="password"
                        placeholder="Password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: VALIDATION.PASSWORD.MIN_LENGTH,
                            message: `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`,
                          },
                        })}
                      />
                    </IonItem>
                    {errors.password && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.password.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Contact */}
                  <motion.div custom={6} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
                      <FiPhone className="input-icon" />
                      <IonInput
                        type="tel"
                        placeholder="Phone Number"
                        {...register("contact", {
                          required: "Contact number is required",
                          pattern: {
                            value: /^[0-9+\-\s()]{9,15}$/,
                            message: "Invalid phone number format",
                          },
                          minLength: {
                            value: VALIDATION.CONTACT.MIN_LENGTH,
                            message: `Phone number must be at least ${VALIDATION.CONTACT.MIN_LENGTH} digits`,
                          },
                          maxLength: {
                            value: VALIDATION.CONTACT.MAX_LENGTH,
                            message: `Phone number must be less than ${VALIDATION.CONTACT.MAX_LENGTH} digits`,
                          },
                        })}
                      />
                    </IonItem>
                    {errors.contact && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.contact.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Town */}
                  <motion.div custom={7} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
                      <FiMapPin className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Town/City"
                        {...register("town", {
                          required: "Town is required",
                          minLength: {
                            value: VALIDATION.TOWN.MIN_LENGTH,
                            message: `Town name must be at least ${VALIDATION.TOWN.MIN_LENGTH} characters`,
                          },
                          maxLength: {
                            value: VALIDATION.TOWN.MAX_LENGTH,
                            message: `Town name must be less than ${VALIDATION.TOWN.MAX_LENGTH} characters`,
                          },
                        })}
                      />
                    </IonItem>
                    {errors.town && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.town.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Street */}
                  <motion.div custom={8} variants={itemVariants}>
                    <IonItem className="form-item" lines="full">
                      <FiHome className="input-icon" />
                      <IonInput
                        type="text"
                        placeholder="Street Address"
                        {...register("street", {
                          required: "Street address is required",
                          minLength: {
                            value: VALIDATION.STREET.MIN_LENGTH,
                            message: `Street address must be at least ${VALIDATION.STREET.MIN_LENGTH} characters`,
                          },
                          maxLength: {
                            value: VALIDATION.STREET.MAX_LENGTH,
                            message: `Street address must be less than ${VALIDATION.STREET.MAX_LENGTH} characters`,
                          },
                        })}
                      />
                    </IonItem>
                    {errors.street && (
                      <IonText color="danger" className="error-text">
                        <p>{errors.street.message}</p>
                      </IonText>
                    )}
                  </motion.div>

                  {/* Root error */}
                  {errors.root && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="error-message root-error"
                    >
                      <IonText color="danger">
                        <p>{errors.root.message}</p>
                      </IonText>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.div
                    className="submit-container"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    custom={9}
                    variants={itemVariants}
                  >
                    <IonButton
                      type="submit"
                      expand="block"
                      className="submit-button"
                      disabled={isLoading || !isValid}
                    >
                      {isLoading ? (
                        <>
                          <IonSpinner name="crescent" className="spinner" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
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

export default PatientSignup;
