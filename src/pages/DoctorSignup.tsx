import LoadingHelix from "../components/LoadingHelix";
import AuthShell from "../components/AuthShell";
import { useSettings } from "../context/SettingsContext";
import React, { useState, useRef } from "react";
import {
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
  IonTextarea,
  IonToast,
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
import { db, auth, storage } from "../firebaseconfig";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useHistory } from "react-router";
import { authService, UserRole } from "../App";
import { getGoogleSignInErrorMessage } from "../utils/authErrors";
import { authBackLabel, authBackTarget, roleLabel } from "../utils/authFlow";

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    color: "success" as "success" | "danger" | "warning",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Declared before the helpers below: they close over `t` to render Firebase
  // failures and toasts in the chosen language.
  const { t } = useSettings();

  // Register profilePhoto once so we can merge the onChange/ref handlers with our custom handler
  const profilePhotoRegister = register("profilePhoto");

  const showToast = (
    message: string,
    color: "success" | "danger" | "warning" = "success",
  ) => {
    setToast({ isOpen: true, message, color });
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const user = await authService.loginWithGoogle(UserRole.Doctor);
      if (user) {
        history.push("/doc/dashboard");
      }
    } catch (err: unknown) {
      // Same treatment as the signin pages: a cancelled popup is silent, and
      // any other failure shows mapped copy instead of the raw SDK string.
      const message = getGoogleSignInErrorMessage(err);
      if (message) showToast(message, "danger");
      setIsGoogleLoading(false);
    }
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
      throw new Error(t("err_profile_image_upload"));
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
        isEnabled: true,
        status: "pending",
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
      throw new Error(t("err_save_doctor_info"));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (data.password !== data.confirmPassword) {
      showToast(t("err_passwords_dont_match_try"), "danger");
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
      showToast(t("err_doctor_registered"));

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
      let errorMessage = t("err_registration_failed");

      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          errorMessage = t("err_email_already_registered");
          break;
        case "auth/invalid-email":
          errorMessage = t("err_email_invalid");
          break;
        case "auth/weak-password":
          errorMessage = t("err_password_too_weak");
          break;
        case "auth/network-request-failed":
          errorMessage = t("err_network_short");
          break;
        case "auth/operation-not-allowed":
          errorMessage = t("err_accounts_disabled");
          break;
        default:
          errorMessage = firebaseError.message || t("err_registration_failed");
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
        showToast(t("err_invalid_image_type"), "danger");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast(t("err_image_too_large"), "danger");
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

  /**
   * Specialization options.
   *
   * `value` is the canonical English string persisted to Firestore (and matched
   * against existing doctor records), so it must never be translated. `labelKey`
   * points at the translated label shown in the picker, so a French-speaking
   * doctor sees "Cardiologue" while the document still stores "Cardiologist".
   */
  const specializations: { value: string; labelKey: string }[] = [
    { value: "General Practitioner", labelKey: "spec_general_practitioner" },
    { value: "Cardiologist", labelKey: "spec_cardiologist" },
    { value: "Pediatrician", labelKey: "spec_pediatrician" },
    { value: "Dermatologist", labelKey: "spec_dermatologist" },
    { value: "Gynecologist", labelKey: "spec_gynecologist" },
    { value: "Orthopedic Surgeon", labelKey: "spec_orthopedic_surgeon" },
    { value: "Neurologist", labelKey: "spec_neurologist" },
    { value: "Psychiatrist", labelKey: "spec_psychiatrist" },
    { value: "Dentist", labelKey: "spec_dentist" },
    { value: "Ophthalmologist", labelKey: "spec_ophthalmologist" },
    { value: "ENT Specialist", labelKey: "spec_ent_specialist" },
    { value: "Urologist", labelKey: "spec_urologist" },
    { value: "Endocrinologist", labelKey: "spec_endocrinologist" },
    { value: "Gastroenterologist", labelKey: "spec_gastroenterologist" },
    { value: "Oncologist", labelKey: "spec_oncologist" },
    { value: "Rheumatologist", labelKey: "spec_rheumatologist" },
    { value: "Pulmonologist", labelKey: "spec_pulmonologist" },
    { value: "Nephrologist", labelKey: "spec_nephrologist" },
    { value: "Allergist", labelKey: "spec_allergist" },
    { value: "Physiotherapist", labelKey: "spec_physiotherapist" },
  ];

  return (
    <AuthShell
      backHref={authBackTarget("doctor", "signup")}
      backLabel={authBackLabel("doctor", "signup", t)}
      eyebrow={roleLabel("doctor", t)}
      title={t("funnel_join_as_doctor")}
      subtitle={t("funnel_doctor_review_note")}
      overlay={
        <IonToast
        isOpen={toast.isOpen}
        onDidDismiss={() => setToast((prev) => ({ ...prev, isOpen: false }))}
        message={toast.message}
        duration={4000}
        color={toast.color}
        position="top"
        />
      }
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
                  }
                }  onChange={(e) => {
                    handleImageChange(
                      e as React.ChangeEvent<HTMLInputElement>,
                    );
                    if (
                      typeof profilePhotoRegister.onChange === "function"
                    ) {
                      profilePhotoRegister.onChange(e);
                    }
                  }
                }  onBlur={(e) => {
                    if (typeof profilePhotoRegister.onBlur === "function") {
                      profilePhotoRegister.onBlur(e);
                    }
                  }
                }  name={profilePhotoRegister.name}
                />
                <IonAvatar
                  className="profile-avatar"
                  onClick={triggerFileInput}
                >
                  {previewImage ? (
                    <img src={previewImage} alt={t("err_profile_photo_alt")} />
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
                      placeholder={t("field_username")}
                      {...register("userName", {
                        required: t("err_username_required"),
                        minLength: {
                          value: 3,
                          message: t("err_min_chars", { min: 3 }),
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
                      placeholder={t("field_full_name")}
                      {...register("name", {
                        required: t("err_name_required"),
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
                            placeholder={t("field_age")}
                            {...register("age", {
                              required: t("err_age_required"),
                              min: {
                                value: 23,
                                message: t("err_age_min_23"),
                              },
                              max: {
                                value: 100,
                                message: t("err_age_max_under", { max: 100 }),
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
                            placeholder={t("field_sex")}
                            interface="popover"
                            {...register("sex", {
                              required: t("err_sex_required"),
                            })}
                          >
                            <IonSelectOption value="male">
                              {t("sex_male")}
                            </IonSelectOption>
                            <IonSelectOption value="female">
                              {t("sex_female")}
                            </IonSelectOption>
                            <IonSelectOption value="other">
                              {t("sex_other")}
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
                      placeholder={t("field_password")}
                      {...register("password", {
                        required: t("err_password_required"),
                        minLength: {
                          value: 8,
                          message: t("err_password_min_8"),
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
                      placeholder={t("field_confirm_password")}
                      {...register("confirmPassword", {
                        required: t("err_confirm_password"),
                        validate: (value) =>
                          value === watch("password") ||
                          t("err_passwords_dont_match"),
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
                      placeholder={t("field_phone")}
                      {...register("contact", {
                        required: t("err_phone_required"),
                        pattern: {
                          value: /^[0-9]{9,15}$/,
                          message: t("err_phone_invalid"),
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
                      placeholder={t("field_town")}
                      {...register("town", {
                        required: t("err_town_required"),
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
                      placeholder={t("field_street")}
                      {...register("street", {
                        required: t("err_street_required"),
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
                      placeholder={t("spec_choose")}
                      interface="popover"
                      {...register("specialization", {
                        required: t("err_specialization_required"),
                      })}
                    >
                      {specializations.map((spec) => (
                        <IonSelectOption key={spec.value} value={spec.value}>
                          {t(spec.labelKey)}
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
                      placeholder={t("field_medical_license")}
                      {...register("licenseNumber", {
                        required: t("err_license_required"),
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
                      placeholder={t("field_experience")}
                      {...register("yearsOfExperience", {
                        required: t("err_experience_required"),
                        min: {
                          value: 0,
                          message: t("err_cannot_be_negative"),
                        },
                        max: {
                          value: 60,
                          message: t("err_experience_invalid"),
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
                      placeholder={t("field_hospital")}
                      {...register("hospital", {
                        required: t("err_hospital_required"),
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
                      placeholder={t("field_fee")}
                      {...register("consultationFee", {
                        required: t("err_fee_required"),
                        min: {
                          value: 0,
                          message: t("err_fee_negative"),
                        },
                        max: {
                          value: 1000,
                          message: t("err_fee_too_high"),
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
                      placeholder={t("field_available_slots")}
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
                      placeholder={t("signup_qualifications_placeholder")}
                      {...register("qualifications", {
                        required: t("err_qualifications_required"),
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
                      placeholder={t("field_bio")}
                      rows={3}
                      {...register("bio", {
                        required: t("err_bio_required"),
                        minLength: {
                          value: 50,
                          message: t("err_bio_min_chars", { min: 50 }),
                        },
                        maxLength: {
                          value: 1000,
                          message: t("err_bio_max_chars", { max: 1000 }),
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
                      <LoadingHelix className="spinner" size={18} color="white" />
                      {t("signup_registering_doctor")}
                    </>
                  ) : (
                    t("signup_complete_registration")
                  )}
                </IonButton>
              </motion.div>

              {/* Google Sign-Up */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="or-divider"><span>{t("funnel_or_signup_with")}</span></div>
                <IonButton
                  expand="block"
                  fill="outline"
                  className="google-signin-btn"
                  disabled={isGoogleLoading}
                  onClick={handleGoogleSignup}
                >
                  {isGoogleLoading ? (
                    <LoadingHelix />
                  ) : (
                    <>
                      <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt={t("signup_continue_google")}
                        className="google-icon"
                      />
                      Continue with Google
                    </>
                  )}
                </IonButton>
              </motion.div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </form>

    </AuthShell>
  );
};

export default DoctorSignup;
