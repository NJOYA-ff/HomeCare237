/**
 * useMessageBox
 *
 * The imperative counterpart to `<MessageBox />`, replacing `useIonAlert`.
 *
 * Nine call sites present a dialog from inside an event handler — a form submit,
 * a Firestore write — where there is no JSX position to put a dialog and the
 * state would have to be threaded through the handler anyway. Those use
 * `presentMessage(...)`; everything else renders the component directly.
 *
 * Mount `<MessageBoxProvider />` once, high in the tree (see App.tsx). It renders
 * a single MessageBox at the provider's own level, so the dialog is a sibling of
 * the page rather than something each screen has to remember to place.
 *
 * The `presentMessage` argument mirrors the parts of `AlertOptions` that were
 * actually in use across the app — header, message, and up to two buttons. The
 * parts nobody used (inputs, `cssClass`, `backdropDismiss`) are deliberately not
 * carried over; the box derives its own tone and styling from the actions.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import MessageBox, { MessageBoxAction, MessageBoxTone } from "./MessageBox";

export interface PresentMessageOptions {
  /** Short headline. */
  header: string;
  message?: string;
  tone?: MessageBoxTone;
  /**
   * The action that carries the meaning — "Remove", "Confirm", "OK". Give it a
   * colour that matches what it does (`danger` for a destructive write,
   * `primary` otherwise); it is the action that takes focus.
   */
  action: { text: string; color?: string; handler?: () => void };
  /**
   * Optional second action, rendered to the left. Defaults to a quiet "Cancel"
   * with no handler, which simply dismisses.
   */
  cancel?: { text?: string; color?: string; handler?: () => void };
  /**
   * Which action takes focus on open. Defaults to the dismiss action, because
   * pre-focusing a destructive confirm makes a stray Enter destructive.
   */
  focusActionIndex?: number;
}

type Presenter = (options: PresentMessageOptions) => void;

const MessageBoxContext = createContext<Presenter | null>(null);

/**
 * Renders one MessageBox for the whole app and exposes `presentMessage`.
 * Mount once, near the root.
 */
export const MessageBoxProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [options, setOptions] = useState<PresentMessageOptions | null>(null);

  const close = useCallback(() => setOptions(null), []);

  const presentMessage = useCallback<Presenter>((next) => setOptions(next), []);

  const value = useMemo(() => presentMessage, [presentMessage]);

  /* Actions are rebuilt here rather than stored in state: the caller's handlers
     are captured fresh on every render of the presenter, and storing them would
     pin the dialog to the handlers from the moment it was opened. */
  const actions: MessageBoxAction[] | undefined = useMemo(() => {
    if (!options) return undefined;
    const list: MessageBoxAction[] = [];

    if (options.cancel) {
      list.push({
        label: options.cancel.text ?? "Cancel",
        color: options.cancel.color ?? "medium",
        onClick: () => {
          close();
          options.cancel?.handler?.();
        },
      });
    }

    list.push({
      label: options.action.text,
      color: options.action.color ?? "primary",
      onClick: () => {
        close();
        options.action.handler?.();
      },
    });

    return list;
  }, [options, close]);

  return (
    <MessageBoxContext.Provider value={value}>
      {children}
      {options && actions && (
        <MessageBox
          isOpen
          title={options.header}
          message={options.message}
          tone={options.tone}
          actions={actions}
          /* Dismissal must not run either handler: backing out of a confirmation
             is not consent, and firing `action` here would delete the record the
             user was asked about and then declined. */
          onDismiss={close}
          focusActionIndex={options.focusActionIndex ?? 0}
        />
      )}
    </MessageBoxContext.Provider>
  );
};

/**
 * Presents a MessageBox imperatively. Falls back to a no-op when no provider is
 * mounted, so a screen can call it without crashing the app in a test or in a
 * subtree that was never wrapped.
 */
export const useMessageBox = (): Presenter => {
  const present = useContext(MessageBoxContext);
  return present ?? (() => {});
};

export default useMessageBox;