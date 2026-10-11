import React, { useEffect, useState } from "react";

import { DEFAULT_AVATAR } from "../../utils/profileImageStorage";
import "./DashboardProfileCard.scss";

export interface DashboardProfileCardProps {
  /** Display name shown as the card title. */
  name: string;
  /** Small eyebrow label above the name, e.g. "Patient" or "Doctor". */
  roleLabel?: string;
  /** Secondary line, e.g. the user's email or specialty. */
  subtitle?: string;
  /** Resolved profile picture URL. Falls back to the bundled default avatar. */
  avatar?: string;
  className?: string;
}

/**
 * Profile summary card used at the top of each role's dashboard.
 *
 * Shows the signed-in user's picture (or the bundled default avatar when there
 * is none / it fails to load) alongside their name and role.
 */
const DashboardProfileCard: React.FC<DashboardProfileCardProps> = ({
  name,
  roleLabel,
  subtitle,
  avatar,
  className,
}) => {
  const [src, setSrc] = useState(avatar || DEFAULT_AVATAR);

  useEffect(() => {
    setSrc(avatar || DEFAULT_AVATAR);
  }, [avatar]);

  return (
    <div className={["dpc", className].filter(Boolean).join(" ")}>
      <div className="dpc__avatar-ring">
        <img
          src={src}
          alt={name}
          onError={() => setSrc(DEFAULT_AVATAR)}
        />
      </div>

      <div className="dpc__body">
        {roleLabel && <span className="dpc__role">{roleLabel}</span>}
        <h2 className="dpc__name">{name}</h2>
        {subtitle && <p className="dpc__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
};

export default DashboardProfileCard;
