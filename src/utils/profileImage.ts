/**
 * Profile picture resolution — pure helpers, no Firebase imports.
 *
 * Why this exists
 * ---------------
 * Profile pictures were written under six different field names by six
 * different code paths (`profilePhoto` at signup, `photoURL` for admins,
 * `avatar` for doctors editing their profile, …) while the readers asked for
 * names nobody ever wrote (`profileImage`, `profilePicture`, `photo`). The
 * result was that real uploaded photos were never displayed and every list
 * silently fell back to the placeholder.
 *
 * Rather than pick a winner and migrate every document, readers now go through
 * `pickImageField`, which understands all of the historical field names, and
 * `toDisplayUrl`, which accepts both a ready-to-use URL and a bare Firebase
 * Storage path (legacy documents stored the path, not the download URL).
 *
 * This module is intentionally free of Firebase imports so it can be unit
 * tested in isolation; see `profileImageStorage.ts` for the async wrapper.
 */

/**
 * Locally bundled placeholder. Deliberately *not* a remote URL: the previous
 * `https://ionicframework.com/.../avatar.svg` placeholder meant that a lost
 * internet connection (common on the Cameroonian mobile networks this app
 * targets) broke the avatar on every screen at once.
 */
export const DEFAULT_AVATAR = "/avatars/default-avatar.svg";

/**
 * Historical field names, in priority order. The first non-empty, usable value
 * wins. `profilePhoto` comes first because it is what both signup flows write.
 */
export const IMAGE_FIELDS = [
  "profilePhoto",
  "profileImage",
  "profilePicture",
  "photoURL",
  "avatarUrl",
  "patientImage",
  "avatar",
  "image",
  "photo",
] as const;

/**
 * True when `value` is a string that could plausibly be rendered in an `<img>`.
 * Rejects empty strings, non-strings, `"null"`/`"undefined"` stringified by
 * Firestore, and the legacy placeholder URLs.
 */
export function isUsableImageValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === "null" || trimmed === "undefined" || trimmed === "[object Object]") {
    return false;
  }
  if (PLACEHOLDER_URLS.has(trimmed)) return false;
  return true;
}

/**
 * Returns the first usable picture value from a Firestore document, checking
 * every historical field name. Returns `""` when the document holds no picture,
 * which lets callers fall back to initials instead of a broken image.
 */
export function pickImageField(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  for (const field of IMAGE_FIELDS) {
    const value = record[field];
    if (isUsableImageValue(value)) return value.trim();
  }
  return "";
}

/**
 * True for values that can be used as an `<img src>` as-is: absolute URLs,
 * protocol-relative URLs, `data:`/`blob:` URIs and root-relative paths such as
 * {@link DEFAULT_AVATAR}. Everything else is assumed to be a Firebase Storage
 * object path and must be resolved with `getDownloadURL`.
 */
export function isAbsoluteUrl(value: string): boolean {
  return /^(?:https?:|data:|blob:|\/)/i.test(value);
}

/** Type of the resolver injected by `toDisplayUrl` for legacy storage paths. */
export type StoragePathResolver = (path: string) => Promise<string>;

/**
 * Normalises a stored picture value into something an `<img>` can load.
 *
 * @param value       the raw stored value (URL or storage path)
 * @param resolvePath resolves a legacy storage path; when omitted such values
 *                     resolve to `""` (callers then render initials)
 */
export async function toDisplayUrl(
  value: unknown,
  resolvePath?: StoragePathResolver,
): Promise<string> {
  if (!isUsableImageValue(value)) return "";
  const trimmed = value.trim();
  if (isAbsoluteUrl(trimmed)) return trimmed;
  if (!resolvePath) return "";
  try {
    const resolved = await resolvePath(trimmed);
    return isUsableImageValue(resolved) ? resolved.trim() : "";
  } catch {
    // Missing object, no permission, offline — all mean "no usable picture".
    return "";
  }
}

/**
 * `pickImageField` + `toDisplayUrl` in one call: the standard way for a page to
 * turn a Firestore document into an `<img src>`.
 */
export async function resolveDocumentImage(
  data: unknown,
  resolvePath?: StoragePathResolver,
): Promise<string> {
  return toDisplayUrl(pickImageField(data), resolvePath);
}

/**
 * Initials used by the avatar fallbacks, e.g. `"Jean-Pierre Ndom"` → `"JN"`.
 * Mirrors the inline `split(" ").map(p => p[0])…` logic the list rows already
 * use, so the fallback looks identical to the existing avatars.
 */
export function getInitials(name: unknown, max = 2): string {
  if (typeof name !== "string") return "?";
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
  return initials || "?";
}

/**
 * `onError` handler for `<img>` avatars: swaps in the local placeholder exactly
 * once. Without the guard, a failing `src` would re-trigger `error` forever.
 */
export function handleImageError(
  event: { currentTarget: HTMLImageElement },
): void {
  const img = event.currentTarget;
  if (!img || img.dataset.fallbackApplied === "true") return;
  img.dataset.fallbackApplied = "true";
  img.src = DEFAULT_AVATAR;
}
/**
 * Placeholder URLs that were historically written *into* Firestore documents
 * (see `Admin_doctor.tsx` / `Admin_patient.tsx`, which stamped the Ionic demo
 * avatar onto every record they created). They are treated as "no picture" so we
 * never render a dead remote URL, which would otherwise permanently mask the
 * picture a user uploads later.
 */
const PLACEHOLDER_URLS = new Set([
  "https://ionicframework.com/docs/img/demos/avatar.svg",
  "http://ionicframework.com/docs/img/demos/avatar.svg",
  "//ionicframework.com/docs/img/demos/avatar.svg",
]);