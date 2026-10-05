/**
 * Profile picture resolution tests.
 *
 * Regression cover for the bug where uploaded pictures never appeared: readers
 * asked for field names (`profileImage`, `profilePicture`, `photo`) that no
 * write path ever produced, and treated the value as a Storage *path* while the
 * writers stored a download *URL*. These tests pin both the field precedence
 * and the URL-vs-path behaviour.
 */
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AVATAR,
  getInitials,
  handleImageError,
  IMAGE_FIELDS,
  isAbsoluteUrl,
  isUsableImageValue,
  pickImageField,
  resolveDocumentImage,
  toDisplayUrl,
} from "../profileImage";

/** What PatientSignup/DoctorSignup actually write. */
const FIREBASE_DOWNLOAD_URL =
  "https://firebasestorage.googleapis.com/v0/b/homecare.firebasestorage.app/o/profilePhotos%2Fabc%2Fprofile.png?alt=media&token=tok";

describe("isUsableImageValue", () => {
  it("accepts a real download URL", () => {
    expect(isUsableImageValue(FIREBASE_DOWNLOAD_URL)).toBe(true);
  });

  it("accepts a local asset path", () => {
    expect(isUsableImageValue(DEFAULT_AVATAR)).toBe(true);
  });

  it("rejects empty and whitespace-only values", () => {
    expect(isUsableImageValue("")).toBe(false);
    expect(isUsableImageValue("   ")).toBe(false);
  });

  it("rejects non-strings, including Firestore Timestamp objects", () => {
    expect(isUsableImageValue(null)).toBe(false);
    expect(isUsableImageValue(undefined)).toBe(false);
    expect(isUsableImageValue(42)).toBe(false);
    expect(isUsableImageValue({ toDate: () => new Date() })).toBe(false);
  });

  it("rejects stringified empty values", () => {
    expect(isUsableImageValue("null")).toBe(false);
    expect(isUsableImageValue("undefined")).toBe(false);
    expect(isUsableImageValue("[object Object]")).toBe(false);
  });

  it("rejects the legacy remote placeholder so it is never rendered", () => {
    expect(
      isUsableImageValue("https://ionicframework.com/docs/img/demos/avatar.svg"),
    ).toBe(false);
  });
});

describe("pickImageField", () => {
  it("reads profilePhoto, the field signup writes", () => {
    expect(pickImageField({ profilePhoto: FIREBASE_DOWNLOAD_URL })).toBe(
      FIREBASE_DOWNLOAD_URL,
    );
  });

  it("reads the legacy field names readers used to miss", () => {
    expect(pickImageField({ profileImage: FIREBASE_DOWNLOAD_URL })).toBe(
      FIREBASE_DOWNLOAD_URL,
    );
    expect(pickImageField({ profilePicture: FIREBASE_DOWNLOAD_URL })).toBe(
      FIREBASE_DOWNLOAD_URL,
    );
    expect(pickImageField({ photoURL: FIREBASE_DOWNLOAD_URL })).toBe(
      FIREBASE_DOWNLOAD_URL,
    );
    expect(pickImageField({ photo: FIREBASE_DOWNLOAD_URL })).toBe(
      FIREBASE_DOWNLOAD_URL,
    );
  });

  it("prefers profilePhoto over the other aliases", () => {
    expect(
      pickImageField({
        profilePhoto: "https://example.com/a.png",
        avatar: "https://example.com/b.png",
        photoURL: "https://example.com/c.png",
      }),
    ).toBe("https://example.com/a.png");
  });

  it("skips an empty alias and falls through to the next one", () => {
    expect(
      pickImageField({
        profilePhoto: "",
        profileImage: null,
        photoURL: "   ",
        avatar: "https://example.com/b.png",
      }),
    ).toBe("https://example.com/b.png");
  });

  it("skips a legacy placeholder and picks the real picture", () => {
    expect(
      pickImageField({
        avatar: "https://ionicframework.com/docs/img/demos/avatar.svg",
        profilePhoto: FIREBASE_DOWNLOAD_URL,
      }),
    ).toBe(FIREBASE_DOWNLOAD_URL);
  });

  it("returns an empty string when there is no picture at all", () => {
    expect(pickImageField({ name: "Ada" })).toBe("");
describe("isAbsoluteUrl", () => {
  it("treats URLs and root-relative paths as directly usable", () => {
    expect(isAbsoluteUrl(FIREBASE_DOWNLOAD_URL)).toBe(true);
    expect(isAbsoluteUrl("http://example.com/a.png")).toBe(true);
    expect(isAbsoluteUrl(DEFAULT_AVATAR)).toBe(true);
    expect(isAbsoluteUrl("data:image/png;base64,AAA")).toBe(true);
  });

  it("treats a bare storage path as needing resolution", () => {
    expect(isAbsoluteUrl("doctors/abc/profile.png")).toBe(false);
  });
});

describe("toDisplayUrl", () => {
  it("passes an absolute URL straight through without resolving", async () => {
    const resolver = vi.fn();
    await expect(toDisplayUrl(FIREBASE_DOWNLOAD_URL, resolver)).resolves.toBe(
      FIREBASE_DOWNLOAD_URL,
    );
    expect(resolver).not.toHaveBeenCalled();
  });

  it("resolves a legacy bare storage path", async () => {
    const resolver = vi.fn(async () => FIREBASE_DOWNLOAD_URL);
    await expect(
      toDisplayUrl("profilePhotos/abc/profile.png", resolver),
    ).resolves.toBe(FIREBASE_DOWNLOAD_URL);
    expect(resolver).toHaveBeenCalledWith("profilePhotos/abc/profile.png");
  });

  it("returns empty for a storage path when no resolver is supplied", async () => {
    await expect(toDisplayUrl("profilePhotos/abc/profile.png")).resolves.toBe(
      "",
    );
  });

  it("swallows resolver failures so callers can fall back to initials", async () => {
    const resolver = vi.fn(async () => {
      throw new Error("storage/object-not-found");
    });
    await expect(
      toDisplayUrl("profilePhotos/gone/profile.png", resolver),
    ).resolves.toBe("");
  });

  it("rejects a resolver that returns an unusable value", async () => {
    const resolver = vi.fn(async () => "");
    await expect(
      toDisplayUrl("profilePhotos/abc/profile.png", resolver),
    ).resolves.toBe("");
  });

  it("returns empty for unusable input", async () => {
    await expect(toDisplayUrl("")).resolves.toBe("");
    await expect(toDisplayUrl(null)).resolves.toBe("");
    await expect(toDisplayUrl(undefined)).resolves.toBe("");
  });
});

describe("resolveDocumentImage", () => {
  it("finds the picture no matter which alias holds it", async () => {
    await expect(
      resolveDocumentImage({ profileImage: FIREBASE_DOWNLOAD_URL }),
    ).resolves.toBe(FIREBASE_DOWNLOAD_URL);
  });

  it("resolves a legacy path held in an alias field", async () => {
    await expect(
      resolveDocumentImage(
        { profilePhoto: "doctors/abc/profile.png" },
        async () => FIREBASE_DOWNLOAD_URL,
      ),
    ).resolves.toBe(FIREBASE_DOWNLOAD_URL);
  });

  it("returns empty for a document with no picture", async () => {
    await expect(resolveDocumentImage({ name: "Ada" })).resolves.toBe("");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Jean Ndom")).toBe("JN");
  });

  it("handles a single name", () => {
    expect(getInitials("Cher")).toBe("C");
  });

  it("collapses extra whitespace", () => {
    expect(getInitials("  Marie   Claire  ")).toBe("MC");
  });

  it("never exceeds the requested length", () => {
    expect(getInitials("Ana Beatriz Claire Duarte")).toBe("AB");
    expect(getInitials("Ana Beatriz Claire Duarte", 3)).toBe("ABC");
  });

  it("falls back to ? for empty or non-string names", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials(undefined)).toBe("?");
  });
});

describe("handleImageError", () => {
  it("swaps in the local placeholder once", () => {
    const img = document.createElement("img");
    img.src = "https://broken.example.com/x.png";
    handleImageError({ currentTarget: img });
    expect(img.src).toContain(DEFAULT_AVATAR);
  });

  it("does not loop when the placeholder itself fails", () => {
    const img = document.createElement("img");
    handleImageError({ currentTarget: img });
    const afterFirst = img.src;
    handleImageError({ currentTarget: img });
    expect(img.src).toBe(afterFirst);
  });
});
    expect(pickImageField({})).toBe("");
  });

  it("returns an empty string for non-object input", () => {
    expect(pickImageField(null)).toBe("");
    expect(pickImageField(undefined)).toBe("");
    expect(pickImageField("https://example.com/a.png")).toBe("");
  });

  it("covers every field name it advertises", () => {
    for (const field of IMAGE_FIELDS) {
      expect(pickImageField({ [field]: "https://example.com/x.png" })).toBe(
        "https://example.com/x.png",
      );
    }
  });
});