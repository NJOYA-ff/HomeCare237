import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  isBiometricEnabled,
  isPinEnabled,
  setBiometricEnabled as setBiometricEnabledPref,
} from "../utils/BiometricAuthService";

export type Language = "en" | "fr";
export type DarkMode = "system" | "light" | "dark";

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /**
   * Translate `key` into the active language, substituting any `{name}` slots.
   * @see SettingsProvider's `t` for the interpolation rules.
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  fontSize: "small" | "medium" | "large";
  setFontSize: (s: "small" | "medium" | "large") => void;
  // Appearance
  darkMode: DarkMode;
  setDarkMode: (mode: DarkMode) => void;
  /** True when the effective theme is dark (regardless of system/manual) */
  isDark: boolean;
  // Security
  biometricEnabled: boolean;
  setBiometricEnabledSetting: (v: boolean) => void;
  pinEnabled: boolean;
  setPinEnabledSetting: (v: boolean) => void;
}

/**
 * The copy tables, exported so tests can assert key parity against the real
 * dictionaries rather than re-parsing this file's source text.
 *
 * Parsing the source was tried first and is a trap: the `fr` block has to be
 * delimited by searching for the next `en:`/`fr:` marker, and any 4-space-
 * indented `identifier:` line after it — a function parameter like
 * `key: string,` — is silently counted as a translation key. That produced a
 * phantom 403rd French key and a failing suite with nothing actually wrong.
 * Importing the object makes the assertion about behaviour, not formatting.
 *
 * @see SettingsProvider's `t` for how these are consumed at runtime.
 */
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // ── Settings ────────────────────────────────────────────────────────────
    settings: "Settings",
    appearance: "Appearance",
    darkMode: "Dark Mode",
    darkModeSystem: "System Default",
    darkModeLight: "Light",
    darkModeDark: "Dark",
    language: "Language",

    // ── Language picker (shown once, after the first-run showcase) ─────────
    lang_page_title: "Choose your language",
    lang_page_sub: "Pick the language for HomeCare237. You can change it later in Settings.",
    // Endonyms, identical in both blocks and deliberately untranslated: a user
    // who cannot read the app's current language still has to be able to find
    // their own. See the FR block for the same pair.
    lang_english: "English",
    lang_french: "Français",
    lang_continue: "Continue",
    lang_change_later: "You can change this at any time in Settings.",

    // ── Sign-in / onboarding funnel ───────────────────────────────────────
    funnel_welcome_prefix: "Welcome to",
    funnel_tagline: "Your personalized health companion at home",
    funnel_sign_in: "Sign in",
    funnel_get_started: "Get started",
    funnel_sign_in_as: "Sign in as",
    funnel_register_as: "Register as",
    funnel_patient: "Patient",
    funnel_doctor: "Doctor",
    funnel_back_home: "Back to home",
    funnel_welcome_back: "Welcome back",
    funnel_create_account: "Create your account",
    funnel_create_account_short: "Create Account",
    funnel_signup_patient_sub: "A few details and you can book a doctor from anywhere in Cameroon.",
    funnel_signin_patient_sub: "Sign in to book appointments, message your doctor and track your care.",
    funnel_signin_doctor_sub: "Sign in to manage your appointments, consults and patient records.",
    funnel_join_as_doctor: "Join as a doctor",
    funnel_complete_registration: "Complete Registration",
    funnel_doctor_review_note: "Your profile is reviewed by an administrator before you go live.",
    funnel_dont_have_account: "Don't have an account?",
    funnel_or: "or",
    funnel_or_continue_with: "or continue with",
    funnel_or_signup_with: "or sign up with",
    funnel_admin_signin: "Administrator sign in",
    funnel_staff_access: "Staff access to the HomeCare237 operations console.",
    funnel_admin: "Admin",
    funnel_back_role_selection: "Back to role selection",
    funnel_back_signin: "Back to {role} sign in",

    // ── Firebase auth error copy (mirrors CODE_MESSAGES in utils/authErrors) ─
    autherr_incorrect_credentials:
      "Incorrect email or password. Please check and try again.",
    autherr_invalid_email: "That email address doesn't look right. Please check it.",
    autherr_missing_password: "Please enter your password.",
    autherr_missing_email: "Please enter your email address.",
    autherr_user_not_found: "No account was found with those details.",
    autherr_user_disabled: "This account has been disabled. Please contact support.",
    autherr_popup_blocked:
      "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
    autherr_account_exists_other:
      "An account already exists with this email using a different sign-in method. Sign in with your password instead.",
    autherr_credential_in_use:
      "This email is already linked to another account. Sign in with your password instead.",
    autherr_operation_not_allowed:
      "Google sign-in isn't enabled for this app yet. Please use your email and password.",
    autherr_unauthorized_domain:
      "Google sign-in isn't enabled for this domain. Please use your email and password.",
    autherr_timeout: "The request timed out. Please check your connection and try again.",
    autherr_internal_error:
      "Something went wrong on our side. Please try again in a moment.",
    autherr_google_failed: "Google sign-in failed. Please try again.",
    autherr_stale_saved_login:
      "Your saved sign-in is no longer valid. Please sign in with your email and password.",
    autherr_role_mismatch_unnamed:
      "This account cannot sign in here. Please use the {expected} sign-in portal.",
    autherr_role_mismatch:
      "This is a {actual} account. You are on the {expected} sign-in page — please use the {actual} portal instead.",

    // ── Funnel actions ────────────────────────────────────────────────────
    funnel_forgot_password: "Forgot Password?",
    funnel_sign_in_action: "Sign In",
    funnel_signing_in: "Signing In…",
    funnel_sign_up: "Sign Up",
    funnel_sign_in_google: "Sign in with Google",
    funnel_google_connecting: "Connecting to Google…",

    // ── Password recovery ─────────────────────────────────────────────────
    rec_title: "Password recovery",
    rec_check_inbox: "Check your inbox",
    rec_email_prompt: "Enter your email to receive a password reset link",
    rec_sub:
      "We’ll email you a secure link to set a new password.",
    rec_send_link: "Send Recovery Link",
    rec_sending: "Sending…",
    rec_sent_title: "Recovery Email Sent!",
    rec_sent_body:
      "We’ve sent a password reset link to {email}. Please check your inbox and follow the instructions to reset your password.",
    rec_no_email: "Didn’t receive the email?",
    rec_resend: "Resend",
    rec_back_to_login: "Back to Login",

    // ── Quick sign-in (PIN / biometrics) ───────────────────────────────────
    qs_divider: "or sign in quickly",
    qs_with_biometric: "Sign in with {method}",
    qs_with_pin: "Sign in with PIN",
    qs_use_pin_instead: "Use PIN instead",
    qs_use_biometric_instead: "Use {method} instead",
    qs_pin_label: "Enter your PIN to sign in",
    qs_signing_in: "Signing in…",
    qs_key_delete: "Delete",

    // ── Sign-up form ──────────────────────────────────────────────────────
    signup_tap_photo: "Tap to add photo",
    signup_creating_account: "Creating Account…",
    signup_registering_doctor: "Registering Doctor…",
    signup_continue_google: "Continue with Google",
    signup_create_account_btn: "Create Account",
    signup_complete_registration: "Complete Registration",
    signup_already_have_account: "Already have an account?",
    signup_already_have_account_doctor: "Already have a doctor account?",
    signup_terms_prefix: "By continuing you agree to our",
    signup_terms_link: "Terms & Conditions",

    // ── Sex options (label only; the stored value stays "male"/"female"/…) ──
    sex_male: "Male",
    sex_female: "Female",
    sex_other: "Other",
    sex_prefer_not_to_say: "Prefer not to say",

    field_email_address: "Your email address",
    field_prof_email_address: "Your professional email address",

    // ── Form fields ───────────────────────────────────────────────────────
    field_email: "Email",
    field_password: "Password",
    field_confirm_password: "Confirm Password",
    field_full_name: "Full Name",
    field_username: "Username",
    field_phone: "Phone Number",
    field_age: "Age",
    field_sex: "Sex",
    field_town: "Town/City",
    field_street: "Street Address",
    field_specialization: "Specialization",
    field_medical_license: "Medical License Number",
    field_qualifications: "Qualifications (e.g., MD, MBBS)",
    field_bio: "Professional Bio",
    field_experience: "Years of Experience",
    field_fee: "Consultation Fee (XAF)",
    field_hospital: "Hospital/Clinic Name",
    field_available_slots: "Available slots (e.g. 09:00,10:00,14:00)",
    field_profile_preview: "Profile preview",

    // ── Specializations ───────────────────────────────────────────────────
    spec_general_practitioner: "General Practitioner",
    spec_cardiologist: "Cardiologist",
    spec_pediatrician: "Pediatrician",
    spec_dermatologist: "Dermatologist",
    spec_gynecologist: "Gynecologist",
    spec_orthopedic_surgeon: "Orthopedic Surgeon",
    spec_neurologist: "Neurologist",
    spec_psychiatrist: "Psychiatrist",
    spec_dentist: "Dentist",
    spec_ophthalmologist: "Ophthalmologist",
    spec_ent_specialist: "ENT Specialist",
    spec_urologist: "Urologist",
    spec_endocrinologist: "Endocrinologist",
    spec_gastroenterologist: "Gastroenterologist",
    spec_oncologist: "Oncologist",
    spec_rheumatologist: "Rheumatologist",
    spec_pulmonologist: "Pulmonologist",
    spec_nephrologist: "Nephrologist",
    spec_allergist: "Allergist",
    spec_physiotherapist: "Physiotherapist",
    spec_choose: "Choose a specialization",

    // ── Validation messages ───────────────────────────────────────────────
    err_email_required: "Email is required",
    err_email_invalid: "Invalid email address",
    err_email_format: "Invalid email address format",
    err_password_required: "Password is required",
    err_password_invalid: "Invalid password",
    err_passwords_dont_match: "Passwords do not match",
    err_confirm_password: "Please confirm your password",
    err_name_required: "Name is required",
    err_username_required: "Username is required",
    err_phone_required: "Contact number is required",
    err_phone_format: "Invalid phone number format",
    err_phone_invalid: "Invalid phone number",
    err_age_required: "Age is required",
    err_age_valid: "Please enter a valid age",
    err_sex_required: "Sex is required",
    err_town_required: "Town is required",
    err_hospital_required: "Hospital/Clinic name is required",
    err_street_required: "Street address is required",
    err_specialization_required: "Specialization is required",
    err_license_required: "License number is required",
    err_qualifications_required: "Qualifications are required",
    err_bio_required: "Bio is required",
    err_experience_required: "Years of experience is required",
    err_fee_required: "Consultation fee is required",
    err_fee_negative: "Fee cannot be negative",
    err_fee_too_high: "Fee seems too high",
    err_cannot_be_negative: "Cannot be negative",

    // ── Auth-flow errors (sign-in / sign-up / recovery / quick sign-in) ─────
    err_login_failed: "Login failed. Please try again.",
    err_account_not_patient: "This account is not registered as a patient.",
    err_account_not_doctor: "This account is not registered as a doctor.",
    err_no_account_email: "No account found with this email address",
    err_no_doctor_account_email: "No doctor account found with this email address",
    err_no_admin_account_email: "No admin account found with this email address",
    err_too_many_attempts: "Too many attempts. Please try again later.",
    err_network: "Network error. Please check your connection and try again.",
    err_network_short: "Network error. Please check your connection.",
    err_failed_to_login: "Failed to log in. Please try again.",
    err_password_too_short: "Password must be at least 6 characters",
    err_password_min_8: "Password must be at least 8 characters",
    err_password_too_weak: "Password is too weak. Please use a stronger password.",
    err_quick_signin_failed: "Quick sign-in failed. Please sign in manually.",
    err_biometric_failed: "Biometric failed. Please sign in manually.",
    err_saved_creds_missing: "Saved credentials not found. Please sign in with email.",
    err_incorrect_pin: "Incorrect PIN.",

    // ── Sign-up errors ────────────────────────────────────────────────────
    err_passwords_dont_match_try: "Passwords do not match. Please try again.",
    err_fix_form_errors: "Please fix the form errors before submitting.",
    err_account_created: "Account created successfully! You can now sign in.",
    err_doctor_registered: "Doctor registration completed successfully!",
    err_email_already_registered_long:
      "This email is already registered. Please use a different email.",
    err_email_already_registered: "This email is already registered.",
    err_invalid_email_format_period: "Invalid email address format.",
    err_accounts_disabled:
      "Email/password accounts are not enabled. Please contact support.",
    err_unexpected: "An unexpected error occurred. Please try again.",
    err_registration_failed: "Registration failed. Please try again.",
    err_invalid_image_type:
      "Please select a valid image file (JPEG, PNG, etc.).",
    err_image_too_large: "Image size should be less than 5MB.",
    err_image_process_failed:
      "Error processing image. Please try another file.",
    err_profile_photo_upload: "Failed to upload profile photo",
    err_profile_photo_alt: "Profile preview",
    err_profile_create: "Failed to create user profile",
    err_profile_image_upload: "Failed to upload profile image",
    err_save_doctor_info: "Failed to save doctor information",

    // ── Recovery errors ───────────────────────────────────────────────────
    err_recovery_not_enabled: "Password reset is not enabled for this project",
    err_recovery_send_failed:
      "Failed to send recovery email. Please try again.",
    err_recovery_resend_failed: "Failed to resend email. Please try again.",

    // The admin portal never echoes the address back (it only says "your email
    // address"), so it needs its own body rather than reusing rec_sent_body.
    rec_sent_body_admin:
      "We’ve sent a password reset link to your email address. Please check your inbox and follow the instructions.",

    // ── Length-bounded field messages (use {min} / {max}) ──────────────────
    // French often needs the bound inline, so both languages share the slots.
    err_min_chars: "Must be at least {min} characters",
    err_max_chars: "Must be less than {max} characters",
    err_min_digits: "Must be at least {min} digits",
    err_max_digits: "Must be less than {max} digits",
    err_username_charset:
      "Username can only contain letters, numbers, and underscores",
    err_name_charset: "Name can only contain letters and spaces",
    err_age_min: "Must be at least {min} years old",
    err_age_max_under: "Must be less than {max}",
    err_bio_min_chars: "Bio must be at least {min} characters",
    err_bio_max_chars: "Bio must be less than {max} characters",
    err_age_min_23: "Must be at least 23 years old",
    err_experience_invalid: "Please enter valid years of experience",
    signup_qualifications_placeholder: "Qualifications (e.g., MD, MBBS)",

    notifications: "Notifications",
    enableNotifications: "Enable Notifications",
    sound: "Sound",
    enableSound: "Enable Sound",
    accessibility: "Accessibility",
    fontSize: "Font Size",
    fontSizeSmall: "Small",
    fontSizeMedium: "Medium",
    fontSizeLarge: "Large",
    account: "Account",
    changePassword: "Change Password",
    privacy: "Privacy",
    about: "About",
    version: "Version",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    // Security section
    security: "Security",
    biometricAuth: "Fingerprint / Face ID",
    biometricAuthDesc: "Unlock the app with your fingerprint or face",
    pinAuth: "PIN Lock",
    pinAuthDesc: "Unlock the app with a 4-digit PIN",
    setupPin: "Set Up PIN",
    changePin: "Change PIN",
    disablePin: "Disable PIN",
    pinSetupSuccess: "PIN set up successfully",
    biometricNotAvailable: "Biometrics not available on this device",

    // ── App / Common ─────────────────────────────────────────────────────────
    appName: "HomeCare237",
    loading: "Loading...",
    refresh: "Refresh",
    seeAll: "See all",
    bookNow: "Book Now",
    error: "Error",
    ok: "OK",
    viewDetails: "View Details",
    reschedule: "Reschedule",
    cancelAppointment: "Cancel Appointment",
    noData: "No data available",
    search: "Search",
    searchSpecialist: "Search specialist category",

    // ── Tab bar (patient) ─────────────────────────────────────────────────────
    tabHome: "Home",
    tabDiagnoses: "Diagnoses",
    tabAppt: "Appt",
    tabConsult: "Consult",
    tabMe: "Me",

    // ── First-run services showcase ──────────────────────────────────────────
    sc_kicker: "Everything in one place",
    sc_headline: "Care that keeps up with you",
    sc_sub: "Six ways HomeCare237 looks after your health.",
    sc_progress: "Step {current} of {total}",
    sc_next: "Next",
    sc_prev: "Previous",
    sc_skip: "Skip",
    sc_start: "Create my account",
    sc_consult_title: "Talk to a doctor by video",
    sc_consult_body:
      "Consult a verified practitioner face to face from home, with no travel and no queue.",
    // Describes the illustration, so it is deliberately not a restatement of the
    // headline beside it. Each one must match the artwork it labels: the art is
    // stock from Storyset (see assets/showcase/ATTRIBUTION.md), so these describe
    // that picture, not an idealised one.
    sc_consult_alt:
      "A doctor beside a large screen showing a video call, with the patient in a smaller window.",
    sc_appointments_title: "Book appointments in seconds",
    sc_appointments_body:
      "Pick a specialty, choose a slot and confirm it — in person or by Mobile Money.",
    sc_appointments_alt:
      "A person marking a date on a wall calendar, with a checkmark on the day.",
    sc_records_title: "Your whole medical record",
    sc_records_body:
      "Vitals, diagnoses and prescriptions in one timeline, private to you and your family.",
    sc_records_alt:
      "A person holding a health passport booklet open to a checked page on a device.",
    sc_medication_title: "Never miss a dose",
    sc_medication_body:
      "Keep every prescription in one list with reminders timed to each treatment.",
    sc_medication_alt:
      "A doctor at a desk writing a prescription, with medicine and a document on the desk.",
    sc_emergency_title: "Emergency SOS",
    sc_emergency_body:
      "One tap alerts your emergency contacts and nearby health units when minutes count.",
    sc_emergency_alt:
      "An ambulance with its lights on, and a paramedic standing beside it.",
    sc_wallet_title: "Pay how Cameroon pays",
    sc_wallet_body:
      "Settle with MTN MoMo or Orange Money and keep every receipt for your insurer.",
    sc_wallet_alt:
      "A person holding a smartphone, paying with mobile money.",

    // ── Sidebar menu items ────────────────────────────────────────────────────
    dashboard: "Dashboard",
    profile: "Profile",
    appointments: "Appointments",
    diagnoses: "Diagnoses",
    consult: "Consult",
    healthUnits: "Health Units",
    medications: "Medications",
    vitals: "Vitals",
    healthRecords: "Health Records",
    articles: "Health Education",
    receipts: "Insurance & Receipts",
    sos: "Emergency SOS",
    patients: "Patients",
    doctors: "Doctors",
    doctorAccounts: "Doctor Accounts",
    analytics: "Analytics",
    referPatients: "Refer Patients",
    smsDoctor: "SMS Doctor",
    smsPatient: "SMS Patient",
    smsAdmin: "Admin Messages",
    notifications_page: "Notifications",

    // ── Patient Dashboard ─────────────────────────────────────────────────────
    findSpecialist: "Find your Specialist",
    helloGreeting: "Hello",
    categories: "Categories",
    upcomingAppointment: "Upcoming Appointment",
    topDoctors: "Top Doctor's For You",
    noCategoryFound: "No category found.",
    noUpcomingAppointments: "No upcoming appointments",
    noDoctorsMatch: "No doctors match this search right now.",
    loadingDashboard: "Loading your dashboard...",
    pullToRefresh: "Pull to refresh",
    refreshing: "Refreshing...",

    // ── Doctor Dashboard ──────────────────────────────────────────────────────
    doctorDashboard: "Doctor Dashboard",
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    todayAppointments: "Today",
    todayAgenda: "Today's Agenda",
    upcomingAppointments: "Upcoming",
    myPatients: "My Patients",
    noAppointmentsToday: "No appointments today",
    noUpcomingAppts: "No upcoming appointments",
    virtualConsultation: "Virtual Consultation",
    allStatuses: "All Statuses",
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",

    // ── Admin Dashboard ───────────────────────────────────────────────────────
    adminDashboard: "Admin Dashboard",
    patientStatus: "Patient Status",
    weeklyAppointments: "Weekly Appointments",
    healthUnitsStatus: "Health Units Status",
    capacityUtilization: "Capacity & Utilization",
    recentCaregivers: "Recent Caregivers",
    currentlyActive: "Currently Active",
    recentPatients: "Recent Patients",
    recentActivity: "Recent Activity",
    upcomingAppts: "Upcoming Appointments",
    loadingData: "Loading dashboard data...",
    accepted: "Accepted",
    alerts: "Alerts",
    capacity: "capacity",
    thisMonth: "This month",
    lastMonth: "Last month",
    total: "Total",
    allTime: "All time",
    last4Weeks: "Last 4 weeks",
    weeklyActivity: "Appointments by weekday over the last 4 weeks",
    statusBreakdown: "Completed vs pending appointments",
    upcomingApptsSubtitle: "Next scheduled visits, soonest first",
    healthScoreLabel: "Health Score",
    noRecentCaregivers: "No caregivers registered yet",
    noRecentPatients: "No patients registered yet",
    noHealthUnits: "No health units registered yet",

    // ── Health Education → AI care tips ───────────────────────────────────────
    aiTipsTitle: "Live health care tips",
    aiTipsSubtitle: "Refreshed by an online health assistant",
    aiTipsLoading: "Getting the latest health tips…",
    aiTipsEmpty:
      "No assistant tips to show yet — tap the refresh button to try again.",
    aiTipsOffline: "The online assistant is unavailable right now.",
    aiTipsNotConfigured: "The online assistant is not set up yet.",
    aiTipsUpdated: "Updated",
    aiTipsDisclaimer:
      "AI-generated health education only. This is not a diagnosis — always consult a health professional.",
    searchArticles: "Search health articles",
    allCategories: "All",
    bookmarked: "Bookmarked",
    featured: "Featured",
    noArticlesFound:
      "No articles match your search. Try a different keyword or category.",
    article: "Article",
    keyTakeaways: "Key takeaways",
    topicMpox: "Mpox",
    topicMalaria: "Malaria",
    topicCholera: "Cholera",
    topicTyphoid: "Typhoid",
    topicDengue: "Dengue",
    topicDiarrhoea: "Diarrhoea",
    topicTuberculosis: "Tuberculosis",
    topicHygiene: "Hygiene",
    topicNutrition: "Nutrition",
    topicMaternal: "Maternal & Child",
    topicMental: "Mental Health",
    topicGeneral: "General",

    // ── App info & sharing ────────────────────────────────────────────────────
    rateApp: "Rate App",
    rateAppDesc: "Enjoying HomeCare237? Leave us a review",
    privacyPolicy: "Privacy Policy",
    privacyPolicyDesc: "How we collect and protect your data",
    contactUs: "Contact Us",
    contactUsDesc: "Get help or send us feedback",
    termsConditions: "Terms & Conditions",
    termsConditionsDesc: "Our terms of service",
    shareApp: "Share App",
    shareAppDesc: "Invite friends and family to HomeCare237",
    shareAppMessage: "Check out HomeCare237 – a healthcare app connecting patients with doctors across Cameroon!",
  },

  fr: {
    // ── Settings ────────────────────────────────────────────────────────────
    settings: "Paramètres",
    appearance: "Apparence",
    darkMode: "Mode Sombre",
    darkModeSystem: "Système",
    darkModeLight: "Clair",
    darkModeDark: "Sombre",
    language: "Langue",

    // ── Language picker (shown once, after the first-run showcase) ─────────
    // The two *_sample strings are deliberately NOT translated: each is a
    // preview of that language, so they show the language they name. The picker
    // has to render both options regardless of the active language, otherwise a
    // French speaker could not tell what "English" looks like.
    lang_page_title: "Choisissez votre langue",
    lang_page_sub:
      "Choisissez la langue de HomeCare237. Vous pourrez la modifier plus tard dans les paramètres.",
    // Endonyms on purpose: "English" stays "English" in French too, because a
    // user who has landed here not understanding French still needs to find
    // their own language. Translating these would defeat the whole screen.
    lang_english: "English",
    lang_french: "Français",
    lang_continue: "Continuer",
    lang_change_later:
      "Vous pouvez modifier ce choix à tout moment dans les paramètres.",

    // ── Sign-in / onboarding funnel ───────────────────────────────────────
    funnel_welcome_prefix: "Bienvenue sur",
    funnel_tagline: "Votre compagnon de santé personnalisé à domicile",
    funnel_sign_in: "Se connecter",
    funnel_get_started: "Commencer",
    funnel_sign_in_as: "Se connecter en tant que",
    funnel_register_as: "S'inscrire en tant que",
    funnel_patient: "Patient",
    funnel_doctor: "Médecin",
    funnel_back_home: "Retour à l'accueil",
    funnel_welcome_back: "Bon retour",
    funnel_create_account: "Créez votre compte",
    funnel_create_account_short: "Créer un compte",
    funnel_signup_patient_sub:
      "Quelques informations et vous pourrez réserver un médecin où que vous soyez au Cameroun.",
    funnel_signin_patient_sub:
      "Connectez-vous pour réserver des rendez-vous, écrire à votre médecin et suivre vos soins.",
    funnel_signin_doctor_sub:
      "Connectez-vous pour gérer vos rendez-vous, vos consultations et les dossiers de vos patients.",
    funnel_join_as_doctor: "Rejoindre en tant que médecin",
    funnel_complete_registration: "Terminer l'inscription",
    funnel_doctor_review_note:
      "Votre profil est examiné par un administrateur avant d'être activé.",
    funnel_dont_have_account: "Vous n'avez pas de compte ?",
    funnel_or: "ou",
    funnel_or_continue_with: "ou continuer avec",
    funnel_or_signup_with: "ou s'inscrire avec",
    funnel_admin_signin: "Connexion administrateur",
    funnel_staff_access:
      "Accès du personnel à la console d'exploitation HomeCare237.",
    funnel_admin: "Administrateur",
    funnel_back_role_selection: "Retour à la sélection du rôle",
    funnel_back_signin: "Retour à la connexion {role}",

    // ── Messages d'erreur Firebase (miroir de CODE_MESSAGES dans utils/authErrors) ─
    autherr_incorrect_credentials:
      "E-mail ou mot de passe incorrect. Veuillez vérifier et réessayer.",
    autherr_invalid_email: "Cette adresse e-mail semble incorrecte. Veuillez la vérifier.",
    autherr_missing_password: "Veuillez saisir votre mot de passe.",
    autherr_missing_email: "Veuillez saisir votre adresse e-mail.",
    autherr_user_not_found: "Aucun compte n'a été trouvé avec ces informations.",
    autherr_user_disabled: "Ce compte a été désactivé. Veuillez contacter l'assistance.",
    autherr_popup_blocked:
      "Votre navigateur a bloqué la fenêtre de connexion Google. Autorisez les fenêtres pop-up pour ce site et réessayez.",
    autherr_account_exists_other:
      "Un compte existe déjà avec cette adresse e-mail via une autre méthode de connexion. Connectez-vous avec votre mot de passe.",
    autherr_credential_in_use:
      "Cette adresse e-mail est déjà associée à un autre compte. Connectez-vous avec votre mot de passe.",
    autherr_operation_not_allowed:
      "La connexion Google n'est pas encore activée pour cette application. Veuillez utiliser votre e-mail et mot de passe.",
    autherr_unauthorized_domain:
      "La connexion Google n'est pas activée pour ce domaine. Veuillez utiliser votre e-mail et mot de passe.",
    autherr_timeout: "La requête a expiré. Veuillez vérifier votre connexion et réessayer.",
    autherr_internal_error:
      "Une erreur s'est produite de notre côté. Veuillez réessayer dans un instant.",
    autherr_google_failed: "Échec de la connexion avec Google. Veuillez réessayer.",
    autherr_stale_saved_login:
      "Votre connexion enregistrée n'est plus valide. Veuillez vous connecter avec votre e-mail et mot de passe.",
    autherr_role_mismatch_unnamed:
      "Ce compte ne peut pas se connecter ici. Veuillez utiliser le portail de connexion {expected}.",
    autherr_role_mismatch:
      "Ceci est un compte {actual}. Vous êtes sur la page de connexion {expected} — veuillez utiliser le portail {actual}.",

    // ── Funnel actions ────────────────────────────────────────────────────
    funnel_forgot_password: "Mot de passe oublié ?",
    funnel_sign_in_action: "Se connecter",
    funnel_signing_in: "Connexion…",
    funnel_sign_up: "S'inscrire",
    funnel_sign_in_google: "Se connecter avec Google",
    funnel_google_connecting: "Connexion à Google…",

    // ── Récupération du mot de passe ──────────────────────────────────────
    rec_title: "Récupération du mot de passe",
    rec_check_inbox: "Vérifiez votre boîte de réception",
    rec_email_prompt:
      "Saisissez votre e-mail pour recevoir un lien de réinitialisation du mot de passe",
    rec_sub:
      "Nous allons vous envoyer un lien sécurisé pour définir un nouveau mot de passe.",
    rec_send_link: "Envoyer le lien de récupération",
    rec_sending: "Envoi…",
    rec_sent_title: "E-mail de récupération envoyé !",
    rec_sent_body:
      "Nous avons envoyé un lien de réinitialisation à {email}. Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.",
    rec_no_email: "Vous n'avez pas reçu l'e-mail ?",
    rec_resend: "Renvoyer",
    rec_back_to_login: "Retour à la connexion",

    // ── Connexion rapide (code PIN / biométrie) ────────────────────────────
    qs_divider: "ou connectez-vous rapidement",
    qs_with_biometric: "Se connecter avec {method}",
    qs_with_pin: "Se connecter avec le code PIN",
    qs_use_pin_instead: "Utiliser le code PIN",
    qs_use_biometric_instead: "Utiliser {method}",
    qs_pin_label: "Saisissez votre code PIN pour vous connecter",
    qs_signing_in: "Connexion…",
    qs_key_delete: "Effacer",

    // ── Formulaire d'inscription ──────────────────────────────────────────
    signup_tap_photo: "Appuyez pour ajouter une photo",
    signup_creating_account: "Création du compte…",
    signup_registering_doctor: "Inscription du médecin…",
    signup_continue_google: "Continuer avec Google",
    signup_create_account_btn: "Créer le compte",
    signup_complete_registration: "Terminer l'inscription",
    signup_already_have_account: "Vous avez déjà un compte ?",
    signup_already_have_account_doctor: "Vous avez déjà un compte médecin ?",
    signup_terms_prefix: "En continuant, vous acceptez nos",
    signup_terms_link: "Conditions générales",

    // ── Options de sexe (libellé seul ; la valeur stockée reste en anglais) ─
    sex_male: "Homme",
    sex_female: "Femme",
    sex_other: "Autre",
    sex_prefer_not_to_say: "Préfère ne pas préciser",

    field_email_address: "Votre adresse e-mail",
    field_prof_email_address: "Votre adresse e-mail professionnelle",
    // ── Form fields ───────────────────────────────────────────────────────
    field_email: "Adresse e-mail",
    field_password: "Mot de passe",
    field_confirm_password: "Confirmer le mot de passe",
    field_full_name: "Nom complet",
    field_username: "Nom d'utilisateur",
    field_phone: "Numéro de téléphone",
    field_age: "Âge",
    field_sex: "Sexe",
    field_town: "Ville",
    field_street: "Adresse (rue)",
    field_specialization: "Spécialité",
    field_medical_license: "Numéro de licence médicale",
    field_qualifications: "Diplômes (ex. MD, MBBS)",
    field_bio: "Biographie professionnelle",
    field_experience: "Années d'expérience",
    field_fee: "Tarif de consultation (XAF)",
    field_hospital: "Nom de l'hôpital / clinique",
    field_available_slots: "Créneaux disponibles (ex. 09:00, 10:00, 14:00)",
    field_profile_preview: "Aperçu du profil",

    // ── Specializations ───────────────────────────────────────────────────
    spec_general_practitioner: "Médecin généraliste",
    spec_cardiologist: "Cardiologue",
    spec_pediatrician: "Pédiatre",
    spec_dermatologist: "Dermatologue",
    spec_gynecologist: "Gynécologue",
    spec_orthopedic_surgeon: "Chirurgien orthopédiste",
    spec_neurologist: "Neurologue",
    spec_psychiatrist: "Psychiatre",
    spec_dentist: "Dentiste",
    spec_ophthalmologist: "Ophtalmologue",
    spec_ent_specialist: "Spécialiste ORL",
    spec_urologist: "Urologue",
    spec_endocrinologist: "Endocrinologue",
    spec_gastroenterologist: "Gastro-entérologue",
    spec_oncologist: "Oncologue",
    spec_rheumatologist: "Rhumatologue",
    spec_pulmonologist: "Pneumologue",
    spec_nephrologist: "Néphrologue",
    spec_allergist: "Allergologue",
    spec_physiotherapist: "Physiothérapeute",
    spec_choose: "Choisissez une spécialité",

    // ── Validation messages ───────────────────────────────────────────────
    err_email_required: "L'adresse e-mail est requise",
    err_email_invalid: "Adresse e-mail invalide",
    err_email_format: "Format d'adresse e-mail invalide",
    err_password_required: "Le mot de passe est requis",
    err_password_invalid: "Mot de passe invalide",
    err_passwords_dont_match: "Les mots de passe ne correspondent pas",
    err_confirm_password: "Veuillez confirmer votre mot de passe",
    err_name_required: "Le nom est requis",
    err_username_required: "Le nom d'utilisateur est requis",
    err_phone_required: "Le numéro de téléphone est requis",
    err_phone_format: "Format de numéro de téléphone invalide",
    err_phone_invalid: "Numéro de téléphone invalide",
    err_age_required: "L'âge est requis",
    err_age_valid: "L'âge doit être compris entre 1 et 120 ans",
    err_sex_required: "Le sexe est requis",
    err_town_required: "La ville est requise",
    err_hospital_required: "Le nom de l'hôpital/la clinique est requis",
    err_street_required: "L'adresse est requise",
    err_specialization_required: "La spécialité est requise",
    err_license_required: "Le numéro de licence est requis",
    err_qualifications_required: "Les diplômes sont requis",
    err_bio_required: "La biographie est requise",
    err_experience_required: "L'expérience est requise",
    err_fee_required: "Le tarif est requis",
    err_fee_negative: "Le tarif ne peut pas être négatif",
    err_fee_too_high: "Le tarif semble trop élevé",
    err_cannot_be_negative: "Ne peut pas être négatif",

    // ── Erreurs du parcours (connexion / inscription / récupération) ────────
    err_login_failed: "Échec de la connexion. Veuillez réessayer.",
    err_account_not_patient: "Ce compte n'est pas enregistré comme patient.",
    err_account_not_doctor: "Ce compte n'est pas enregistré comme médecin.",
    err_no_account_email: "Aucun compte trouvé avec cette adresse e-mail",
    err_no_doctor_account_email: "Aucun compte médecin trouvé avec cette adresse e-mail",
    err_no_admin_account_email: "Aucun compte administrateur trouvé avec cette adresse e-mail",
    err_too_many_attempts: "Trop de tentatives. Veuillez réessayer plus tard.",
    err_network:
      "Erreur réseau. Veuillez vérifier votre connexion et réessayer.",
    err_network_short: "Erreur réseau. Veuillez vérifier votre connexion.",
    err_failed_to_login: "Échec de la connexion. Veuillez réessayer.",
    err_password_too_short: "Le mot de passe doit contenir au moins 6 caractères",
    err_password_min_8: "Le mot de passe doit contenir au moins 8 caractères",
    err_password_too_weak: "Mot de passe trop faible. Veuillez en choisir un plus robuste.",
    err_quick_signin_failed: "Échec de la connexion rapide. Veuillez vous connecter manuellement.",
    err_biometric_failed: "Échec de la biométrie. Veuillez vous connecter manuellement.",
    err_saved_creds_missing: "Aucun identifiant enregistré. Veuillez vous connecter avec votre e-mail.",
    err_incorrect_pin: "Code PIN incorrect.",

    // ── Erreurs d'inscription ─────────────────────────────────────────────
    err_passwords_dont_match_try: "Les mots de passe ne correspondent pas. Veuillez réessayer.",
    err_fix_form_errors: "Veuillez corriger les erreurs du formulaire avant de soumettre.",
    err_account_created: "Compte créé avec succès ! Vous pouvez maintenant vous connecter.",
    err_doctor_registered: "Inscription du médecin effectuée avec succès !",
    err_email_already_registered_long:
      "Cette adresse e-mail est déjà enregistrée. Veuillez en utiliser une autre.",
    err_email_already_registered: "Cette adresse e-mail est déjà enregistrée.",
    err_invalid_email_format_period: "Format d'adresse e-mail invalide.",
    err_accounts_disabled:
      "Les comptes e-mail/mot de passe ne sont pas activés. Veuillez contacter l'assistance.",
    err_unexpected: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    err_registration_failed: "Échec de l'inscription. Veuillez réessayer.",
    err_invalid_image_type:
      "Veuillez sélectionner un fichier image valide (JPEG, PNG, etc.).",
    err_image_too_large: "La taille de l'image doit être inférieure à 5 Mo.",
    err_image_process_failed:
      "Erreur lors du traitement de l'image. Veuillez essayer un autre fichier.",
    err_profile_photo_upload: "Échec du téléversement de la photo de profil",
    err_profile_photo_alt: "Aperçu de la photo de profil",
    err_profile_create: "Échec de la création du profil utilisateur",
    err_profile_image_upload: "Échec du téléversement de l'image de profil",
    err_save_doctor_info: "Échec de l'enregistrement des informations du médecin",

    // ── Erreurs de récupération ───────────────────────────────────────────
    err_recovery_not_enabled: "La réinitialisation du mot de passe n'est pas activée pour ce projet",
    err_recovery_send_failed:
      "Échec de l'envoi de l'e-mail de récupération. Veuillez réessayer.",
    err_recovery_resend_failed: "Échec du renvoi de l'e-mail. Veuillez réessayer.",

    // Le portail admin ne rappelle jamais l'adresse (« votre adresse e-mail »),
    // il lui faut donc son propre texte plutôt que rec_sent_body.
    rec_sent_body_admin:
      "Nous avons envoyé un lien de réinitialisation à votre adresse e-mail. Vérifiez votre boîte de réception et suivez les instructions.",

    // ── Messages de longueur (utilisent {min} / {max}) ─────────────────────
    err_min_chars: "Doit contenir au moins {min} caractères",
    err_max_chars: "Doit contenir moins de {max} caractères",
    err_min_digits: "Doit contenir au moins {min} chiffres",
    err_max_digits: "Doit contenir moins de {max} chiffres",
    err_username_charset:
      "Le nom d'utilisateur ne peut contenir que des lettres, des chiffres et des tirets bas",
    err_name_charset: "Le nom ne peut contenir que des lettres et des espaces",
    err_age_min: "Doit avoir au moins {min} ans",
    err_age_max_under: "Doit être inférieur à {max}",
    err_bio_min_chars: "La biographie doit contenir au moins {min} caractères",
    err_bio_max_chars: "La biographie doit contenir moins de {max} caractères",
    err_age_min_23: "Doit avoir au moins 23 ans",
    err_experience_invalid: "Veuillez saisir un nombre d'années d'expérience valide",
    signup_qualifications_placeholder: "Diplômes (ex. MD, MBBS)",

    notifications: "Notifications",
    enableNotifications: "Activer les Notifications",
    sound: "Son",
    enableSound: "Activer le Son",
    accessibility: "Accessibilité",
    fontSize: "Taille de Police",
    fontSizeSmall: "Petite",
    fontSizeMedium: "Moyenne",
    fontSizeLarge: "Grande",
    account: "Compte",
    changePassword: "Changer le Mot de Passe",
    privacy: "Confidentialité",
    about: "À Propos",
    version: "Version",
    logout: "Déconnexion",
    save: "Enregistrer",
    cancel: "Annuler",
    // Security section
    security: "Sécurité",
    biometricAuth: "Empreinte / Face ID",
    biometricAuthDesc: "Déverrouillez l'app avec votre empreinte ou visage",
    pinAuth: "Verrouillage PIN",
    pinAuthDesc: "Déverrouillez l'app avec un code à 4 chiffres",
    setupPin: "Configurer le PIN",
    changePin: "Changer le PIN",
    disablePin: "Désactiver le PIN",
    pinSetupSuccess: "PIN configuré avec succès",
    biometricNotAvailable: "Biométrie non disponible sur cet appareil",

    // ── App / Common ─────────────────────────────────────────────────────────
    appName: "HomeCare237",
    loading: "Chargement...",
    refresh: "Actualiser",
    seeAll: "Voir tout",
    bookNow: "Réserver",
    error: "Erreur",
    ok: "OK",
    viewDetails: "Voir les détails",
    reschedule: "Reprogrammer",
    cancelAppointment: "Annuler le Rendez-vous",
    noData: "Aucune donnée disponible",
    search: "Rechercher",
    searchSpecialist: "Rechercher une spécialité",

    // ── Tab bar (patient) ─────────────────────────────────────────────────────
    tabHome: "Accueil",
    tabDiagnoses: "Diagnostics",
    tabAppt: "RDV",
    tabConsult: "Consulter",
    tabMe: "Moi",

    // ── Première visite : présentation des services ───────────────────────────
    sc_kicker: "Tout au même endroit",
    sc_headline: "Un suivi de santé qui vous suit",
    sc_sub: "Six façons dont HomeCare237 veille sur votre santé.",
    sc_progress: "Étape {current} sur {total}",
    sc_next: "Suivant",
    sc_prev: "Précédent",
    sc_skip: "Passer",
    sc_start: "Créer mon compte",
    sc_consult_title: "Parlez à un médecin en vidéo",
    sc_consult_body:
      "Consultez un praticien vérifié en face à face depuis chez vous, sans déplacement ni file d'attente.",
    sc_consult_alt:
      "Un médecin à côté d'un grand écran montrant une visioconférence, le patient dans une plus petite fenêtre.",
    sc_appointments_title: "Prenez rendez-vous en quelques secondes",
    sc_appointments_body:
      "Choisissez une spécialité, un créneau et confirmez — sur place ou par Mobile Money.",
    sc_appointments_alt:
      "Une personne coche une date sur un calendrier mural, avec une coche sur le jour choisi.",
    sc_records_title: "Votre dossier médical complet",
    sc_records_body:
      "Signes vitaux, diagnostics et ordonnances réunis dans une chronologie, privés pour vous et votre famille.",
    sc_records_alt:
      "Une personne tient un carnet de santé ouvert sur une page cochée, devant un appareil.",
    sc_medication_title: "N'oubliez plus une prise",
    sc_medication_body:
      "Centralisez toutes vos ordonnances avec des rappels calés sur chaque traitement.",
    sc_medication_alt:
      "Un médecin à son bureau rédige une ordonnance, avec des médicaments et un document sur la table.",
    sc_emergency_title: "SOS Urgence",
    sc_emergency_body:
      "Un seul geste alerte vos contacts d'urgence et les unités de santé les plus proches.",
    sc_emergency_alt:
      "Une ambulance gyrophares allumés, avec un secouriste debout à côté.",
    sc_wallet_title: "Payez comme au Cameroun",
    sc_wallet_body:
      "Réglez par MTN MoMo ou Orange Money et conservez chaque reçu pour votre assurance.",
    sc_wallet_alt:
      "Une personne tient un smartphone et règle par monnaie mobile.",

    // ── Sidebar menu items ────────────────────────────────────────────────────
    dashboard: "Tableau de Bord",
    profile: "Profil",
    appointments: "Rendez-vous",
    diagnoses: "Diagnostics",
    consult: "Consulter",
    healthUnits: "Unités de Santé",
    medications: "Médicaments",
    vitals: "Signes Vitaux",
    healthRecords: "Dossier Médical",
    articles: "Éducation Santé",
    receipts: "Assurance & Reçus",
    sos: "SOS Urgence",
    patients: "Patients",
    doctors: "Médecins",
    doctorAccounts: "Comptes Médecins",
    analytics: "Analytiques",
    referPatients: "Référer Patients",
    smsDoctor: "SMS Médecin",
    smsPatient: "SMS Patient",
    smsAdmin: "Messages Admin",
    notifications_page: "Notifications",

    // ── Patient Dashboard ─────────────────────────────────────────────────────
    findSpecialist: "Trouvez votre Spécialiste",
    helloGreeting: "Bonjour",
    categories: "Catégories",
    upcomingAppointment: "Prochain Rendez-vous",
    topDoctors: "Meilleurs Médecins pour Vous",
    noCategoryFound: "Aucune catégorie trouvée.",
    noUpcomingAppointments: "Aucun rendez-vous à venir",
    noDoctorsMatch: "Aucun médecin ne correspond à cette recherche.",
    loadingDashboard: "Chargement de votre tableau de bord...",
    pullToRefresh: "Tirer pour actualiser",
    refreshing: "Actualisation...",

    // ── Doctor Dashboard ──────────────────────────────────────────────────────
    doctorDashboard: "Tableau de Bord Médecin",
    goodMorning: "Bonjour",
    goodAfternoon: "Bon après-midi",
    goodEvening: "Bonsoir",
    todayAppointments: "Aujourd'hui",
    todayAgenda: "Programme du jour",
    upcomingAppointments: "À venir",
    myPatients: "Mes Patients",
    noAppointmentsToday: "Aucun rendez-vous aujourd'hui",
    noUpcomingAppts: "Aucun rendez-vous à venir",
    virtualConsultation: "Consultation Virtuelle",
    allStatuses: "Tous les statuts",
    pending: "En attente",
    confirmed: "Confirmé",
    completed: "Terminé",
    cancelled: "Annulé",

    // ── Admin Dashboard ───────────────────────────────────────────────────────
    adminDashboard: "Tableau de Bord Admin",
    patientStatus: "Statut des Patients",
    weeklyAppointments: "Rendez-vous Hebdomadaires",
    healthUnitsStatus: "État des Unités de Santé",
    capacityUtilization: "Capacité et Utilisation",
    recentCaregivers: "Soignants Récents",
    currentlyActive: "Actuellement Actifs",
    recentPatients: "Patients Récents",
    recentActivity: "Activité Récente",
    upcomingAppts: "Prochains Rendez-vous",
    loadingData: "Chargement des données...",
    accepted: "Accepté",
    alerts: "Alertes",
    capacity: "capacité",
    thisMonth: "Ce mois-ci",
    lastMonth: "Mois dernier",
    total: "Total",
    allTime: "Tout l'historique",
    last4Weeks: "4 dernières semaines",
    weeklyActivity: "Rendez-vous par jour de semaine sur 4 semaines",
    statusBreakdown: "Rendez-vous terminés vs en attente",
    upcomingApptsSubtitle: "Prochaines visites planifiées, les plus proches d'abord",
    healthScoreLabel: "Score de santé",
    noRecentCaregivers: "Aucun soignant enregistré pour le moment",
    noRecentPatients: "Aucun patient enregistré pour le moment",
    noHealthUnits: "Aucune unité de santé enregistrée pour le moment",

    // ── Éducation Santé → Conseils IA ─────────────────────────────────────────
    aiTipsTitle: "Conseils de santé en direct",
    aiTipsSubtitle: "Actualisés par un assistant santé en ligne",
    aiTipsLoading: "Récupération des derniers conseils de santé…",
    aiTipsEmpty:
      "Aucun conseil de l'assistant à afficher — appuyez sur le bouton d'actualisation pour réessayer.",
    aiTipsOffline: "L'assistant en ligne est indisponible pour le moment.",
    aiTipsNotConfigured: "L'assistant en ligne n'est pas encore configuré.",
    aiTipsUpdated: "Mis à jour",
    aiTipsDisclaimer:
      "Contenu éducatif généré par IA. Ce n'est pas un diagnostic — consultez toujours un professionnel de santé.",
    searchArticles: "Rechercher des articles de santé",
    allCategories: "Toutes",
    bookmarked: "Favoris",
    featured: "À la une",
    noArticlesFound:
      "Aucun article ne correspond à votre recherche. Essayez un autre mot-clé ou une autre catégorie.",
    article: "Article",
    keyTakeaways: "Points clés à retenir",
    topicMpox: "Mpox",
    topicMalaria: "Paludisme",
    topicCholera: "Choléra",
    topicTyphoid: "Typhoïde",
    topicDengue: "Dengue",
    topicDiarrhoea: "Diarrhée",
    topicTuberculosis: "Tuberculose",
    topicHygiene: "Hygiène",
    topicNutrition: "Nutrition",
    topicMaternal: "Mère & Enfant",
    topicMental: "Santé Mentale",
    topicGeneral: "Général",

    // ── App info & sharing ────────────────────────────────────────────────────
    rateApp: "Noter l'Application",
    rateAppDesc: "Vous aimez HomeCare237 ? Donnez-nous votre avis",
    privacyPolicy: "Politique de Confidentialité",
    privacyPolicyDesc: "Comment nous collectons et protégeons vos données",
    contactUs: "Contactez-nous",
    contactUsDesc: "Obtenir de l'aide ou envoyer des commentaires",
    termsConditions: "Conditions d'Utilisation",
    termsConditionsDesc: "Nos conditions de service",
    shareApp: "Partager l'Application",
    shareAppDesc: "Invitez vos amis et votre famille à utiliser HomeCare237",
    shareAppMessage: "Découvrez HomeCare237 – une application de santé qui connecte les patients aux médecins à travers le Cameroun !",
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Non-security settings: localStorage is fine (no native equivalent) ──
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem("hc_language") as Language) || "fr"
  );
  const [notificationsEnabled, setNotificationsEnabledState] = useState(
    () => localStorage.getItem("hc_notifications") !== "false"
  );
  const [soundEnabled, setSoundEnabledState] = useState(
    () => localStorage.getItem("hc_sound") !== "false"
  );
  const [fontSize, setFontSizeState] = useState<"small" | "medium" | "large">(
    () => (localStorage.getItem("hc_fontSize") as any) || "medium"
  );

  // ── Dark mode ────────────────────────────────────────────────────────────
  const [darkMode, setDarkModeState] = useState<DarkMode>(
    () => (localStorage.getItem("hc_darkMode") as DarkMode) || "system"
  );

  // Track whether the OS prefers dark (live, updates on system change).
  // The MediaQueryList is created *inside* the effect so the dependency array
  // can honestly be empty — calling matchMedia() during render produced a new
  // wrapper object on every render, so it could never be a dependency and the
  // subscription was made against a stale one.
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    // Re-read now: the OS preference can flip between the initial render and
    // this effect running, which would otherwise be missed until the next
    // change event.
    setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Derived: is dark actually active right now?
  const isDark =
    darkMode === "dark" || (darkMode === "system" && systemPrefersDark);

  // Apply / remove body.dark + html.ion-palette-dark whenever the effective
  // state changes. Both hooks must move together: page SCSS keys off body.dark,
  // while Ionic's class palette keys off ion-palette-dark.
  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark");
      document.documentElement.classList.add("ion-palette-dark");
    } else {
      document.body.classList.remove("dark");
      document.documentElement.classList.remove("ion-palette-dark");
    }
  }, [isDark]);

  // ── Security toggles: source of truth is Capacitor Preferences ──────────
  // Start as false; the async init below loads the real persisted values.
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pinEnabled, setPinEnabledState] = useState(false);

  // Load the real security state from Capacitor Preferences on mount.
  // On web this reads from localStorage under the "CapacitorStorage." prefix,
  // which is where BiometricAuthService (savePin, setBiometricEnabled, etc.)
  // also writes — so they always agree.
  useEffect(() => {
    Promise.all([isBiometricEnabled(), isPinEnabled()]).then(
      ([bioEn, pinEn]) => {
        setBiometricEnabledState(bioEn);
        setPinEnabledState(pinEn);
      }
    );
  }, []);

  useEffect(() => {
    // Keep <html lang> in sync. `language` is read from localStorage
    // synchronously, so this is correct on mount, but the in-app language
    // switcher calls setLanguage() later — with an empty dependency array the
    // attribute would stay frozen at the startup language.
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const sizes = { small: "14px", medium: "16px", large: "18px" };
    // Scale the rem-based type scale (--hc-text-*) by changing the root font
    // size, and expose the value for Ionic components that consume it.
    document.documentElement.style.fontSize = sizes[fontSize];
    document.documentElement.style.setProperty("--ion-font-size", sizes[fontSize]);
  }, [fontSize]);

  // ── Setters ──────────────────────────────────────────────────────────────

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("hc_language", lang);
    document.documentElement.lang = lang;
  };

  const setDarkMode = (mode: DarkMode) => {
    setDarkModeState(mode);
    localStorage.setItem("hc_darkMode", mode);
  };

  const setNotificationsEnabled = (v: boolean) => {
    setNotificationsEnabledState(v);
    localStorage.setItem("hc_notifications", String(v));
  };

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    localStorage.setItem("hc_sound", String(v));
  };

  const setFontSize = (s: "small" | "medium" | "large") => {
    setFontSizeState(s);
    localStorage.setItem("hc_fontSize", s);
  };

  /**
   * Called from SettingsPage after BiometricAuthService.setBiometricEnabled()
   * succeeds. We also write via the service so Preferences is always in sync.
   */
  const setBiometricEnabledSetting = (v: boolean) => {
    setBiometricEnabledState(v);
    // Write to Capacitor Preferences so the app lock can read it.
    setBiometricEnabledPref(v);
  };

  /**
   * Called from SettingsPage after savePin() / disablePin() succeeds.
   * savePin() already sets hc_pin_enabled in Preferences; disablePin() clears
   * it. We just mirror the value into local React state here.
   */
  const setPinEnabledSetting = (v: boolean) => {
    setPinEnabledState(v);
    // No extra Preferences write needed — savePin/disablePin handle it.
  };

  /**
   * Translate `key` into the active language.
   *
   * `params` substitutes `{name}` slots in the template — needed for copy that
   * embeds a runtime value (a length bound, the user's email, the biometric
   * method name). French frequently reorders or expands these, so the slot has
   * to live in the dictionary rather than being concatenated at the call site.
   *
   * Slots with no matching param are left verbatim rather than blanked, so a
   * missing param is visible instead of silently swallowing content.
   *
   * An unknown key returns the key itself, which makes missing translations
   * obvious during development.
   */
  const t = (
    key: string,
    params?: Record<string, string | number>,
  ): string => {
    const template = translations[language][key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      params[name] !== undefined ? String(params[name]) : match,
    );
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        t,
        notificationsEnabled,
        setNotificationsEnabled,
        soundEnabled,
        setSoundEnabled,
        fontSize,
        setFontSize,
        darkMode,
        setDarkMode,
        isDark,
        biometricEnabled,
        setBiometricEnabledSetting,
        pinEnabled,
        setPinEnabledSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
