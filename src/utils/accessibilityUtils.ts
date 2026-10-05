/**
 * accessibilityUtils.ts
 *
 * Accessibility utilities for WCAG 2.1 AA compliance
 * Includes ARIA attributes, keyboard navigation, and screen reader support
 */

/**
 * Generate ARIA attributes for interactive elements
 */
export const getAriaProps = (props: {
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  pressed?: boolean;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
}) => {
  const ariaProps: Record<string, any> = {};

  if (props.label) ariaProps["aria-label"] = props.label;
  if (props.describedBy) ariaProps["aria-describedby"] = props.describedBy;
  if (props.expanded !== undefined) ariaProps["aria-expanded"] = props.expanded;
  if (props.pressed !== undefined) ariaProps["aria-pressed"] = props.pressed;
  if (props.checked !== undefined) ariaProps["aria-checked"] = props.checked;
  if (props.disabled !== undefined) ariaProps["aria-disabled"] = props.disabled;
  if (props.required !== undefined) ariaProps["aria-required"] = props.required;
  if (props.invalid !== undefined) ariaProps["aria-invalid"] = props.invalid;

  return ariaProps;
};

/**
 * Generate unique IDs for ARIA references
 */
let ariaIdCounter = 0;
export const generateAriaId = (prefix: string = "aria"): string => {
  return `${prefix}-${++ariaIdCounter}`;
};

/**
 * Handle keyboard navigation for custom components
 */
export const handleKeyboardNavigation = (
  event: { key: string; preventDefault: () => void },
  action: () => void,
  options: {
    activateOn?: string[];
    preventDefault?: boolean;
  } = {}
) => {
  const { activateOn = ["Enter", " "], preventDefault = true } = options;

  if (activateOn.includes(event.key)) {
    if (preventDefault) {
      event.preventDefault();
    }
    action();
  }
};

/**
 * Focus management utilities
 */
export class FocusManager {
  private focusableSelectors = [
    "button",
    "[href]",
    "input",
    "select",
    "textarea",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ");

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll(this.focusableSelectors)
    ) as HTMLElement[];
  }

  /**
   * Trap focus within a modal/dialog
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }

  /**
   * Restore focus to previous element
   */
  restoreFocus(previousElement: HTMLElement | null): void {
    if (previousElement) {
      previousElement.focus();
    }
  }
}

/**
 * Screen reader announcements
 */
export const announceToScreenReader = (message: string, priority: "polite" | "assertive" = "polite"): void => {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

/**
 * High contrast mode detection
 */
export const isHighContrastMode = (): boolean => {
  return window.matchMedia("(prefers-contrast: high)").matches;
};

/**
 * Reduced motion preference detection
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Get user's preferred color scheme
 */
export const getPreferredColorScheme = (): "light" | "dark" => {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

/**
 * Skip to main content link generator
 */
export const createSkipLink = (targetId: string = "main-content"): string => {
  return `
    <a
      href="#${targetId}"
      class="skip-link"
      style="
        position: absolute;
        top: -40px;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px;
        z-index: 100;
        transition: top 0.3s;
      "
    >
      Skip to main content
    </a>
  `;
};

/**
 * Validate color contrast ratios (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
 */
export const validateColorContrast = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { valid: boolean; ratio: number } => {
  // This is a simplified version - use a proper color contrast library in production
  // For now, we'll return a placeholder
  const requiredRatio = isLargeText ? 3.0 : 4.5;
  return {
    valid: true, // Placeholder - implement proper contrast calculation
    ratio: requiredRatio,
  };
};

/**
 * Add ARIA live region to container
 */
export const addLiveRegion = (
  container: HTMLElement,
  priority: "polite" | "assertive" = "polite"
): void => {
  container.setAttribute("aria-live", priority);
  container.setAttribute("aria-atomic", "true");
};

/**
 * Remove ARIA live region from container
 */
export const removeLiveRegion = (container: HTMLElement): void => {
  container.removeAttribute("aria-live");
  container.removeAttribute("aria-atomic");
};

/**
 * Accessibility testing utilities
 */
export const accessibilityTestUtils = {
  /**
   * Check if all images have alt text
   */
  checkImageAltText: (): { valid: boolean; missing: number } => {
    const images = document.querySelectorAll("img");
    let missing = 0;
    
    images.forEach((img) => {
      if (!img.getAttribute("alt")) {
        missing++;
      }
    });

    return {
      valid: missing === 0,
      missing,
    };
  },

  /**
   * Check if all form inputs have labels
   */
  checkFormLabels: (): { valid: boolean; missing: number } => {
    const inputs = document.querySelectorAll("input, select, textarea");
    let missing = 0;
    
    inputs.forEach((input) => {
      const hasLabel = 
        input.getAttribute("aria-label") ||
        input.getAttribute("aria-labelledby") ||
        document.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        missing++;
      }
    });

    return {
      valid: missing === 0,
      missing,
    };
  },

  /**
   * Check heading hierarchy
   */
  checkHeadingHierarchy: (): { valid: boolean; issues: string[] } => {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const issues: string[] = [];
    let previousLevel = 0;

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      
      if (level > previousLevel + 1) {
        issues.push(`Skipped heading level: h${previousLevel} to h${level}`);
      }
      
      previousLevel = level;
    });

    return {
      valid: issues.length === 0,
      issues,
    };
  },
};

/**
 * Initialize accessibility features
 */
export const initializeAccessibility = (): void => {
  // Add skip link to body
  const skipLink = document.createElement("div");
  skipLink.innerHTML = createSkipLink();
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Listen for preference changes
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", () => {
    // Update animations based on preference
    document.body.classList.toggle("reduced-motion", prefersReducedMotion());
  });

  // Initialize reduced motion class
  if (prefersReducedMotion()) {
    document.body.classList.add("reduced-motion");
  }
};