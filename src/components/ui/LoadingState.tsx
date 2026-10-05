import React from "react";
import LoadingHelix from "../LoadingHelix";

interface LoadingStateProps {
  message?: string;
  size?: number;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  size = 36,
  className = "",
}) => (
  <div className={`hc-loading-state ${className}`.trim()}>
    <LoadingHelix size={size} />
    {message && <p>{message}</p>}
  </div>
);

export default LoadingState;
