import { getDownloadURL, ref } from "firebase/storage";

import { storage } from "../firebaseconfig";
import {
  StoragePathResolver,
  toDisplayUrl,
  pickImageField,
  resolveDocumentImage,
} from "./profileImage";

/**
 * Firebase-backed profile picture resolution.
 *
 * Splits the pure logic (`profileImage.ts`) from the SDK calls so the field-name
 * and URL-vs-path rules stay unit testable without mocking the Firebase SDK.
 */

/** Resolves a Firebase Storage object path to its download URL. */
export const resolveStoragePath: StoragePathResolver = async (path) => {
  const snapshot = await getDownloadURL(ref(storage, path));
  return snapshot;
};

/**
 * Turns a Firestore document into an `<img src>`, or `""` when there is no
 * usable picture. Handles both download URLs and legacy bare storage paths.
 */
export async function getDocumentImageUrl(data: unknown): Promise<string> {
  return resolveDocumentImage(data, resolveStoragePath);
}

/** As {@link getDocumentImageUrl}, for a single already-extracted value. */
export async function getImageUrl(value: unknown): Promise<string> {
  return toDisplayUrl(value, resolveStoragePath);
}

export {
  DEFAULT_AVATAR,
  getInitials,
  handleImageError,
  IMAGE_FIELDS,
  isAbsoluteUrl,
  isUsableImageValue,
  pickImageField,
} from "./profileImage";