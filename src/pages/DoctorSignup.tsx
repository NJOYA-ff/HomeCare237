import React, { useState, useRef } from "react";
import {
  IonPage,
  IonContent,
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
  IonButtons,
  IonIcon,
  IonTextarea,
  IonToast,
  IonHeader,
  IonToolbar,
} from "@ionic/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiHome,
  FiMapPin,
  FiCamera,
  FiClock,
  FiBriefcase,
  FiAward,
  FiBook,
} from "react-icons/fi";
import "./Page.scss";
import { chevronBackOutline } from "ionicons/icons";
import { db, auth, storage } from "../firebaseconfig";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useHistory } from "react-router";

type FormData = {
  profilePhoto: FileList | null;
  userName: string;
  name: string;
  email: string;
  age: number;
  sex: string;
  password: string;
  confirmPassword: string;
  contact: string;
  town: string;
  street: string;
  // Doctor-specific fields
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  qualifications: string;
  hospital: string;
  consultationFee: number;
  bio: string;
  // Comma-separated slots input (e.g. "09:00,10:00,11:00")
  availableSlotsInput?: string;
};

interface FirebaseError {
  code: string;
  message: string;
}

const DoctorSignup: React.FC = () => {
  const history = useHistory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    trigger,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      profilePhoto: null,
    },
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    color: "success" as "success" | "danger" | "warning",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Register profilePhoto once so we can merge the onChange/ref handlers with our custom handler
  const profilePhotoRegister = register("profilePhoto");

  const showToast = (
    message: string,
    color: "success" | "danger" | "warning" = "success",
  ) => {
    setToast({ isOpen: true, message, color });
  };

  const uploadImageToStorage = async (
    file: File,
    userId: string,
  ): Promise<string> => {
    try {
      // Create a unique file name
      const fileExtension = file.name.split(".").pop();
      const fileName = `doctors/${userId}/profile.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload profile image");
    }
  };

  const saveDoctorDataToFirestore = async (
    userId: string,
    data: any,
    profilePhotoURL?: string,
  ) => {
    try {
      const doctorData = {
        ...data,
        profilePhoto: profilePhotoURL || null,
        role: "doctor",
        isVerified: false, // Admin can verify doctors later
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Save to doctors collection
      await setDoc(doc(db, "doctors", userId), doctorData);

      // Also save to users collection for easy querying
      await setDoc(doc(db, "users", userId), {
        ...doctorData,
        userType: "doctor",
      });
    } catch (error) {
      console.error("Error saving doctor data:", error);
      throw new Error("Failed to save doctor information");
    }
  };

  const onSubmit = async (data: FormData) => {
    if (data.password !== data.confirmPassword) {
      showToast("Passwords do not match. Please try again.", "danger");
      return;
    }
    setIsLoading(true);

    try {
      // 1. Create authentication account
      const userCredential: UserCredential =
        await createUserWithEmailAndPassword(auth, data.email, data.password);

      const user = userCredential.user;

      // 2. Update user profile with display name
      await updateProfile(user, {
        displayName: data.name,
      });

      // 3. Upload profile photo if selected
      let profilePhotoURL = "";
      if (selectedFile) {
        profilePhotoURL = await uploadImageToStorage(selectedFile, user.uid);
      }

      // 4. Prepare doctor data for Firestore
      const doctorData = {
        userName: data.userName,
        name: data.name,
        email: data.email,
        age: Number(data.age),
        sex: data.sex,
        contact: data.contact,
        town: data.town,
        street: data.street,
        specialization: data.specialization,
        licenseNumber: data.licenseNumber,
        yearsOfExperience: Number(data.yearsOfExperience),
        qualifications: data.qualifications,
        hospital: data.hospital,
        consultationFee: Number(data.consultationFee),
        bio: data.bio,
        // parse available slots into array, trim and remove empty entries
        availableSlots: (data.availableSlotsInput || "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      };

      // 5. Save doctor data to Firestore
      await saveDoctorDataToFirestore(user.uid, doctorData, profilePhotoURL);

      // 6. Show success message
      showToast("Doctor registration completed successfully!");

      // 7. Reset form
      reset();
      setPreviewImage(null);
      setSelectedFile(null);

      // 8. Navigate to signin page after a short delay
      setTimeout(() => {
        history.push("/Doctor_signin");
      }, 2000);
    } catch (error: any) {
      console.error("Registration error:", error);
      const firebaseError = error as FirebaseError;

      // Handle specific Firebase auth errors
      let errorMessage = "Registration failed. Please try again.";

      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection.";
          break;
        default:
          errorMessage = firebaseError.message || "Registration failed.";
      }

      showToast(errorMessage, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "danger");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size should be less than 5MB.", "danger");
        return;
      }

      setSelectedFile(file);

      // Create a DataTransfer object to properly create FileList
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      setValue("profilePhoto", dataTransfer.files);
      await trigger("profilePhoto");

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setValue("profilePhoto", null);
      setSelectedFile(null);
      setPreviewImage(null);
      await trigger("profilePhoto");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const goBack = () => {
    history.push("/roleselect2");
  };

  const specializations = [
    "General Practitioner",
    "Cardiologist",
    "Pediatrician",
    "Dermatologist",
    "Gynecologist",
    "Orthopedic Surgeon",
    "Neurologist",
    "Psychiatrist",
    "Dentist",
    "Ophthalmologist",
    "ENT Specialist",
    "Urologist",
    "Endocrinologist",
    "Gastroenterologist",
    "Oncologist",
    "Rheumatologist",
    "Pulmonologist",
    "Nephrologist",
    "Allergist",
    "Physiotherapist",
  ];

  return (
    <IonPage>
      <IonHeader class="ion-no-border">
        <IonToolbar className="signuptoolbar">
          {" "}
          <IonButtons>
            <IonButton onClick={goBack} className="signupback">
              <IonIcon icon={chevronBackOutline} />
              Back
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="signup-content">
        {/* Toast for notifications */}
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
                  <motion.div className="photo-upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      ref={(el) => {
                        // attach to local ref for triggering and to RHF ref
                        fileInputRef.current = el;
                        if (typeof profilePhotoRegister.ref === "function") {
                          profilePhotoRegister.ref(el);
                        } else if (profilePhotoRegister.ref) {
                          (
                            profilePhotoRegister.ref as React.MutableRefObject<HTMLInputElement | null>
                          ).current = el;
                        }
                      }}
                      onChange={(e) => {
                        handleImageChange(
                          e as React.ChangeEvent<HTMLInputElement>,
                        );
                        if (
                          typeof profilePhotoRegister.onChange === "function"
                        ) {
                          profilePhotoRegister.onChange(e);
                        }
                      }}
                      onBlur={(e) => {
                        if (typeof profilePhotoRegister.onBlur === "function") {
                          profilePhotoRegister.onBlur(e);
                        }
                      }}
                      name={profilePhotoRegister.name}
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
                      Professional Photo
                    </IonLabel>
                  </motion.div>

                  {/* Basic Information Section */}
                  <div className="form-section">
                    <IonLabel className="section-label">
                      Basic Information
                    </IonLabel>

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
                                    value: 23,
                                    message: "Must be at least 23 years old",
                                  },
                                  max: {
                                    value: 100,
                                    message: "Please enter a valid age",
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
                          })}
                        />
                      </IonItem>
                      {errors.password && (
                        <span className="error-message">
                          {errors.password.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Confirm Password */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <IonItem className="form-item">
                        <FiLock className="input-icon" />
                        <IonInput
                          type="password"
                          placeholder="Confirm Password"
                          {...register("confirmPassword", {
                            required: "Please confirm your password",
                            validate: (value) =>
                              value === watch("password") ||
                              "Passwords do not match",
                          })}
                        />
                      </IonItem>
                      {errors.confirmPassword && (
                        <span className="error-message">
                          {errors.confirmPassword.message}
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
                          })}
                        />
                      </IonItem>
                      {errors.street && (
                        <span className="error-message">
                          {errors.street.message}
                        </span>
                      )}
                    </motion.div>
                  </div>

                  {/* Professional Information Section */}
                  <div className="form-section">
                    <IonLabel className="section-label">
                      Professional Information
                    </IonLabel>

                    {/* Specialization */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <IonItem className="form-item">
                        <FiBriefcase className="input-icon" />
                        <IonSelect
                          placeholder="Specialization"
                          interface="popover"
                          {...register("specialization", {
                            required: "Specialization is required",
                          })}
                        >
                          {specializations.map((spec) => (
                            <IonSelectOption key={spec} value={spec}>
                              {spec}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      {errors.specialization && (
                        <span className="error-message">
                          {errors.specialization.message}
                        </span>
                      )}
                    </motion.div>

                    {/* License Number */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 }}
                    >
                      <IonItem className="form-item">
                        <FiAward className="input-icon" />
                        <IonInput
                          type="text"
                          placeholder="Medical License Number"
                          {...register("licenseNumber", {
                            required: "License number is required",
                          })}
                        />
                      </IonItem>
                      {errors.licenseNumber && (
                        <span className="error-message">
                          {errors.licenseNumber.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Years of Experience */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <IonItem className="form-item">
                        <FiBook className="input-icon" />
                        <IonInput
                          type="number"
                          placeholder="Years of Experience"
                          {...register("yearsOfExperience", {
                            required: "Years of experience is required",
                            min: {
                              value: 0,
                              message: "Cannot be negative",
                            },
                            max: {
                              value: 60,
                              message: "Please enter valid years of experience",
                            },
                          })}
                        />
                      </IonItem>
                      {errors.yearsOfExperience && (
                        <span className="error-message">
                          {errors.yearsOfExperience.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Hospital/Clinic */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 }}
                    >
                      <IonItem className="form-item">
                        <FiHome className="input-icon" />
                        <IonInput
                          type="text"
                          placeholder="Hospital/Clinic Name"
                          {...register("hospital", {
                            required: "Hospital/Clinic name is required",
                          })}
                        />
                      </IonItem>
                      {errors.hospital && (
                        <span className="error-message">
                          {errors.hospital.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Consultation Fee */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <IonItem className="form-item">
                        <IonInput
                          type="number"
                          placeholder="Consultation Fee (XAF)"
                          {...register("consultationFee", {
                            required: "Consultation fee is required",
                            min: {
                              value: 0,
                              message: "Fee cannot be negative",
                            },
                            max: {
                              value: 1000,
                              message: "Fee seems too high",
                            },
                          })}
                        />
                      </IonItem>
                      {errors.consultationFee && (
                        <span className="error-message">
                          {errors.consultationFee.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Available Slots (comma separated) */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.72 }}
                    >
                      <IonItem className="form-item">
                        <FiClock className="input-icon" />
                        <IonInput
                          type="text"
                          placeholder="Available slots (e.g. 09:00,10:00,14:00)"
                          {...register("availableSlotsInput")}
                        />
                      </IonItem>
                      <small className="hint">
                        Enter comma-separated times in 24-hour HH:MM format.
                      </small>
                    </motion.div>

                    {/* Qualifications */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75 }}
                    >
                      <IonItem className="form-item">
                        <FiAward className="input-icon" />
                        <IonInput
                          type="text"
                          placeholder="Qualifications (e.g., MD, MBBS)"
                          {...register("qualifications", {
                            required: "Qualifications are required",
                          })}
                        />
                      </IonItem>
                      {errors.qualifications && (
                        <span className="error-message">
                          {errors.qualifications.message}
                        </span>
                      )}
                    </motion.div>

                    {/* Bio */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <IonItem className="form-item">
                        <IonTextarea
                          placeholder="Professional Bio"
                          rows={3}
                          {...register("bio", {
                            required: "Bio is required",
                            minLength: {
                              value: 50,
                              message: "Bio must be at least 50 characters",
                            },
                            maxLength: {
                              value: 1000,
                              message: "Bio must be less than 1000 characters",
                            },
                          })}
                        />
                      </IonItem>
                      {errors.bio && (
                        <span className="error-message">
                          {errors.bio.message}
                        </span>
                      )}
                    </motion.div>
                  </div>

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
                          Registering Doctor...
                        </>
                      ) : (
                        "Complete Registration"
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

export default DoctorSignup;
