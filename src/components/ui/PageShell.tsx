import React from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
} from "@ionic/react";

type ShellLayout = "page" | "flush";

interface PageShellProps {
  /** Toolbar title. */
  title: string;
  /** Extra node rendered inline after the title (e.g. an unread badge). */
  titleExtra?: React.ReactNode;
  /** Renders a back/close button when provided. */
  defaultHref?: string;
  /** Ionicon for the back button (e.g. `closeOutline`). Defaults to Ionic chevron. */
  backIcon?: string;
  backText?: string;
  /** Buttons for the `start` slot (overrides the back button). */
  startActions?: React.ReactNode;
  /** Buttons for the `end` slot. */
  endActions?: React.ReactNode;
  /** Extra toolbar row (segments, filters, search). */
  toolbarExtra?: React.ReactNode;
  /**
   * `page` (default) wraps children in the shared `.hc-page` container.
   * `flush` renders children untouched for pages that own their own layout.
   */
  layout?: ShellLayout;
  /** Constrains `.hc-page` to the wide (desktop) max-width. */
  wide?: boolean;
  className?: string;
  toolbarClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  contentRef?: React.Ref<HTMLIonContentElement>;
  /** Extra nodes inside IonContent but outside the layout wrapper (e.g. refresher, alerts). */
  contentExtras?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared page shell: header, toolbar, content padding and max-width come from
 * one place so Admin / Doctor / Patient screens render identically.
 */
const PageShell: React.FC<PageShellProps> = ({
  title,
  titleExtra,
  defaultHref,
  backIcon,
  backText,
  startActions,
  endActions,
  toolbarExtra,
  layout = "page",
  wide = false,
  className = "",
  toolbarClassName = "",
  titleClassName = "",
  contentClassName = "",
  contentRef,
  contentExtras,
  children,
}) => (
  <IonPage className={className}>
    <IonHeader class="ion-no-border">
      <IonToolbar className={toolbarClassName}>
        <IonButtons slot="start">
          {startActions ??
            (defaultHref ? (
              <IonBackButton
                defaultHref={defaultHref}
                icon={backIcon}
                text={backText}
              />
            ) : null)}
        </IonButtons>
        <IonTitle className={titleClassName}>
          {title}
          {titleExtra}
        </IonTitle>
        {endActions && <IonButtons slot="end">{endActions}</IonButtons>}
      </IonToolbar>
      {toolbarExtra}
    </IonHeader>

    <IonContent className={contentClassName} ref={contentRef}>
      {layout === "page" ? (
        <div className={`hc-page ${wide ? "hc-page--wide" : ""}`.trim()}>
          {children}
        </div>
      ) : (
        children
      )}
      {contentExtras}
    </IonContent>
  </IonPage>
);

export default PageShell;
