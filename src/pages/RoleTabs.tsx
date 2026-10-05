/**
 * Shared onboarding bottom-sheet tabs for the landing page and role pickers.
 *
 * Renders the frosted-glass bar with two side-by-side tabs, like the mockup:
 * one plain label and one lifted white card carrying the accent-colour label.
 * Exactly one side is highlighted through `leftActive`.
 */
interface RoleTabsProps {
  /** Label of the plain tab on the left. */
  leftLabel: string;
  /** Label of the tab on the right. */
  rightLabel: string;
  /** Destination of the left tab. */
  onLeft: () => void;
  /** Destination of the right tab. */
  onRight: () => void;
  /** When true the left tab is the lifted white card, otherwise the right. */
  leftActive?: boolean;
}

const RoleTabs: React.FC<RoleTabsProps> = ({
  leftLabel,
  rightLabel,
  onLeft,
  onRight,
  leftActive = false,
}) => {
  const leftClass = leftActive ? "ob-tab ob-tab-active" : "ob-tab";
  const rightClass = leftActive
    ? "ob-tab"
    : "ob-tab ob-tab-active ob-tab-active-right";

  return (
    <div className="ob-sheet" role="group" aria-label={`${leftLabel} or ${rightLabel}`}>
      <button type="button" className={leftClass} onClick={onLeft}>
        {leftLabel}
      </button>
      <button type="button" className={rightClass} onClick={onRight}>
        {rightLabel}
      </button>
    </div>
  );
};

export default RoleTabs;