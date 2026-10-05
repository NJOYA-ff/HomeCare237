import React from "react";

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  eyebrow,
  description,
  action,
  className = "",
}) => (
  <div className={`hc-section-header ${className}`.trim()}>
    <div>
      {eyebrow && <span className="hc-section-header__eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {action && <div className="hc-section-header__action">{action}</div>}
  </div>
);

export default SectionHeader;
