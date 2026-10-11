/**
 * useCameraCapture
 *
 * Unified hook for picking / capturing a profile image.
 *
 * Behaviour:
 *  - On Android / iOS (Capacitor native):  uses @capacitor/camera so the
 *    user gets the native camera/gallery sheet with proper permissions.
 *  - On web: falls back to a hidden <input type="file" accept="image/*"> so
 *    the browser file picker is used (no Capacitor dependency required).
 *
 * Usage:
 *   const { fileInputRef, pickImage } = useCameraCapture({
 *     onImage: (file) => { ... do something with the File object ... },
 *   });
 *
 *   // In JSX:
 *   <input ref={fileInputRef} ... />         // web fallback – keep as before
 *   <button onClick={pickImage}>Change</button>
 */

import { useRef } from "react";
import { isPlatform } from "@ionic/react";
import {
  Camera,
  CameraResultType,
  CameraSource,
  CameraDirection,
} from "@capacitor/camera";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface CameraCaptureOptions {
  /** Called with the resolved File when the user picks / captures an image. */
  onImage: (file: File) => void | Promise<void>;
  /**
   * Called when an error occurs (bad file type, too large, camera denied …).
   * Defaults to console.error if omitted.
   */
  onError?: (message: string) => void;
  /** Max allowed file size in bytes. Defaults to 5 MB. */
  maxSizeBytes?: number;
  /** Image quality for Capacitor (0–100). Defaults to 90. */
  quality?: number;
  /** Which camera to open by default on native. Defaults to FRONT. */
  direction?: CameraDirection;
}

export function useCameraCapture({
  onImage,
  onError,
  maxSizeBytes = MAX_SIZE_BYTES,
  quality = 90,
  direction = CameraDirection.Front,
}: CameraCaptureOptions) {
  // Web fallback ref – consuming components keep their hidden <input> as-is
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = (msg: string) => {
    if (onError) onError(msg);
    else console.error("[useCameraCapture]", msg);
  };

  /**
   * Convert a dataUrl string to a File object so every code path
   * receives the same type regardless of platform.
   */
  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res  = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/jpeg" });
  };

  /** Native path — uses Capacitor Camera (Android / iOS) */
  const pickNative = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType:  CameraResultType.DataUrl,
        source:      CameraSource.Prompt,   // lets user choose camera or gallery
        quality,
        direction,
        correctOrientation: true,
        allowEditing: false,
      });

      if (!photo.dataUrl) {
        handleError("No image data returned from camera.");
        return;
      }

      const file = await dataUrlToFile(
        photo.dataUrl,
        `photo_${Date.now()}.jpg`,
      );

      if (file.size > maxSizeBytes) {
        handleError("Image must be less than 5 MB.");
        return;
      }

      await onImage(file);
    } catch (err: any) {
      // User cancelled — Camera throws "User cancelled photos app" or similar.
      // We silently swallow cancellations and only report real errors.
      const msg: string = err?.message ?? String(err);
      if (
        !msg.toLowerCase().includes("cancel") &&
        !msg.toLowerCase().includes("dismissed") &&
        !msg.toLowerCase().includes("no image")
      ) {
        handleError(msg);
      }
    }
  };

  /** Web path — triggers the hidden file input */
  const pickWeb = () => {
    fileInputRef.current?.click();
  };

  /**
   * Call this instead of `fileInputRef.current?.click()`.
   * It automatically picks the right path for the current platform.
   */
  const pickImage = () => {
    if (isPlatform("hybrid")) {
      pickNative();
    } else {
      pickWeb();
    }
  };

  /**
   * onChange handler for the web fallback <input type="file">.
   * On native this never fires, but it's safe to wire up regardless.
   */
  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      handleError("Please select an image file.");
      return;
    }

    if (file.size > maxSizeBytes) {
      handleError("Image must be less than 5 MB.");
      return;
    }

    await onImage(file);

    // Reset so the same file can be picked again later
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return {
    /** Ref to attach to the hidden <input type="file"> (web fallback). */
    fileInputRef,
    /**
     * Call this on button/avatar click.
     * Uses Capacitor Camera on native, file input on web.
     */
    pickImage,
    /**
     * Wire this to the hidden <input onChange>.
     * No-op on native (Camera.getPhoto already calls onImage directly).
     */
    handleFileInputChange,
  };
}
