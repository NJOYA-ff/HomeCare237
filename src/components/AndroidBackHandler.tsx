import React from "react";
import {
  useAndroidBackButton,
  type BackButtonRole,
} from "./hooks/useAndroidBackButton";

/**
 * Must render inside <IonReactRouter> so useLocation works.
 * Invisible — only registers the hardware back listener.
 */
const AndroidBackHandler: React.FC<{ role: BackButtonRole }> = ({ role }) => {
  useAndroidBackButton(role);
  return null;
};

export default AndroidBackHandler;
