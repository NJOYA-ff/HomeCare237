/// <reference types="@capacitor-community/safe-area" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.homecare237.starter",
  appName: "HomeCare237",
  webDir: "dist",
  // Native window colour behind the WebView — kept in sync with the light
  // app chrome. Runtime page colours are applied by SafeAreaThemeSync.
  backgroundColor: "#ffffff",
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: true,
  },
  ios: {
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 3000,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#04589dff",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      // ic_stat_health — white-on-transparent drawable from the
      // health_status_notification_icons pack, placed in drawable-* density
      // folders.  Android tints this with iconColor below.
      // Do NOT use a mipmap resource here — Android ignores the colour
      // channels of mipmap icons for the status bar slot.
      smallIcon: "ic_stat_health",
      iconColor: "#2563EB",
      sound: "beep.wav",
    },
    // Edge-to-edge safe areas: initial bar content style (light icons on
    // splash/brand). SafeAreaThemeSync updates this per route + theme.
    SafeArea: {
      statusBarStyle: "DARK",
      navigationBarStyle: "DARK",
      detectViewportFitCoverChanges: true,
      initialViewportFitCover: true,
    },
    GoogleAuth: {
      // The Web Client ID from Firebase Console → Authentication → Sign-in method → Google.
      // This is the OAuth 2.0 client of type "Web application" (client_type: 3).
      // It is the SAME for both Android and web — the native Android SDK needs it
      // to validate the ID token with Google's servers.
      scopes: ["profile", "email"],
      serverClientId: "770997904222-upkuve0qgasnfham5q31rc1qoj218vuv.apps.googleusercontent.com",
      // forceCodeForRefreshToken must be true so Firebase gets an idToken it can
      // exchange for a Firebase credential on Android.
      forceCodeForRefreshToken: true,
    },
      androidScheme: "https",
    },
  },
};

export default config;
