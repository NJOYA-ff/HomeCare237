import React from "react";
import "ldrs/helix";

interface LoadingHelixProps {
  size?: number;
  color?: string;
  speed?: number;
  className?: string;
}

const LoadingHelix: React.FC<LoadingHelixProps> = ({
  size = 32,
  color = "var(--ion-color-primary)",
  speed = 2.5,
  className,
}) => (
  <span className={className} aria-label="Loading" role="status">
    {React.createElement("l-helix", {
      size,
      color,
      speed,
    })}
  </span>
);

export default LoadingHelix;

interface LoadingHelixOverlayProps extends LoadingHelixProps {
  isOpen: boolean;
  message?: string;
}

export const LoadingHelixOverlay: React.FC<LoadingHelixOverlayProps> = ({
  isOpen,
  message,
  size = 36,
  color,
  speed,
}) => {
  if (!isOpen) return null;

  return (
    <div className="helix-loading-overlay" role="status" aria-live="polite">
      <div className="helix-loading-dialog">
        <LoadingHelix size={size} color={color} speed={speed} />
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};
