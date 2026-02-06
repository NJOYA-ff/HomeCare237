import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "io.ionic.starter",
  appName: "HomeCare237",
  webDir: "dist",
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
    server: {
      androidScheme: "https",
    },
  },
};

export default config;
