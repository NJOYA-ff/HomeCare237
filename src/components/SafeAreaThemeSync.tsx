import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import {
  applySafeAreaAppearance,
  resolveSafeAreaAppearance,
  samplePageSafeAreaAppearance,
} from "../utils/safeAreaTheme";

/**
 * Keeps safe-area / system-bar chrome matched to the active route + theme,
 * then re-samples the visible page so header / tab / content colours win.
 * Must render inside <IonReactRouter> and <SettingsProvider>.
 */
const SafeAreaThemeSync: React.FC = () => {
  const { pathname } = useLocation();
  const { isDark } = useSettings();

  useEffect(() => {
    const fallback = resolveSafeAreaAppearance(pathname, isDark);
    void applySafeAreaAppearance(fallback);

    let cancelled = false;
    let frames = 0;
    let rafId = 0;

    const sample = () => {
      if (cancelled) return;
      void applySafeAreaAppearance(samplePageSafeAreaAppearance(fallback));
    };

    // Ionic page enter / leave can lag behind the location change; sample a
    // few frames out and once more after the transition settles.
    const tick = () => {
      if (cancelled) return;
      sample();
      frames += 1;
      if (frames < 3) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    const settleTimer = window.setTimeout(sample, 320);

    const onVisibility = () => {
      if (document.visibilityState === "visible") sample();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ionViewDidEnter bubbles from the active IonPage after enter animations.
    const onPageEnter = () => sample();
    document.addEventListener("ionViewDidEnter", onPageEnter);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(settleTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("ionViewDidEnter", onPageEnter);
    };
  }, [pathname, isDark]);

  return null;
};

export default SafeAreaThemeSync;
