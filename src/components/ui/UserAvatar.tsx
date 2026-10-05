import React, { useState } from "react";

import { getInitials } from "../../utils/profileImage";
import { avatarColor } from "../../utils/avatarColor";

export interface UserAvatarProps {
  /** Resolved picture URL, or "" when the user has no picture. */
  src?: string;
  /** Used for the initials fallback and for the deterministic colour. */
  name: string;
  /** Square size in px. Matches the 48px design of the admin list rows. */
  size?: number;
  className?: string;
  /** Extra styles merged onto the wrapper (background colour, radius…). */
  style?: React.CSSProperties;
  /** Overrides the initials-derived background colour. */
  background?: string;
}

/**
 * Avatar that shows the user's picture when there is one and their initials
 * when there is not.
 *
 * The admin lists previously always rendered initials, so a photo uploaded at
 * signup was never visible there even after the field name was fixed. This
 * component centralises the "photo → initials" decision and, crucially, reacts
 * to a *load failure* by dropping to initials instead of leaving a broken-image
 * glyph on screen.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 48,
  className,
  style,
  background,
}) => {
  // Start in the "failed" state when there is no picture at all, so we render
  // initials immediately rather than flashing an empty box.
  const [failed, setFailed] = useState(!src);
  const showImage = Boolean(src) && !failed;

  // Reset when a different picture arrives (e.g. after an upload).
  React.useEffect(() => {
    setFailed(!src);
  }, [src]);

  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    ...style,
  };

  if (showImage) {
    return (
      <div className={className} style={wrapperStyle}>
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...wrapperStyle,
        background: background || avatarColor(name || "?"),
        color: "#fff",
        fontWeight: 800,
        fontSize: Math.max(12, Math.round(size * 0.33)),
        letterSpacing: "0.5px",
      }}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default UserAvatar;