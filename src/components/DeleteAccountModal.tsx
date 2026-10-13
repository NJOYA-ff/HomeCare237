/**
 * DeleteAccountModal
 *
 * Confirms irreversible account deletion from Patient / Doctor Settings.
 * Password accounts must re-enter their password; Google accounts confirm
 * via Google reauth inside the deletion helper.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonInput,
  IonText,
  IonLabel,
} from "@ionic/react";
import { closeOutline, trashOutline, warningOutline } from "ionicons/icons";
import LoadingHelix from "./LoadingHelix";
import {
  deleteCurrentAccount,
  getAccountAuthMethod,
  type DeletableAccountRole,
} from "../utils/accountDeletion";
import { useSettings } from "../context/SettingsContext";
import "./DeleteAccountModal.css";

interface DeleteAccountModalProps {
  isOpen: boolean;
  role: DeletableAccountRole;
  onDidDismiss: () => void;
  /** Called after Auth + Firestore deletion succeeds. */
  onDeleted: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  role,
  onDidDismiss,
  onDeleted,
}) => {
  const { t } = useSettings();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authMethod = getAccountAuthMethod();
  const needsPassword = authMethod === "password";

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    if (needsPassword && !password.trim()) {
      setError(t("deleteAccountPasswordRequired"));
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteCurrentAccount({
        role,
        password: needsPassword ? password : undefined,
      });
      onDeleted();
      onDidDismiss();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError(t("deleteAccountWrongPassword"));
      } else if (code === "auth/too-many-requests") {
        setError(t("deleteAccountTooManyRequests"));
      } else if (code === "auth/requires-recent-login") {
        setError(t("deleteAccountRecentLogin"));
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("deleteAccountFailed"));
      }
      setDeleting(false);
    }
  }, [
    deleting,
    needsPassword,
    password,
    role,
    onDeleted,
    onDidDismiss,
    t,
  ]);

  return (
    <IonModal
      id="delete-account-modal"
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      breakpoints={[0, 0.65, 0.9]}
      initialBreakpoint={0.65}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t("deleteAccount")}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={onDidDismiss}
              disabled={deleting}
              aria-label={t("cancel")}
            >
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="delete-account-warning" role="alert">
          <IonIcon icon={warningOutline} aria-hidden="true" />
          <p>{t("deleteAccountWarning")}</p>
        </div>

        {needsPassword ? (
          <IonItem className="delete-account-password-item" lines="none">
            <IonLabel position="stacked">{t("deleteAccountPasswordLabel")}</IonLabel>
            <IonInput
              type="password"
              value={password}
              autocomplete="current-password"
              onIonInput={(e) => setPassword(e.detail.value ?? "")}
              disabled={deleting}
              placeholder="••••••••"
            />
          </IonItem>
        ) : (
          <p className="delete-account-google-hint">
            {t("deleteAccountGoogleHint")}
          </p>
        )}

        {error && (
          <IonText color="danger">
            <p className="delete-account-error">{error}</p>
          </IonText>
        )}

        <IonButton
          expand="block"
          color="danger"
          className="delete-account-confirm"
          onClick={() => void handleDelete()}
          disabled={deleting || (needsPassword && !password.trim())}
        >
          {deleting ? (
            <LoadingHelix size={22} />
          ) : (
            <>
              <IonIcon icon={trashOutline} slot="start" />
              {t("deleteAccountConfirm")}
            </>
          )}
        </IonButton>

        <IonButton
          expand="block"
          fill="clear"
          onClick={onDidDismiss}
          disabled={deleting}
        >
          {t("cancel")}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default DeleteAccountModal;
