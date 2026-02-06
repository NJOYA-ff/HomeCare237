import { App } from "@capacitor/app";
import { useEffect } from "react";

export const useCloseApp = () => {
  useEffect(() => {
    const backbuttonListenerPromise = App.addListener("backButton", () => {
      App.exitApp();
    });
    return () => {
      backbuttonListenerPromise.then((listener) => listener.remove());
    };
  }, []);
};
