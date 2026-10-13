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
      smallIcon: "ic_notification",
      iconColor: "#488AFF",
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
    server: {
      androidScheme: "https",
    },
  },
};

export default config;
