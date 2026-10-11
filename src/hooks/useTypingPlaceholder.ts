import { useEffect, useRef, useState } from "react";

interface TypingPlaceholderOptions {
  /** List of phrases to cycle through */
  phrases: string[];
  /** Delay between each character being typed (ms) */
  typeSpeed?: number;
  /** Delay between each character being deleted (ms) */
  deleteSpeed?: number;
  /** Pause after finishing typing a phrase before deleting starts (ms) */
  pauseAfterType?: number;
  /** Pause after fully deleting a phrase before typing the next one (ms) */
  pauseAfterDelete?: number;
}

/**
 * Returns an animated placeholder string that types and deletes phrases
 * in an infinite loop, simulating a fast typewriter effect.
 */
export function useTypingPlaceholder({
  phrases,
  typeSpeed = 60,
  deleteSpeed = 35,
  pauseAfterType = 1200,
  pauseAfterDelete = 300,
}: TypingPlaceholderOptions): string {
  const [displayed, setDisplayed] = useState("");
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!phrases.length) return;

    const tick = () => {
      const currentPhrase = phrases[phraseIndex.current];

      if (!isDeleting.current) {
        // Typing forward
        charIndex.current += 1;
        setDisplayed(currentPhrase.slice(0, charIndex.current));

        if (charIndex.current === currentPhrase.length) {
          // Finished typing — pause then start deleting
          isDeleting.current = true;
          timeoutRef.current = setTimeout(tick, pauseAfterType);
          return;
        }
        timeoutRef.current = setTimeout(tick, typeSpeed);
      } else {
        // Deleting backward
        charIndex.current -= 1;
        setDisplayed(currentPhrase.slice(0, charIndex.current));

        if (charIndex.current === 0) {
          // Finished deleting — move to next phrase, pause then start typing
          isDeleting.current = false;
          phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
          timeoutRef.current = setTimeout(tick, pauseAfterDelete);
          return;
        }
        timeoutRef.current = setTimeout(tick, deleteSpeed);
      }
    };

    timeoutRef.current = setTimeout(tick, pauseAfterDelete);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // Intentionally only run once on mount — phrases array identity is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return displayed;
}
